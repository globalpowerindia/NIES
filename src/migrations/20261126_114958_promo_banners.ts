import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_promo_banners_show_on" AS ENUM('category', 'brand', 'search', 'product');
  CREATE TYPE "public"."enum_promo_banners_position" AS ENUM('top', 'inline');
  CREATE TABLE "promo_banners_banners" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer NOT NULL,
  	"mobile_image_id" integer,
  	"link" varchar
  );
  
  CREATE TABLE "promo_banners_show_on" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_promo_banners_show_on",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "promo_banners" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"is_active" boolean DEFAULT true,
  	"starts_at" timestamp(3) with time zone,
  	"ends_at" timestamp(3) with time zone,
  	"sort_order" numeric DEFAULT 0,
  	"search_words" varchar,
  	"position" "enum_promo_banners_position" DEFAULT 'top',
  	"after_products" numeric DEFAULT 12,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "promo_banners_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"categories_id" integer,
  	"brands_id" integer,
  	"products_id" integer
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "promo_banners_id" integer;
  ALTER TABLE "promo_banners_banners" ADD CONSTRAINT "promo_banners_banners_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "promo_banners_banners" ADD CONSTRAINT "promo_banners_banners_mobile_image_id_media_id_fk" FOREIGN KEY ("mobile_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "promo_banners_banners" ADD CONSTRAINT "promo_banners_banners_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."promo_banners"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "promo_banners_show_on" ADD CONSTRAINT "promo_banners_show_on_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."promo_banners"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "promo_banners_rels" ADD CONSTRAINT "promo_banners_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."promo_banners"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "promo_banners_rels" ADD CONSTRAINT "promo_banners_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "promo_banners_rels" ADD CONSTRAINT "promo_banners_rels_brands_fk" FOREIGN KEY ("brands_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "promo_banners_rels" ADD CONSTRAINT "promo_banners_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "promo_banners_banners_order_idx" ON "promo_banners_banners" USING btree ("_order");
  CREATE INDEX "promo_banners_banners_parent_id_idx" ON "promo_banners_banners" USING btree ("_parent_id");
  CREATE INDEX "promo_banners_banners_image_idx" ON "promo_banners_banners" USING btree ("image_id");
  CREATE INDEX "promo_banners_banners_mobile_image_idx" ON "promo_banners_banners" USING btree ("mobile_image_id");
  CREATE INDEX "promo_banners_show_on_order_idx" ON "promo_banners_show_on" USING btree ("order");
  CREATE INDEX "promo_banners_show_on_parent_idx" ON "promo_banners_show_on" USING btree ("parent_id");
  CREATE INDEX "promo_banners_updated_at_idx" ON "promo_banners" USING btree ("updated_at");
  CREATE INDEX "promo_banners_created_at_idx" ON "promo_banners" USING btree ("created_at");
  CREATE INDEX "promo_banners_rels_order_idx" ON "promo_banners_rels" USING btree ("order");
  CREATE INDEX "promo_banners_rels_parent_idx" ON "promo_banners_rels" USING btree ("parent_id");
  CREATE INDEX "promo_banners_rels_path_idx" ON "promo_banners_rels" USING btree ("path");
  CREATE INDEX "promo_banners_rels_categories_id_idx" ON "promo_banners_rels" USING btree ("categories_id");
  CREATE INDEX "promo_banners_rels_brands_id_idx" ON "promo_banners_rels" USING btree ("brands_id");
  CREATE INDEX "promo_banners_rels_products_id_idx" ON "promo_banners_rels" USING btree ("products_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_promo_banners_fk" FOREIGN KEY ("promo_banners_id") REFERENCES "public"."promo_banners"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_promo_banners_id_idx" ON "payload_locked_documents_rels" USING btree ("promo_banners_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "promo_banners_banners" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "promo_banners_show_on" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "promo_banners" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "promo_banners_rels" DISABLE ROW LEVEL SECURITY;
  -- The lock column first: dropping promo_banners CASCADE would already remove
  -- its foreign key, and the generated DROP CONSTRAINT would then fail.
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_promo_banners_fk";
  DROP INDEX "payload_locked_documents_rels_promo_banners_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "promo_banners_id";
  DROP TABLE "promo_banners_banners" CASCADE;
  DROP TABLE "promo_banners_show_on" CASCADE;
  DROP TABLE "promo_banners" CASCADE;
  DROP TABLE "promo_banners_rels" CASCADE;
  DROP TYPE "public"."enum_promo_banners_show_on";
  DROP TYPE "public"."enum_promo_banners_position";`)
}
