import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_coupons_applies_to" AS ENUM('CART', 'ITEMS');
  ALTER TYPE "public"."enum_coupons_type" ADD VALUE 'FREE_SHIPPING';
  CREATE TABLE "coupons_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"products_id" integer,
  	"categories_id" integer,
  	"brands_id" integer
  );
  
  ALTER TABLE "orders" ADD COLUMN "delivery_discount_paise" numeric DEFAULT 0;
  ALTER TABLE "coupons" ADD COLUMN "applies_to" "enum_coupons_applies_to" DEFAULT 'CART';
  ALTER TABLE "coupons" ADD COLUMN "first_order_only" boolean DEFAULT false;
  ALTER TABLE "coupons_rels" ADD CONSTRAINT "coupons_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."coupons"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "coupons_rels" ADD CONSTRAINT "coupons_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "coupons_rels" ADD CONSTRAINT "coupons_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "coupons_rels" ADD CONSTRAINT "coupons_rels_brands_fk" FOREIGN KEY ("brands_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "coupons_rels_order_idx" ON "coupons_rels" USING btree ("order");
  CREATE INDEX "coupons_rels_parent_idx" ON "coupons_rels" USING btree ("parent_id");
  CREATE INDEX "coupons_rels_path_idx" ON "coupons_rels" USING btree ("path");
  CREATE INDEX "coupons_rels_products_id_idx" ON "coupons_rels" USING btree ("products_id");
  CREATE INDEX "coupons_rels_categories_id_idx" ON "coupons_rels" USING btree ("categories_id");
  CREATE INDEX "coupons_rels_brands_id_idx" ON "coupons_rels" USING btree ("brands_id");
  ALTER TABLE "orders" ADD CONSTRAINT "delivery_discount_paise_whole_non_negative" CHECK ("delivery_discount_paise" >= 0 AND "delivery_discount_paise" = floor("delivery_discount_paise"));`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "coupons_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "coupons_rels" CASCADE;
  ALTER TABLE "orders" DROP CONSTRAINT "delivery_discount_paise_whole_non_negative";
  ALTER TABLE "coupons" ALTER COLUMN "type" SET DATA TYPE text;
  ALTER TABLE "coupons" ALTER COLUMN "type" SET DEFAULT 'PERCENT'::text;
  DROP TYPE "public"."enum_coupons_type";
  CREATE TYPE "public"."enum_coupons_type" AS ENUM('PERCENT', 'FLAT');
  ALTER TABLE "coupons" ALTER COLUMN "type" SET DEFAULT 'PERCENT'::"public"."enum_coupons_type";
  ALTER TABLE "coupons" ALTER COLUMN "type" SET DATA TYPE "public"."enum_coupons_type" USING "type"::"public"."enum_coupons_type";
  ALTER TABLE "orders" DROP COLUMN "delivery_discount_paise";
  ALTER TABLE "coupons" DROP COLUMN "applies_to";
  ALTER TABLE "coupons" DROP COLUMN "first_order_only";
  DROP TYPE "public"."enum_coupons_applies_to";`)
}
