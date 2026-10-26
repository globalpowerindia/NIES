import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "products" ADD COLUMN "sell_online" boolean DEFAULT false;
  CREATE INDEX "products_sell_online_idx" ON "products" USING btree ("sell_online");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "products_sell_online_idx";
  ALTER TABLE "products" DROP COLUMN "sell_online";`)
}
