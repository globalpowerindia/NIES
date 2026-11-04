import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "page_views" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"path" text NOT NULL,
  	"product_id" integer,
  	"visitor_key" text NOT NULL,
  	"source" text,
  	"device" text NOT NULL,
  	"created_at" timestamp with time zone DEFAULT now() NOT NULL
  );
  
  CREATE INDEX "page_views_created_at_idx" ON "page_views" USING btree ("created_at");
  CREATE INDEX "page_views_product_created_at_idx" ON "page_views" USING btree ("product_id","created_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "page_views" CASCADE;`)
}
