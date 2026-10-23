import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

const MANAGER = JSON.stringify({"orders":["read","create","update"],"coupons":["read","create","update"],"carts":["read"],"customers":["read","create","update"],"addresses":["read","create","update"],"auth-identities":["read"],"wishlist-items":["read"],"checkout-settings":["update"],"products":["read","create","update"],"product-variants":["read","create","update"],"categories":["read","create","update"],"brands":["read","create","update"],"spec-definitions":["read","create","update"],"reviews":["read","create","update","delete"],"inventory":["read","create","update"],"stock-movements":["read","create"],"home-page":["read","update"],"site-settings":["update"],"pages":["read","create","update"],"search-synonyms":["read","create","update"],"newsletter-subscribers":["read","update","delete"],"media":["read","create","update","delete"],"datasheets":["read","create","update","delete"]})
const STAFF = JSON.stringify({"orders":["read"],"coupons":["read"],"carts":["read"],"customers":["read"],"addresses":["read"],"auth-identities":["read"],"wishlist-items":["read"],"products":["read"],"product-variants":["read"],"categories":["read"],"brands":["read"],"spec-definitions":["read"],"reviews":["read","create","update"],"inventory":["read"],"stock-movements":["read","create"],"home-page":["read"],"pages":["read"],"search-synonyms":["read"],"newsletter-subscribers":["read","update"],"media":["read","create","update"],"datasheets":["read","create","update"]})

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "roles" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"description" varchar,
  	"grants" jsonb DEFAULT '{}'::jsonb,
  	"can_edit_prices" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "users" ADD COLUMN "is_super_admin" boolean DEFAULT false;
  ALTER TABLE "users" ADD COLUMN "role_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "roles_id" integer;
  CREATE UNIQUE INDEX "roles_name_idx" ON "roles" USING btree ("name");
  CREATE INDEX "roles_updated_at_idx" ON "roles" USING btree ("updated_at");
  CREATE INDEX "roles_created_at_idx" ON "roles" USING btree ("created_at");
  ALTER TABLE "users" ADD CONSTRAINT "users_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_roles_fk" FOREIGN KEY ("roles_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_role_idx" ON "users" USING btree ("role_id");
  CREATE INDEX "payload_locked_documents_rels_roles_id_idx" ON "payload_locked_documents_rels" USING btree ("roles_id");`)

  // The fixed Manager and Staff roles become editable roles with exactly the
  // access they had, and every user keeps what they could do. Written out here
  // rather than read from PRESET_ROLES, so later edits there can't change what
  // this migration did.
  await db.execute(sql`
  INSERT INTO "roles" ("name", "description", "grants", "can_edit_prices") VALUES
    ('Manager', 'Runs the shop: orders, catalogue, prices, coupons and content.', ${MANAGER}::jsonb, true),
    ('Staff', 'Day-to-day help: sees orders and the catalogue, moderates reviews, records stock and uploads files.', ${STAFF}::jsonb, false)
  ON CONFLICT ("name") DO NOTHING;`)
  // A separate statement: it has to see the roles just inserted, and a query
  // with parameters can hold only one statement.
  await db.execute(sql`
  UPDATE "users" SET
    "is_super_admin" = ("role" = 'SUPER_ADMIN'),
    "role_id" = CASE "role"
      WHEN 'MANAGER' THEN (SELECT "id" FROM "roles" WHERE "name" = 'Manager')
      WHEN 'STAFF' THEN (SELECT "id" FROM "roles" WHERE "name" = 'Staff')
    END;`)

  await db.execute(sql`
  ALTER TABLE "users" DROP COLUMN "role";
  DROP TYPE "public"."enum_users_role";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  // Back to the three fixed roles: super admins stay so, Manager's holders are
  // managers, and everyone else (any custom role) falls back to staff.
  await db.execute(sql`
   CREATE TYPE "public"."enum_users_role" AS ENUM('SUPER_ADMIN', 'MANAGER', 'STAFF');
  ALTER TABLE "users" ADD COLUMN "role" "enum_users_role" DEFAULT 'STAFF' NOT NULL;
  UPDATE "users" SET "role" = CASE
    WHEN "is_super_admin" THEN 'SUPER_ADMIN'
    WHEN "role_id" = (SELECT "id" FROM "roles" WHERE "name" = 'Manager') THEN 'MANAGER'
    ELSE 'STAFF'
  END::"enum_users_role";`)

  // Foreign keys and indexes first: dropping the table with CASCADE removes
  // them too, and dropping them afterwards would fail.
  await db.execute(sql`
  ALTER TABLE "users" DROP CONSTRAINT "users_role_id_roles_id_fk";
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_roles_fk";
  DROP INDEX "users_role_idx";
  DROP INDEX "payload_locked_documents_rels_roles_id_idx";
  ALTER TABLE "roles" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "roles" CASCADE;
  ALTER TABLE "users" DROP COLUMN "is_super_admin";
  ALTER TABLE "users" DROP COLUMN "role_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "roles_id";`)
}
