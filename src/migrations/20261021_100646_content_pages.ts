import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "pages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"is_published" boolean DEFAULT true,
  	"meta_description" varchar,
  	"content" jsonb NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "pages_id" integer;
  ALTER TABLE "site_settings" ADD COLUMN "catalogue_file_id" integer;
  ALTER TABLE "site_settings" ADD COLUMN "price_list_file_id" integer;
  CREATE UNIQUE INDEX "pages_slug_idx" ON "pages" USING btree ("slug");
  CREATE INDEX "pages_updated_at_idx" ON "pages" USING btree ("updated_at");
  CREATE INDEX "pages_created_at_idx" ON "pages" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_catalogue_file_id_datasheets_id_fk" FOREIGN KEY ("catalogue_file_id") REFERENCES "public"."datasheets"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_price_list_file_id_datasheets_id_fk" FOREIGN KEY ("price_list_file_id") REFERENCES "public"."datasheets"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_pages_id_idx" ON "payload_locked_documents_rels" USING btree ("pages_id");
  CREATE INDEX "site_settings_catalogue_file_idx" ON "site_settings" USING btree ("catalogue_file_id");
  CREATE INDEX "site_settings_price_list_file_idx" ON "site_settings" USING btree ("price_list_file_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "pages" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_pages_fk";
  
  ALTER TABLE "site_settings" DROP CONSTRAINT "site_settings_catalogue_file_id_datasheets_id_fk";
  
  ALTER TABLE "site_settings" DROP CONSTRAINT "site_settings_price_list_file_id_datasheets_id_fk";
  
  DROP INDEX "payload_locked_documents_rels_pages_id_idx";
  DROP INDEX "site_settings_catalogue_file_idx";
  DROP INDEX "site_settings_price_list_file_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "pages_id";
  ALTER TABLE "site_settings" DROP COLUMN "catalogue_file_id";
  ALTER TABLE "site_settings" DROP COLUMN "price_list_file_id";`)
}
