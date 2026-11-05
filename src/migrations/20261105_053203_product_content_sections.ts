import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_site_settings_product_page_promises_icon" AS ENUM('quality', 'payment', 'verified', 'trust', 'help', 'shipping', 'tools');
  CREATE TABLE "products_blocks_section_table_rows" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"value" varchar
  );
  
  CREATE TABLE "products_blocks_section_table" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "products_blocks_section_items_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"quantity" varchar,
  	"image_id" integer
  );
  
  CREATE TABLE "products_blocks_section_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "products_blocks_section_features_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "products_blocks_section_features" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "products_blocks_section_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"body" jsonb,
  	"block_name" varchar
  );
  
  CREATE TABLE "products_blocks_section_cards_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"text" varchar,
  	"image_id" integer
  );
  
  CREATE TABLE "products_blocks_section_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"intro" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "products_faqs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" varchar
  );
  
  CREATE TABLE "_products_v_blocks_section_table_rows" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"value" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_products_v_blocks_section_table" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_products_v_blocks_section_items_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"quantity" varchar,
  	"image_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_products_v_blocks_section_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_products_v_blocks_section_features_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_products_v_blocks_section_features" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_products_v_blocks_section_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"body" jsonb,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_products_v_blocks_section_cards_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"text" varchar,
  	"image_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_products_v_blocks_section_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"intro" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_products_v_version_faqs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "site_settings_product_page_extra_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar NOT NULL,
  	"label" varchar NOT NULL
  );
  
  CREATE TABLE "site_settings_product_page_promises" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"icon" "enum_site_settings_product_page_promises_icon" DEFAULT 'quality' NOT NULL,
  	"title" varchar NOT NULL,
  	"detail" varchar NOT NULL,
  	"link_label" varchar,
  	"link_href" varchar
  );
  
  ALTER TABLE "site_settings" ADD COLUMN "product_page_trust_badge" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "product_page_bulk_enabled" boolean DEFAULT true;
  ALTER TABLE "site_settings" ADD COLUMN "product_page_bulk_title" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "product_page_bulk_text" varchar;
  ALTER TABLE "products_blocks_section_table_rows" ADD CONSTRAINT "products_blocks_section_table_rows_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_section_table"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_section_table" ADD CONSTRAINT "products_blocks_section_table_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_section_items_items" ADD CONSTRAINT "products_blocks_section_items_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_blocks_section_items_items" ADD CONSTRAINT "products_blocks_section_items_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_section_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_section_items" ADD CONSTRAINT "products_blocks_section_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_section_features_items" ADD CONSTRAINT "products_blocks_section_features_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_section_features"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_section_features" ADD CONSTRAINT "products_blocks_section_features_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_section_text" ADD CONSTRAINT "products_blocks_section_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_section_cards_cards" ADD CONSTRAINT "products_blocks_section_cards_cards_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_blocks_section_cards_cards" ADD CONSTRAINT "products_blocks_section_cards_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_section_cards"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_section_cards" ADD CONSTRAINT "products_blocks_section_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_faqs" ADD CONSTRAINT "products_faqs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_section_table_rows" ADD CONSTRAINT "_products_v_blocks_section_table_rows_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v_blocks_section_table"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_section_table" ADD CONSTRAINT "_products_v_blocks_section_table_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_section_items_items" ADD CONSTRAINT "_products_v_blocks_section_items_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_section_items_items" ADD CONSTRAINT "_products_v_blocks_section_items_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v_blocks_section_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_section_items" ADD CONSTRAINT "_products_v_blocks_section_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_section_features_items" ADD CONSTRAINT "_products_v_blocks_section_features_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v_blocks_section_features"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_section_features" ADD CONSTRAINT "_products_v_blocks_section_features_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_section_text" ADD CONSTRAINT "_products_v_blocks_section_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_section_cards_cards" ADD CONSTRAINT "_products_v_blocks_section_cards_cards_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_section_cards_cards" ADD CONSTRAINT "_products_v_blocks_section_cards_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v_blocks_section_cards"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_section_cards" ADD CONSTRAINT "_products_v_blocks_section_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_faqs" ADD CONSTRAINT "_products_v_version_faqs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_product_page_extra_stats" ADD CONSTRAINT "site_settings_product_page_extra_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_product_page_promises" ADD CONSTRAINT "site_settings_product_page_promises_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "products_blocks_section_table_rows_order_idx" ON "products_blocks_section_table_rows" USING btree ("_order");
  CREATE INDEX "products_blocks_section_table_rows_parent_id_idx" ON "products_blocks_section_table_rows" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_section_table_order_idx" ON "products_blocks_section_table" USING btree ("_order");
  CREATE INDEX "products_blocks_section_table_parent_id_idx" ON "products_blocks_section_table" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_section_table_path_idx" ON "products_blocks_section_table" USING btree ("_path");
  CREATE INDEX "products_blocks_section_items_items_order_idx" ON "products_blocks_section_items_items" USING btree ("_order");
  CREATE INDEX "products_blocks_section_items_items_parent_id_idx" ON "products_blocks_section_items_items" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_section_items_items_image_idx" ON "products_blocks_section_items_items" USING btree ("image_id");
  CREATE INDEX "products_blocks_section_items_order_idx" ON "products_blocks_section_items" USING btree ("_order");
  CREATE INDEX "products_blocks_section_items_parent_id_idx" ON "products_blocks_section_items" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_section_items_path_idx" ON "products_blocks_section_items" USING btree ("_path");
  CREATE INDEX "products_blocks_section_features_items_order_idx" ON "products_blocks_section_features_items" USING btree ("_order");
  CREATE INDEX "products_blocks_section_features_items_parent_id_idx" ON "products_blocks_section_features_items" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_section_features_order_idx" ON "products_blocks_section_features" USING btree ("_order");
  CREATE INDEX "products_blocks_section_features_parent_id_idx" ON "products_blocks_section_features" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_section_features_path_idx" ON "products_blocks_section_features" USING btree ("_path");
  CREATE INDEX "products_blocks_section_text_order_idx" ON "products_blocks_section_text" USING btree ("_order");
  CREATE INDEX "products_blocks_section_text_parent_id_idx" ON "products_blocks_section_text" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_section_text_path_idx" ON "products_blocks_section_text" USING btree ("_path");
  CREATE INDEX "products_blocks_section_cards_cards_order_idx" ON "products_blocks_section_cards_cards" USING btree ("_order");
  CREATE INDEX "products_blocks_section_cards_cards_parent_id_idx" ON "products_blocks_section_cards_cards" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_section_cards_cards_image_idx" ON "products_blocks_section_cards_cards" USING btree ("image_id");
  CREATE INDEX "products_blocks_section_cards_order_idx" ON "products_blocks_section_cards" USING btree ("_order");
  CREATE INDEX "products_blocks_section_cards_parent_id_idx" ON "products_blocks_section_cards" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_section_cards_path_idx" ON "products_blocks_section_cards" USING btree ("_path");
  CREATE INDEX "products_faqs_order_idx" ON "products_faqs" USING btree ("_order");
  CREATE INDEX "products_faqs_parent_id_idx" ON "products_faqs" USING btree ("_parent_id");
  CREATE INDEX "_products_v_blocks_section_table_rows_order_idx" ON "_products_v_blocks_section_table_rows" USING btree ("_order");
  CREATE INDEX "_products_v_blocks_section_table_rows_parent_id_idx" ON "_products_v_blocks_section_table_rows" USING btree ("_parent_id");
  CREATE INDEX "_products_v_blocks_section_table_order_idx" ON "_products_v_blocks_section_table" USING btree ("_order");
  CREATE INDEX "_products_v_blocks_section_table_parent_id_idx" ON "_products_v_blocks_section_table" USING btree ("_parent_id");
  CREATE INDEX "_products_v_blocks_section_table_path_idx" ON "_products_v_blocks_section_table" USING btree ("_path");
  CREATE INDEX "_products_v_blocks_section_items_items_order_idx" ON "_products_v_blocks_section_items_items" USING btree ("_order");
  CREATE INDEX "_products_v_blocks_section_items_items_parent_id_idx" ON "_products_v_blocks_section_items_items" USING btree ("_parent_id");
  CREATE INDEX "_products_v_blocks_section_items_items_image_idx" ON "_products_v_blocks_section_items_items" USING btree ("image_id");
  CREATE INDEX "_products_v_blocks_section_items_order_idx" ON "_products_v_blocks_section_items" USING btree ("_order");
  CREATE INDEX "_products_v_blocks_section_items_parent_id_idx" ON "_products_v_blocks_section_items" USING btree ("_parent_id");
  CREATE INDEX "_products_v_blocks_section_items_path_idx" ON "_products_v_blocks_section_items" USING btree ("_path");
  CREATE INDEX "_products_v_blocks_section_features_items_order_idx" ON "_products_v_blocks_section_features_items" USING btree ("_order");
  CREATE INDEX "_products_v_blocks_section_features_items_parent_id_idx" ON "_products_v_blocks_section_features_items" USING btree ("_parent_id");
  CREATE INDEX "_products_v_blocks_section_features_order_idx" ON "_products_v_blocks_section_features" USING btree ("_order");
  CREATE INDEX "_products_v_blocks_section_features_parent_id_idx" ON "_products_v_blocks_section_features" USING btree ("_parent_id");
  CREATE INDEX "_products_v_blocks_section_features_path_idx" ON "_products_v_blocks_section_features" USING btree ("_path");
  CREATE INDEX "_products_v_blocks_section_text_order_idx" ON "_products_v_blocks_section_text" USING btree ("_order");
  CREATE INDEX "_products_v_blocks_section_text_parent_id_idx" ON "_products_v_blocks_section_text" USING btree ("_parent_id");
  CREATE INDEX "_products_v_blocks_section_text_path_idx" ON "_products_v_blocks_section_text" USING btree ("_path");
  CREATE INDEX "_products_v_blocks_section_cards_cards_order_idx" ON "_products_v_blocks_section_cards_cards" USING btree ("_order");
  CREATE INDEX "_products_v_blocks_section_cards_cards_parent_id_idx" ON "_products_v_blocks_section_cards_cards" USING btree ("_parent_id");
  CREATE INDEX "_products_v_blocks_section_cards_cards_image_idx" ON "_products_v_blocks_section_cards_cards" USING btree ("image_id");
  CREATE INDEX "_products_v_blocks_section_cards_order_idx" ON "_products_v_blocks_section_cards" USING btree ("_order");
  CREATE INDEX "_products_v_blocks_section_cards_parent_id_idx" ON "_products_v_blocks_section_cards" USING btree ("_parent_id");
  CREATE INDEX "_products_v_blocks_section_cards_path_idx" ON "_products_v_blocks_section_cards" USING btree ("_path");
  CREATE INDEX "_products_v_version_faqs_order_idx" ON "_products_v_version_faqs" USING btree ("_order");
  CREATE INDEX "_products_v_version_faqs_parent_id_idx" ON "_products_v_version_faqs" USING btree ("_parent_id");
  CREATE INDEX "site_settings_product_page_extra_stats_order_idx" ON "site_settings_product_page_extra_stats" USING btree ("_order");
  CREATE INDEX "site_settings_product_page_extra_stats_parent_id_idx" ON "site_settings_product_page_extra_stats" USING btree ("_parent_id");
  CREATE INDEX "site_settings_product_page_promises_order_idx" ON "site_settings_product_page_promises" USING btree ("_order");
  CREATE INDEX "site_settings_product_page_promises_parent_id_idx" ON "site_settings_product_page_promises" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "products_blocks_section_table_rows" CASCADE;
  DROP TABLE "products_blocks_section_table" CASCADE;
  DROP TABLE "products_blocks_section_items_items" CASCADE;
  DROP TABLE "products_blocks_section_items" CASCADE;
  DROP TABLE "products_blocks_section_features_items" CASCADE;
  DROP TABLE "products_blocks_section_features" CASCADE;
  DROP TABLE "products_blocks_section_text" CASCADE;
  DROP TABLE "products_blocks_section_cards_cards" CASCADE;
  DROP TABLE "products_blocks_section_cards" CASCADE;
  DROP TABLE "products_faqs" CASCADE;
  DROP TABLE "_products_v_blocks_section_table_rows" CASCADE;
  DROP TABLE "_products_v_blocks_section_table" CASCADE;
  DROP TABLE "_products_v_blocks_section_items_items" CASCADE;
  DROP TABLE "_products_v_blocks_section_items" CASCADE;
  DROP TABLE "_products_v_blocks_section_features_items" CASCADE;
  DROP TABLE "_products_v_blocks_section_features" CASCADE;
  DROP TABLE "_products_v_blocks_section_text" CASCADE;
  DROP TABLE "_products_v_blocks_section_cards_cards" CASCADE;
  DROP TABLE "_products_v_blocks_section_cards" CASCADE;
  DROP TABLE "_products_v_version_faqs" CASCADE;
  DROP TABLE "site_settings_product_page_extra_stats" CASCADE;
  DROP TABLE "site_settings_product_page_promises" CASCADE;
  ALTER TABLE "site_settings" DROP COLUMN "product_page_trust_badge";
  ALTER TABLE "site_settings" DROP COLUMN "product_page_bulk_enabled";
  ALTER TABLE "site_settings" DROP COLUMN "product_page_bulk_title";
  ALTER TABLE "site_settings" DROP COLUMN "product_page_bulk_text";
  DROP TYPE "public"."enum_site_settings_product_page_promises_icon";`)
}
