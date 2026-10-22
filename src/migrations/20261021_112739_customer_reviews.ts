import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "customer_product_idx";
  ALTER TABLE "reviews" ADD COLUMN "customer_id" integer;
  ALTER TABLE "reviews" ADD CONSTRAINT "reviews_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "reviews_customer_idx" ON "reviews" USING btree ("customer_id");
  CREATE UNIQUE INDEX "customer_product_idx" ON "reviews" USING btree ("customer_id","product_id");
  CREATE UNIQUE INDEX "customer_product_1_idx" ON "wishlist_items" USING btree ("customer_id","product_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "reviews" DROP CONSTRAINT "reviews_customer_id_customers_id_fk";
  
  DROP INDEX "reviews_customer_idx";
  DROP INDEX "customer_product_idx";
  DROP INDEX "customer_product_1_idx";
  CREATE UNIQUE INDEX "customer_product_idx" ON "wishlist_items" USING btree ("customer_id","product_id");
  ALTER TABLE "reviews" DROP COLUMN "customer_id";`)
}
