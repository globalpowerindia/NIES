import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "reviews_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"review_photos_id" integer
  );
  
  CREATE TABLE "review_photos" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"customer_id" integer,
  	"prefix" varchar DEFAULT '',
  	"_objectkey" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "review_photos_id" integer;
  ALTER TABLE "reviews_rels" ADD CONSTRAINT "reviews_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "reviews_rels" ADD CONSTRAINT "reviews_rels_review_photos_fk" FOREIGN KEY ("review_photos_id") REFERENCES "public"."review_photos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "review_photos" ADD CONSTRAINT "review_photos_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "reviews_rels_order_idx" ON "reviews_rels" USING btree ("order");
  CREATE INDEX "reviews_rels_parent_idx" ON "reviews_rels" USING btree ("parent_id");
  CREATE INDEX "reviews_rels_path_idx" ON "reviews_rels" USING btree ("path");
  CREATE INDEX "reviews_rels_review_photos_id_idx" ON "reviews_rels" USING btree ("review_photos_id");
  CREATE INDEX "review_photos_customer_idx" ON "review_photos" USING btree ("customer_id");
  CREATE INDEX "review_photos_updated_at_idx" ON "review_photos" USING btree ("updated_at");
  CREATE INDEX "review_photos_created_at_idx" ON "review_photos" USING btree ("created_at");
  CREATE UNIQUE INDEX "review_photos_filename_idx" ON "review_photos" USING btree ("filename");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_review_photos_fk" FOREIGN KEY ("review_photos_id") REFERENCES "public"."review_photos"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_review_photos_id_idx" ON "payload_locked_documents_rels" USING btree ("review_photos_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_review_photos_fk";
  ALTER TABLE "reviews_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "review_photos" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "reviews_rels" CASCADE;
  DROP TABLE "review_photos" CASCADE;

  DROP INDEX "payload_locked_documents_rels_review_photos_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "review_photos_id";`)
}
