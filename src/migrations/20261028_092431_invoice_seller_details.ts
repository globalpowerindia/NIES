import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "checkout_settings" ADD COLUMN "invoice_legal_name" varchar;
  ALTER TABLE "checkout_settings" ADD COLUMN "invoice_gstin" varchar;
  ALTER TABLE "checkout_settings" ADD COLUMN "invoice_address" varchar;
  ALTER TABLE "checkout_settings" ADD COLUMN "invoice_phone" varchar;
  ALTER TABLE "checkout_settings" ADD COLUMN "invoice_email" varchar;
  ALTER TABLE "checkout_settings" ADD COLUMN "invoice_footer" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "checkout_settings" DROP COLUMN "invoice_legal_name";
  ALTER TABLE "checkout_settings" DROP COLUMN "invoice_gstin";
  ALTER TABLE "checkout_settings" DROP COLUMN "invoice_address";
  ALTER TABLE "checkout_settings" DROP COLUMN "invoice_phone";
  ALTER TABLE "checkout_settings" DROP COLUMN "invoice_email";
  ALTER TABLE "checkout_settings" DROP COLUMN "invoice_footer";`)
}
