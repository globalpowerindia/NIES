import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_orders_payment_method" AS ENUM('RAZORPAY');
  CREATE TABLE "checkout_settings_shipping_slabs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"max_weight_kg" numeric NOT NULL,
  	"within_state_paise" numeric NOT NULL,
  	"other_states_paise" numeric NOT NULL,
  	CONSTRAINT "within_state_paise_whole_non_negative" CHECK ("within_state_paise" >= 0 AND "within_state_paise" = floor("within_state_paise")),
  	CONSTRAINT "other_states_paise_whole_non_negative" CHECK ("other_states_paise" >= 0 AND "other_states_paise" = floor("other_states_paise"))
  );
  
  CREATE TABLE "checkout_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"extra_per_kg_within_state_paise" numeric DEFAULT 2500 NOT NULL,
  	"extra_per_kg_other_states_paise" numeric DEFAULT 4500 NOT NULL,
  	"default_weight_kg" numeric DEFAULT 5 NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone,
  	CONSTRAINT "extra_per_kg_within_state_paise_whole_non_negative" CHECK ("extra_per_kg_within_state_paise" >= 0 AND "extra_per_kg_within_state_paise" = floor("extra_per_kg_within_state_paise")),
  	CONSTRAINT "extra_per_kg_other_states_paise_whole_non_negative" CHECK ("extra_per_kg_other_states_paise" >= 0 AND "extra_per_kg_other_states_paise" = floor("extra_per_kg_other_states_paise"))
  );
  
  CREATE TABLE "document_counters" (
  	"key" text PRIMARY KEY NOT NULL,
  	"value" integer NOT NULL
  );
  
  ALTER TABLE "orders" ADD COLUMN "payment_method" "enum_orders_payment_method" DEFAULT 'RAZORPAY';
  ALTER TABLE "orders" ADD COLUMN "razorpay_order_id" varchar;
  ALTER TABLE "orders" ADD COLUMN "razorpay_payment_id" varchar;
  ALTER TABLE "orders" ADD COLUMN "payment_expires_at" timestamp(3) with time zone;
  ALTER TABLE "orders" ADD COLUMN "paid_at" timestamp(3) with time zone;
  ALTER TABLE "orders" ADD COLUMN "coupon_id" integer;
  ALTER TABLE "orders" ADD COLUMN "coupon_code" varchar;
  ALTER TABLE "orders" ADD COLUMN "shipping_weight_grams" numeric;
  ALTER TABLE "orders" ADD COLUMN "cart_id" integer;
  ALTER TABLE "orders" ADD COLUMN "confirmation_email_sent_at" timestamp(3) with time zone;
  ALTER TABLE "checkout_settings_shipping_slabs" ADD CONSTRAINT "checkout_settings_shipping_slabs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."checkout_settings"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "checkout_settings_shipping_slabs_order_idx" ON "checkout_settings_shipping_slabs" USING btree ("_order");
  CREATE INDEX "checkout_settings_shipping_slabs_parent_id_idx" ON "checkout_settings_shipping_slabs" USING btree ("_parent_id");
  ALTER TABLE "orders" ADD CONSTRAINT "orders_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "orders" ADD CONSTRAINT "orders_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE set null ON UPDATE no action;
  CREATE UNIQUE INDEX "orders_razorpay_order_id_idx" ON "orders" USING btree ("razorpay_order_id");
  CREATE INDEX "orders_razorpay_payment_id_idx" ON "orders" USING btree ("razorpay_payment_id");
  CREATE INDEX "orders_coupon_idx" ON "orders" USING btree ("coupon_id");
  CREATE INDEX "orders_cart_idx" ON "orders" USING btree ("cart_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "checkout_settings_shipping_slabs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "checkout_settings" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "document_counters" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "checkout_settings_shipping_slabs" CASCADE;
  DROP TABLE "checkout_settings" CASCADE;
  DROP TABLE "document_counters" CASCADE;
  ALTER TABLE "orders" DROP CONSTRAINT "orders_coupon_id_coupons_id_fk";
  
  ALTER TABLE "orders" DROP CONSTRAINT "orders_cart_id_carts_id_fk";
  
  DROP INDEX "orders_razorpay_order_id_idx";
  DROP INDEX "orders_razorpay_payment_id_idx";
  DROP INDEX "orders_coupon_idx";
  DROP INDEX "orders_cart_idx";
  ALTER TABLE "orders" DROP COLUMN "payment_method";
  ALTER TABLE "orders" DROP COLUMN "razorpay_order_id";
  ALTER TABLE "orders" DROP COLUMN "razorpay_payment_id";
  ALTER TABLE "orders" DROP COLUMN "payment_expires_at";
  ALTER TABLE "orders" DROP COLUMN "paid_at";
  ALTER TABLE "orders" DROP COLUMN "coupon_id";
  ALTER TABLE "orders" DROP COLUMN "coupon_code";
  ALTER TABLE "orders" DROP COLUMN "shipping_weight_grams";
  ALTER TABLE "orders" DROP COLUMN "cart_id";
  ALTER TABLE "orders" DROP COLUMN "confirmation_email_sent_at";
  DROP TYPE "public"."enum_orders_payment_method";`)
}
