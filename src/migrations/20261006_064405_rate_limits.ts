import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "rate_limit_buckets" (
  	"key" text PRIMARY KEY NOT NULL,
  	"window_start" timestamp with time zone NOT NULL,
  	"hits" integer NOT NULL
  );
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "rate_limit_buckets" CASCADE;`)
}
