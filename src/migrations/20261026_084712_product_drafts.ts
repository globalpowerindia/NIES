import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_products_visibility" AS ENUM('DRAFT', 'ACTIVE', 'ARCHIVED');
  CREATE TYPE "public"."enum__products_v_version_badges" AS ENUM('NEW', 'BEST_SELLER');
  CREATE TYPE "public"."enum__products_v_version_videos_source" AS ENUM('youtube', 'upload');
  CREATE TYPE "public"."enum__products_v_version_status" AS ENUM('draft', 'published');
  CREATE TABLE "_products_v_version_badges" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum__products_v_version_badges",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "_products_v_version_videos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"source" "enum__products_v_version_videos_source" DEFAULT 'youtube',
  	"title" varchar,
  	"url" varchar,
  	"file_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_products_v_version_free_accessories" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"quantity" varchar,
  	"image_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_products_v_version_applications_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"image_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_products_v_version_spec_values" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"definition_id" integer,
  	"value_text" varchar,
  	"value_num" numeric,
  	"value_bool" boolean,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_products_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_search_a" varchar,
  	"version_search_b" varchar,
  	"version_search_c" varchar,
  	"version_name" varchar,
  	"version_slug" varchar,
  	"version_status" "enum_products_visibility" DEFAULT 'DRAFT',
  	"version_sell_online" boolean DEFAULT false,
  	"version_sort_order" numeric DEFAULT 0,
  	"version_rating_avg" numeric DEFAULT 0,
  	"version_rating_count" numeric DEFAULT 0,
  	"version_subtitle" varchar,
  	"version_model_number" varchar,
  	"version_model3d_id" integer,
  	"version_spin_auto_rotate" boolean DEFAULT true,
  	"version_spin_reverse" boolean DEFAULT false,
  	"version_short_desc" varchar,
  	"version_description" jsonb,
  	"version_key_features" jsonb,
  	"version_warranty_info" jsonb,
  	"version_ideal_for" jsonb,
  	"version_safety_info" jsonb,
  	"version_maintenance_tips" jsonb,
  	"version_user_manual_id" integer,
  	"version_category_id" integer,
  	"version_brand_id" integer,
  	"version_country_of_origin" varchar DEFAULT 'India',
  	"version_brochure_banner_id" integer,
  	"version_datasheet_id" integer,
  	"version_applications_title" varchar,
  	"version_hsn_code" varchar DEFAULT '8467',
  	"version_gst_rate_bps" numeric DEFAULT 1800,
  	"version_warranty_months" numeric DEFAULT 6,
  	"version_meta_title" varchar,
  	"version_meta_description" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__products_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "_products_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer,
  	"products_id" integer
  );
  
  ALTER TABLE "products_videos" ALTER COLUMN "source" DROP NOT NULL;
  ALTER TABLE "products_free_accessories" ALTER COLUMN "name" DROP NOT NULL;
  ALTER TABLE "products_applications_items" ALTER COLUMN "label" DROP NOT NULL;
  ALTER TABLE "products_applications_items" ALTER COLUMN "image_id" DROP NOT NULL;
  ALTER TABLE "products_spec_values" ALTER COLUMN "definition_id" DROP NOT NULL;
  ALTER TABLE "products" ALTER COLUMN "name" DROP NOT NULL;
  ALTER TABLE "products" ALTER COLUMN "slug" DROP NOT NULL;
  ALTER TABLE "products" ALTER COLUMN "status" DROP DEFAULT;
  ALTER TABLE "products" ALTER COLUMN "status" SET DATA TYPE "public"."enum_products_visibility" USING "status"::text::"public"."enum_products_visibility";
  ALTER TABLE "products" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
  ALTER TABLE "products" ALTER COLUMN "status" DROP NOT NULL;
  ALTER TABLE "products" ALTER COLUMN "category_id" DROP NOT NULL;
  ALTER TABLE "products" ALTER COLUMN "hsn_code" DROP NOT NULL;
  ALTER TABLE "products" ALTER COLUMN "gst_rate_bps" DROP NOT NULL;
  -- Hand-ordered: the generator reused this enum name for "_status" and altered
  -- the column before adding it. "status" has moved to enum_products_visibility
  -- above, so the old type is free to be replaced.
  DROP TYPE "public"."enum_products_status";
  CREATE TYPE "public"."enum_products_status" AS ENUM('draft', 'published');
  ALTER TABLE "products" ADD COLUMN "_status" "enum_products_status" DEFAULT 'draft';
  -- Every product so far is live: mark it published, so nothing leaves the site.
  UPDATE "products" SET "_status" = 'published';
  ALTER TABLE "_products_v_version_badges" ADD CONSTRAINT "_products_v_version_badges_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_videos" ADD CONSTRAINT "_products_v_version_videos_file_id_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v_version_videos" ADD CONSTRAINT "_products_v_version_videos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_free_accessories" ADD CONSTRAINT "_products_v_version_free_accessories_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v_version_free_accessories" ADD CONSTRAINT "_products_v_version_free_accessories_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_applications_items" ADD CONSTRAINT "_products_v_version_applications_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v_version_applications_items" ADD CONSTRAINT "_products_v_version_applications_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_spec_values" ADD CONSTRAINT "_products_v_version_spec_values_definition_id_spec_definitions_id_fk" FOREIGN KEY ("definition_id") REFERENCES "public"."spec_definitions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v_version_spec_values" ADD CONSTRAINT "_products_v_version_spec_values_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v" ADD CONSTRAINT "_products_v_parent_id_products_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v" ADD CONSTRAINT "_products_v_version_model3d_id_media_id_fk" FOREIGN KEY ("version_model3d_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v" ADD CONSTRAINT "_products_v_version_user_manual_id_datasheets_id_fk" FOREIGN KEY ("version_user_manual_id") REFERENCES "public"."datasheets"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v" ADD CONSTRAINT "_products_v_version_category_id_categories_id_fk" FOREIGN KEY ("version_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v" ADD CONSTRAINT "_products_v_version_brand_id_brands_id_fk" FOREIGN KEY ("version_brand_id") REFERENCES "public"."brands"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v" ADD CONSTRAINT "_products_v_version_brochure_banner_id_media_id_fk" FOREIGN KEY ("version_brochure_banner_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v" ADD CONSTRAINT "_products_v_version_datasheet_id_datasheets_id_fk" FOREIGN KEY ("version_datasheet_id") REFERENCES "public"."datasheets"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v_rels" ADD CONSTRAINT "_products_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_rels" ADD CONSTRAINT "_products_v_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_rels" ADD CONSTRAINT "_products_v_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "_products_v_version_badges_order_idx" ON "_products_v_version_badges" USING btree ("order");
  CREATE INDEX "_products_v_version_badges_parent_idx" ON "_products_v_version_badges" USING btree ("parent_id");
  CREATE INDEX "_products_v_version_videos_order_idx" ON "_products_v_version_videos" USING btree ("_order");
  CREATE INDEX "_products_v_version_videos_parent_id_idx" ON "_products_v_version_videos" USING btree ("_parent_id");
  CREATE INDEX "_products_v_version_videos_file_idx" ON "_products_v_version_videos" USING btree ("file_id");
  CREATE INDEX "_products_v_version_free_accessories_order_idx" ON "_products_v_version_free_accessories" USING btree ("_order");
  CREATE INDEX "_products_v_version_free_accessories_parent_id_idx" ON "_products_v_version_free_accessories" USING btree ("_parent_id");
  CREATE INDEX "_products_v_version_free_accessories_image_idx" ON "_products_v_version_free_accessories" USING btree ("image_id");
  CREATE INDEX "_products_v_version_applications_items_order_idx" ON "_products_v_version_applications_items" USING btree ("_order");
  CREATE INDEX "_products_v_version_applications_items_parent_id_idx" ON "_products_v_version_applications_items" USING btree ("_parent_id");
  CREATE INDEX "_products_v_version_applications_items_image_idx" ON "_products_v_version_applications_items" USING btree ("image_id");
  CREATE INDEX "_products_v_version_spec_values_order_idx" ON "_products_v_version_spec_values" USING btree ("_order");
  CREATE INDEX "_products_v_version_spec_values_parent_id_idx" ON "_products_v_version_spec_values" USING btree ("_parent_id");
  CREATE INDEX "_products_v_version_spec_values_definition_idx" ON "_products_v_version_spec_values" USING btree ("definition_id");
  CREATE INDEX "_products_v_parent_idx" ON "_products_v" USING btree ("parent_id");
  CREATE INDEX "_products_v_version_version_name_idx" ON "_products_v" USING btree ("version_name");
  CREATE INDEX "_products_v_version_version_slug_idx" ON "_products_v" USING btree ("version_slug");
  CREATE INDEX "_products_v_version_version_status_idx" ON "_products_v" USING btree ("version_status");
  CREATE INDEX "_products_v_version_version_sell_online_idx" ON "_products_v" USING btree ("version_sell_online");
  CREATE INDEX "_products_v_version_version_model3d_idx" ON "_products_v" USING btree ("version_model3d_id");
  CREATE INDEX "_products_v_version_version_user_manual_idx" ON "_products_v" USING btree ("version_user_manual_id");
  CREATE INDEX "_products_v_version_version_category_idx" ON "_products_v" USING btree ("version_category_id");
  CREATE INDEX "_products_v_version_version_brand_idx" ON "_products_v" USING btree ("version_brand_id");
  CREATE INDEX "_products_v_version_version_brochure_banner_idx" ON "_products_v" USING btree ("version_brochure_banner_id");
  CREATE INDEX "_products_v_version_version_datasheet_idx" ON "_products_v" USING btree ("version_datasheet_id");
  CREATE INDEX "_products_v_version_version_updated_at_idx" ON "_products_v" USING btree ("version_updated_at");
  CREATE INDEX "_products_v_version_version_created_at_idx" ON "_products_v" USING btree ("version_created_at");
  CREATE INDEX "_products_v_version_version__status_idx" ON "_products_v" USING btree ("version__status");
  CREATE INDEX "_products_v_created_at_idx" ON "_products_v" USING btree ("created_at");
  CREATE INDEX "_products_v_updated_at_idx" ON "_products_v" USING btree ("updated_at");
  CREATE INDEX "_products_v_latest_idx" ON "_products_v" USING btree ("latest");
  CREATE INDEX "_products_v_rels_order_idx" ON "_products_v_rels" USING btree ("order");
  CREATE INDEX "_products_v_rels_parent_idx" ON "_products_v_rels" USING btree ("parent_id");
  CREATE INDEX "_products_v_rels_path_idx" ON "_products_v_rels" USING btree ("path");
  CREATE INDEX "_products_v_rels_media_id_idx" ON "_products_v_rels" USING btree ("media_id");
  CREATE INDEX "_products_v_rels_products_id_idx" ON "_products_v_rels" USING btree ("products_id");
  CREATE INDEX "products__status_idx" ON "products" USING btree ("_status");`)

  // Draft-aware reads (the admin's product pickers among them) look in the
  // versions table, where existing products have no row yet: they'd appear to
  // have no products at all. Saving each once, as published, writes its first
  // version without changing it. Slow on a remote database (about a second a
  // product), and safe to re-run.
  const { docs } = await payload.find({ collection: 'products', pagination: false, depth: 0, select: {}, req })
  for (const [index, { id }] of docs.entries()) {
    await payload.update({ collection: 'products', id, data: { _status: 'published' }, depth: 0, req, context: { skipRevalidate: true } })
    if ((index + 1) % 50 === 0) payload.logger.info(`Product drafts: first versions for ${index + 1} of ${docs.length} products`)
  }
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "_products_v_version_badges" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_products_v_version_videos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_products_v_version_free_accessories" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_products_v_version_applications_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_products_v_version_spec_values" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_products_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_products_v_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "_products_v_version_badges" CASCADE;
  DROP TABLE "_products_v_version_videos" CASCADE;
  DROP TABLE "_products_v_version_free_accessories" CASCADE;
  DROP TABLE "_products_v_version_applications_items" CASCADE;
  DROP TABLE "_products_v_version_spec_values" CASCADE;
  DROP TABLE "_products_v" CASCADE;
  DROP TABLE "_products_v_rels" CASCADE;
  DROP INDEX "products__status_idx";
  -- Hand-ordered, the reverse of up: drop "_status" and its enum first, so the
  -- name is free for "status" again.
  ALTER TABLE "products" DROP COLUMN "_status";
  DROP TYPE "public"."enum_products_status";
  CREATE TYPE "public"."enum_products_status" AS ENUM('DRAFT', 'ACTIVE', 'ARCHIVED');
  ALTER TABLE "products_videos" ALTER COLUMN "source" SET NOT NULL;
  ALTER TABLE "products_free_accessories" ALTER COLUMN "name" SET NOT NULL;
  ALTER TABLE "products_applications_items" ALTER COLUMN "label" SET NOT NULL;
  ALTER TABLE "products_applications_items" ALTER COLUMN "image_id" SET NOT NULL;
  ALTER TABLE "products_spec_values" ALTER COLUMN "definition_id" SET NOT NULL;
  ALTER TABLE "products" ALTER COLUMN "name" SET NOT NULL;
  ALTER TABLE "products" ALTER COLUMN "slug" SET NOT NULL;
  ALTER TABLE "products" ALTER COLUMN "status" DROP DEFAULT;
  ALTER TABLE "products" ALTER COLUMN "status" SET DATA TYPE "public"."enum_products_status" USING "status"::text::"public"."enum_products_status";
  ALTER TABLE "products" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
  ALTER TABLE "products" ALTER COLUMN "status" SET NOT NULL;
  ALTER TABLE "products" ALTER COLUMN "category_id" SET NOT NULL;
  ALTER TABLE "products" ALTER COLUMN "hsn_code" SET NOT NULL;
  ALTER TABLE "products" ALTER COLUMN "gst_rate_bps" SET NOT NULL;
  DROP TYPE "public"."enum_products_visibility";
  DROP TYPE "public"."enum__products_v_version_badges";
  DROP TYPE "public"."enum__products_v_version_videos_source";
  DROP TYPE "public"."enum__products_v_version_status";`)
}
