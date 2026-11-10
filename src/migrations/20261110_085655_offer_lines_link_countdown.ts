import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_site_settings_offers_link_lnk" AS ENUM('category', 'product', 'custom', 'none');
  ALTER TABLE "site_settings_offers" ADD COLUMN "tag" varchar;
  ALTER TABLE "site_settings_offers" ADD COLUMN "link_type" "enum_site_settings_offers_link_lnk" DEFAULT 'none';
  ALTER TABLE "site_settings_offers" ADD COLUMN "link_category_id" integer;
  ALTER TABLE "site_settings_offers" ADD COLUMN "link_product_id" integer;
  ALTER TABLE "site_settings_offers" ADD COLUMN "link_url" varchar;
  ALTER TABLE "site_settings_offers" ADD COLUMN "link_label" varchar DEFAULT 'Shop now';
  ALTER TABLE "site_settings_offers" ADD COLUMN "ends_at" timestamp(3) with time zone;
  ALTER TABLE "site_settings_offers" ADD CONSTRAINT "site_settings_offers_link_category_id_categories_id_fk" FOREIGN KEY ("link_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings_offers" ADD CONSTRAINT "site_settings_offers_link_product_id_products_id_fk" FOREIGN KEY ("link_product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "site_settings_offers_link_link_category_idx" ON "site_settings_offers" USING btree ("link_category_id");
  CREATE INDEX "site_settings_offers_link_link_product_idx" ON "site_settings_offers" USING btree ("link_product_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "site_settings_offers" DROP CONSTRAINT "site_settings_offers_link_category_id_categories_id_fk";
  
  ALTER TABLE "site_settings_offers" DROP CONSTRAINT "site_settings_offers_link_product_id_products_id_fk";
  
  DROP INDEX "site_settings_offers_link_link_category_idx";
  DROP INDEX "site_settings_offers_link_link_product_idx";
  ALTER TABLE "site_settings_offers" DROP COLUMN "tag";
  ALTER TABLE "site_settings_offers" DROP COLUMN "link_type";
  ALTER TABLE "site_settings_offers" DROP COLUMN "link_category_id";
  ALTER TABLE "site_settings_offers" DROP COLUMN "link_product_id";
  ALTER TABLE "site_settings_offers" DROP COLUMN "link_url";
  ALTER TABLE "site_settings_offers" DROP COLUMN "link_label";
  ALTER TABLE "site_settings_offers" DROP COLUMN "ends_at";
  DROP TYPE "public"."enum_site_settings_offers_link_lnk";`)
}
