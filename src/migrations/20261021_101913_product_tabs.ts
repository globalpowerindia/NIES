import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "products" ADD COLUMN "ideal_for" jsonb;
  ALTER TABLE "products" ADD COLUMN "safety_info" jsonb;
  ALTER TABLE "products" ADD COLUMN "maintenance_tips" jsonb;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "products" DROP COLUMN "ideal_for";
  ALTER TABLE "products" DROP COLUMN "safety_info";
  ALTER TABLE "products" DROP COLUMN "maintenance_tips";`)
}
