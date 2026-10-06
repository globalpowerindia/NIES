import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "customer_sessions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"customer_id" integer NOT NULL,
  	"expires_at" timestamp(3) with time zone NOT NULL,
  	"revoked_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "customer_sessions_id" integer;
  ALTER TABLE "customer_sessions" ADD CONSTRAINT "customer_sessions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "customer_sessions_customer_idx" ON "customer_sessions" USING btree ("customer_id");
  CREATE INDEX "customer_sessions_expires_at_idx" ON "customer_sessions" USING btree ("expires_at");
  CREATE INDEX "customer_sessions_updated_at_idx" ON "customer_sessions" USING btree ("updated_at");
  CREATE INDEX "customer_sessions_created_at_idx" ON "customer_sessions" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_customer_sessions_fk" FOREIGN KEY ("customer_sessions_id") REFERENCES "public"."customer_sessions"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "carts_one_active_per_customer" ON "carts" USING btree ("customer_id") WHERE "status" = 'ACTIVE' AND "customer_id" IS NOT NULL;
  CREATE INDEX "payload_locked_documents_rels_customer_sessions_id_idx" ON "payload_locked_documents_rels" USING btree ("customer_sessions_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "customer_sessions" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "customer_sessions" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_customer_sessions_fk";
  
  DROP INDEX "carts_one_active_per_customer";
  DROP INDEX "payload_locked_documents_rels_customer_sessions_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "customer_sessions_id";`)
}
