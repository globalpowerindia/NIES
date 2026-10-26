import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_orders_cancel_reason" AS ENUM('EXPIRED', 'SUPERSEDED', 'STAFF', 'GATEWAY_ERROR');
  ALTER TABLE "orders" ADD COLUMN "cancel_reason" "enum_orders_cancel_reason";`)

  // Orders cancelled before this column existed, read from the note each cancelling path wrote.
  // Anything else was cancelled by staff, which a late payment must never revive.
  await db.execute(sql`
  UPDATE "orders" SET "cancel_reason" = CASE
    WHEN "notes" LIKE '%Payment was not completed in time.%' THEN 'EXPIRED'
    WHEN "notes" LIKE '%Superseded by a newer checkout for the same cart.%' THEN 'SUPERSEDED'
    WHEN "notes" LIKE '%Razorpay order could not be created.%' THEN 'GATEWAY_ERROR'
    ELSE 'STAFF'
  END::"enum_orders_cancel_reason"
  WHERE "status" = 'CANCELLED' AND "cancel_reason" IS NULL;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "orders" DROP COLUMN "cancel_reason";
  DROP TYPE "public"."enum_orders_cancel_reason";`)
}
