import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "product_enquiries" (
  	"product_id" integer NOT NULL,
  	"visitor_key" text NOT NULL,
  	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
  	CONSTRAINT "product_enquiries_product_id_visitor_key_pk" PRIMARY KEY("product_id","visitor_key")
  );
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "product_enquiries" CASCADE;`)
}
