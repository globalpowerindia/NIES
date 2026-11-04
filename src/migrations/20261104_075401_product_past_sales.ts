import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "products" ADD COLUMN "past_units_sold" numeric;
  ALTER TABLE "products" ADD COLUMN "past_sales_since" numeric;
  ALTER TABLE "_products_v" ADD COLUMN "version_past_units_sold" numeric;
  ALTER TABLE "_products_v" ADD COLUMN "version_past_sales_since" numeric;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "products" DROP COLUMN "past_units_sold";
  ALTER TABLE "products" DROP COLUMN "past_sales_since";
  ALTER TABLE "_products_v" DROP COLUMN "version_past_units_sold";
  ALTER TABLE "_products_v" DROP COLUMN "version_past_sales_since";`)
}
