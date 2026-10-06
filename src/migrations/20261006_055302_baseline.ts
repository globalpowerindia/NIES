import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  // Search's trigram indexes need pg_trgm; on Neon it was first created by hand.
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS pg_trgm;`)
  await db.execute(sql`
   CREATE TYPE "public"."enum_spec_definitions_type" AS ENUM('TEXT', 'NUMBER', 'BOOLEAN');
  CREATE TYPE "public"."enum_products_badges" AS ENUM('NEW', 'BEST_SELLER');
  CREATE TYPE "public"."enum_products_videos_source" AS ENUM('youtube', 'upload');
  CREATE TYPE "public"."enum_products_status" AS ENUM('DRAFT', 'ACTIVE', 'ARCHIVED');
  CREATE TYPE "public"."enum_product_variants_power_source" AS ENUM('CORDED', 'CORDLESS');
  CREATE TYPE "public"."enum_product_variants_pack_type" AS ENUM('BARE_TOOL', 'KIT');
  CREATE TYPE "public"."enum_reviews_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED');
  CREATE TYPE "public"."enum_inventory_stock_status" AS ENUM('IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK');
  CREATE TYPE "public"."enum_stock_movements_type" AS ENUM('RECEIVED', 'RETURNED', 'ADJUST_UP', 'ADJUST_DOWN', 'DAMAGED', 'RESERVED', 'RELEASED', 'SOLD');
  CREATE TYPE "public"."enum_orders_status" AS ENUM('PENDING_PAYMENT', 'CONFIRMED', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURNED');
  CREATE TYPE "public"."enum_carts_status" AS ENUM('ACTIVE', 'MERGED', 'CONVERTED');
  CREATE TYPE "public"."enum_coupons_type" AS ENUM('PERCENT', 'FLAT');
  CREATE TYPE "public"."enum_newsletter_subscribers_status" AS ENUM('SUBSCRIBED', 'UNSUBSCRIBED');
  CREATE TYPE "public"."enum_customers_status" AS ENUM('ACTIVE', 'BLOCKED');
  CREATE TYPE "public"."enum_addresses_state_code" AS ENUM('35', '37', '12', '18', '10', '04', '22', '26', '07', '30', '24', '06', '02', '01', '20', '29', '32', '38', '31', '23', '27', '14', '17', '15', '13', '21', '34', '03', '08', '11', '33', '36', '16', '09', '05', '19');
  CREATE TYPE "public"."enum_addresses_type" AS ENUM('HOME', 'OFFICE', 'OTHER');
  CREATE TYPE "public"."enum_auth_identities_provider" AS ENUM('PHONE_OTP', 'EMAIL_OTP', 'GOOGLE');
  CREATE TYPE "public"."enum_otp_challenges_channel" AS ENUM('SMS', 'EMAIL');
  CREATE TYPE "public"."enum_users_role" AS ENUM('SUPER_ADMIN', 'MANAGER', 'STAFF');
  CREATE TYPE "public"."enum_home_page_blocks_hero_carousel_slides_link_lnk" AS ENUM('category', 'product', 'custom', 'none');
  CREATE TYPE "public"."enum_home_page_blocks_hero_carousel_slides_overlay_btn" AS ENUM('red', 'blue', 'outline');
  CREATE TYPE "public"."enum_home_page_blocks_hero_carousel_slides_overlay_pos" AS ENUM('left', 'right');
  CREATE TYPE "public"."enum_home_page_blocks_hero_carousel_slides_overlay_tone" AS ENUM('light', 'dark');
  CREATE TYPE "public"."enum_home_page_blocks_banner_row_banners_link_lnk" AS ENUM('category', 'product', 'custom', 'none');
  CREATE TYPE "public"."enum_home_page_blocks_banner_row_banners_overlay_btn" AS ENUM('red', 'blue', 'outline');
  CREATE TYPE "public"."enum_home_page_blocks_banner_row_banners_overlay_pos" AS ENUM('left', 'right');
  CREATE TYPE "public"."enum_home_page_blocks_banner_row_banners_overlay_tone" AS ENUM('light', 'dark');
  CREATE TYPE "public"."enum_home_page_blocks_wide_banner_shape" AS ENUM('feature', 'strip');
  CREATE TYPE "public"."enum_home_page_blocks_wide_banner_link_lnk" AS ENUM('category', 'product', 'custom', 'none');
  CREATE TYPE "public"."enum_home_page_blocks_wide_banner_overlay_btn" AS ENUM('red', 'blue', 'outline');
  CREATE TYPE "public"."enum_home_page_blocks_wide_banner_overlay_pos" AS ENUM('left', 'right');
  CREATE TYPE "public"."enum_home_page_blocks_wide_banner_overlay_tone" AS ENUM('light', 'dark');
  CREATE TYPE "public"."enum_home_page_blocks_product_carousel_source" AS ENUM('new', 'bestSeller', 'offers', 'category', 'manual');
  CREATE TYPE "public"."enum_home_page_blocks_collection_showcase_button_link_lnk" AS ENUM('category', 'product', 'custom', 'none');
  CREATE TYPE "public"."enum_home_page_blocks_catalogue_banner_button_link_lnk" AS ENUM('category', 'product', 'custom', 'none');
  CREATE TYPE "public"."enum_home_page_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__home_page_v_blocks_hero_carousel_slides_link_lnk" AS ENUM('category', 'product', 'custom', 'none');
  CREATE TYPE "public"."enum__home_page_v_blocks_hero_carousel_slides_overlay_btn" AS ENUM('red', 'blue', 'outline');
  CREATE TYPE "public"."enum__home_page_v_blocks_hero_carousel_slides_overlay_pos" AS ENUM('left', 'right');
  CREATE TYPE "public"."enum__home_page_v_blocks_hero_carousel_slides_overlay_tone" AS ENUM('light', 'dark');
  CREATE TYPE "public"."enum__home_page_v_blocks_banner_row_banners_link_lnk" AS ENUM('category', 'product', 'custom', 'none');
  CREATE TYPE "public"."enum__home_page_v_blocks_banner_row_banners_overlay_btn" AS ENUM('red', 'blue', 'outline');
  CREATE TYPE "public"."enum__home_page_v_blocks_banner_row_banners_overlay_pos" AS ENUM('left', 'right');
  CREATE TYPE "public"."enum__home_page_v_blocks_banner_row_banners_overlay_tone" AS ENUM('light', 'dark');
  CREATE TYPE "public"."enum__home_page_v_blocks_wide_banner_shape" AS ENUM('feature', 'strip');
  CREATE TYPE "public"."enum__home_page_v_blocks_wide_banner_link_lnk" AS ENUM('category', 'product', 'custom', 'none');
  CREATE TYPE "public"."enum__home_page_v_blocks_wide_banner_overlay_btn" AS ENUM('red', 'blue', 'outline');
  CREATE TYPE "public"."enum__home_page_v_blocks_wide_banner_overlay_pos" AS ENUM('left', 'right');
  CREATE TYPE "public"."enum__home_page_v_blocks_wide_banner_overlay_tone" AS ENUM('light', 'dark');
  CREATE TYPE "public"."enum__home_page_v_blocks_product_carousel_source" AS ENUM('new', 'bestSeller', 'offers', 'category', 'manual');
  CREATE TYPE "public"."enum__home_page_v_blocks_collection_showcase_button_link_lnk" AS ENUM('category', 'product', 'custom', 'none');
  CREATE TYPE "public"."enum__home_page_v_blocks_catalogue_banner_button_link_lnk" AS ENUM('category', 'product', 'custom', 'none');
  CREATE TYPE "public"."enum__home_page_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_site_settings_utility_links_icon" AS ENUM('rupee', 'book', 'phone');
  CREATE TYPE "public"."enum_site_settings_utility_links_link_lnk" AS ENUM('category', 'product', 'custom', 'none');
  CREATE TYPE "public"."enum_site_settings_top_moving_products_link_lnk" AS ENUM('category', 'product', 'custom', 'none');
  CREATE TYPE "public"."enum_site_settings_footer_columns_links_link_lnk" AS ENUM('category', 'product', 'custom', 'none');
  CREATE TYPE "public"."enum_site_settings_social_links_platform" AS ENUM('facebook', 'instagram', 'whatsapp', 'youtube');
  CREATE TABLE "categories" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"description" varchar,
  	"image_id" integer,
  	"banner_image_id" integer,
  	"parent_id" integer,
  	"delivery_kerala_paise" numeric,
  	"delivery_out_of_state_paise" numeric,
  	"is_active" boolean DEFAULT true,
  	"sort_order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "brands" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"logo_id" integer,
  	"about" varchar,
  	"is_active" boolean DEFAULT true,
  	"sort_order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "spec_definitions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"label" varchar NOT NULL,
  	"unit" varchar,
  	"type" "enum_spec_definitions_type" DEFAULT 'TEXT' NOT NULL,
  	"group" varchar DEFAULT 'General',
  	"category_id" integer,
  	"is_filter" boolean DEFAULT false,
  	"is_summary" boolean DEFAULT false,
  	"is_compare" boolean DEFAULT true,
  	"sort_order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "products_badges" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_products_badges",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "products_videos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"source" "enum_products_videos_source" DEFAULT 'youtube' NOT NULL,
  	"title" varchar,
  	"url" varchar,
  	"file_id" integer
  );
  
  CREATE TABLE "products_free_accessories" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"quantity" varchar,
  	"image_id" integer
  );
  
  CREATE TABLE "products_applications_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"image_id" integer NOT NULL
  );
  
  CREATE TABLE "products_spec_values" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"definition_id" integer NOT NULL,
  	"value_text" varchar,
  	"value_num" numeric,
  	"value_bool" boolean
  );
  
  CREATE TABLE "products" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"search_a" varchar,
  	"search_b" varchar,
  	"search_c" varchar,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"status" "enum_products_status" DEFAULT 'DRAFT' NOT NULL,
  	"sort_order" numeric DEFAULT 0,
  	"rating_avg" numeric DEFAULT 0,
  	"rating_count" numeric DEFAULT 0,
  	"subtitle" varchar,
  	"model_number" varchar,
  	"short_desc" varchar,
  	"description" jsonb,
  	"key_features" jsonb,
  	"warranty_info" jsonb,
  	"user_manual_id" integer,
  	"category_id" integer NOT NULL,
  	"brand_id" integer,
  	"country_of_origin" varchar DEFAULT 'India',
  	"brochure_banner_id" integer,
  	"datasheet_id" integer,
  	"applications_title" varchar,
  	"hsn_code" varchar DEFAULT '8467' NOT NULL,
  	"gst_rate_bps" numeric DEFAULT 1800 NOT NULL,
  	"warranty_months" numeric DEFAULT 6,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"search_vector" "tsvector" GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(search_a, '')), 'A') ||
    setweight(to_tsvector('simple',  coalesce(search_a, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(search_b, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(search_c, '')), 'C') ||
    setweight(to_tsvector('simple',  coalesce(search_c, '')), 'C')
  ) STORED,
  	CONSTRAINT "gst_rate_bps_whole_non_negative" CHECK ("gst_rate_bps" >= 0 AND "gst_rate_bps" = floor("gst_rate_bps"))
  );
  
  CREATE TABLE "products_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer,
  	"products_id" integer
  );
  
  CREATE TABLE "product_variants" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"product_id" integer NOT NULL,
  	"sku" varchar NOT NULL,
  	"name" varchar NOT NULL,
  	"power_source" "enum_product_variants_power_source",
  	"battery_ah" numeric,
  	"pack_type" "enum_product_variants_pack_type",
  	"mrp_paise" numeric NOT NULL,
  	"selling_price_paise" numeric NOT NULL,
  	"weight_grams" numeric,
  	"barcode" varchar,
  	"is_default" boolean DEFAULT false,
  	"is_active" boolean DEFAULT true,
  	"sort_order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	CONSTRAINT "mrp_paise_whole_non_negative" CHECK ("mrp_paise" >= 0 AND "mrp_paise" = floor("mrp_paise")),
  	CONSTRAINT "selling_price_paise_whole_non_negative" CHECK ("selling_price_paise" >= 0 AND "selling_price_paise" = floor("selling_price_paise"))
  );
  
  CREATE TABLE "product_variants_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer
  );
  
  CREATE TABLE "reviews" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"product_id" integer NOT NULL,
  	"author_name" varchar NOT NULL,
  	"rating" numeric NOT NULL,
  	"verified_purchase" boolean DEFAULT false,
  	"title" varchar,
  	"body" varchar,
  	"status" "enum_reviews_status" DEFAULT 'PENDING' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "inventory" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"variant_id" integer NOT NULL,
  	"product_id" integer,
  	"sku" varchar,
  	"on_hand" numeric DEFAULT 0,
  	"reserved" numeric DEFAULT 0,
  	"stock_status" "enum_inventory_stock_status" DEFAULT 'OUT_OF_STOCK',
  	"low_stock_threshold" numeric DEFAULT 5,
  	"allow_backorder" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	CONSTRAINT "on_hand_whole_non_negative" CHECK ("on_hand" >= 0 AND "on_hand" = floor("on_hand")),
  	CONSTRAINT "reserved_whole_non_negative" CHECK ("reserved" >= 0 AND "reserved" = floor("reserved"))
  );
  
  CREATE TABLE "stock_movements" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"variant_id" integer NOT NULL,
  	"type" "enum_stock_movements_type" DEFAULT 'RECEIVED' NOT NULL,
  	"quantity" numeric NOT NULL,
  	"note" varchar,
  	"order_id" integer,
  	"inventory_id" integer,
  	"on_hand_after" numeric,
  	"reserved_after" numeric,
  	"recorded_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar NOT NULL,
  	"prefix" varchar DEFAULT '',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_thumbnail_url" varchar,
  	"sizes_thumbnail_width" numeric,
  	"sizes_thumbnail_height" numeric,
  	"sizes_thumbnail_mime_type" varchar,
  	"sizes_thumbnail_filesize" numeric,
  	"sizes_thumbnail_filename" varchar,
  	"sizes_card_url" varchar,
  	"sizes_card_width" numeric,
  	"sizes_card_height" numeric,
  	"sizes_card_mime_type" varchar,
  	"sizes_card_filesize" numeric,
  	"sizes_card_filename" varchar,
  	"sizes_hero_url" varchar,
  	"sizes_hero_width" numeric,
  	"sizes_hero_height" numeric,
  	"sizes_hero_mime_type" varchar,
  	"sizes_hero_filesize" numeric,
  	"sizes_hero_filename" varchar
  );
  
  CREATE TABLE "datasheets" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"prefix" varchar DEFAULT '',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "orders_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"product_id" integer,
  	"product_name" varchar NOT NULL,
  	"sku" varchar NOT NULL,
  	"quantity" numeric NOT NULL,
  	"hsn_code" varchar NOT NULL,
  	"gst_rate_bps" numeric DEFAULT 1800 NOT NULL,
  	"unit_price_paise" numeric NOT NULL,
  	"line_net_paise" numeric NOT NULL,
  	"line_taxable_paise" numeric NOT NULL,
  	"line_tax_paise" numeric NOT NULL
  );
  
  CREATE TABLE "orders" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order_number" varchar NOT NULL,
  	"invoice_number" varchar,
  	"status" "enum_orders_status" DEFAULT 'PENDING_PAYMENT' NOT NULL,
  	"placed_at" timestamp(3) with time zone NOT NULL,
  	"customer_id" integer,
  	"customer_name" varchar NOT NULL,
  	"customer_email" varchar,
  	"customer_phone" varchar,
  	"customer_gstin" varchar,
  	"ship_line1" varchar NOT NULL,
  	"ship_line2" varchar,
  	"ship_landmark" varchar,
  	"ship_city" varchar NOT NULL,
  	"ship_pincode" varchar NOT NULL,
  	"ship_state_code" varchar DEFAULT '32' NOT NULL,
  	"ship_state_name" varchar DEFAULT 'Kerala' NOT NULL,
  	"subtotal_paise" numeric NOT NULL,
  	"discount_paise" numeric DEFAULT 0,
  	"shipping_paise" numeric DEFAULT 0,
  	"taxable_paise" numeric NOT NULL,
  	"cgst_paise" numeric DEFAULT 0,
  	"sgst_paise" numeric DEFAULT 0,
  	"igst_paise" numeric DEFAULT 0,
  	"grand_total_paise" numeric NOT NULL,
  	"tracking_carrier" varchar,
  	"tracking_number" varchar,
  	"shipped_at" timestamp(3) with time zone,
  	"notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	CONSTRAINT "subtotal_paise_whole_non_negative" CHECK ("subtotal_paise" >= 0 AND "subtotal_paise" = floor("subtotal_paise")),
  	CONSTRAINT "discount_paise_whole_non_negative" CHECK ("discount_paise" >= 0 AND "discount_paise" = floor("discount_paise")),
  	CONSTRAINT "shipping_paise_whole_non_negative" CHECK ("shipping_paise" >= 0 AND "shipping_paise" = floor("shipping_paise")),
  	CONSTRAINT "taxable_paise_whole_non_negative" CHECK ("taxable_paise" >= 0 AND "taxable_paise" = floor("taxable_paise")),
  	CONSTRAINT "cgst_paise_whole_non_negative" CHECK ("cgst_paise" >= 0 AND "cgst_paise" = floor("cgst_paise")),
  	CONSTRAINT "sgst_paise_whole_non_negative" CHECK ("sgst_paise" >= 0 AND "sgst_paise" = floor("sgst_paise")),
  	CONSTRAINT "igst_paise_whole_non_negative" CHECK ("igst_paise" >= 0 AND "igst_paise" = floor("igst_paise")),
  	CONSTRAINT "grand_total_paise_whole_non_negative" CHECK ("grand_total_paise" >= 0 AND "grand_total_paise" = floor("grand_total_paise"))
  );
  
  CREATE TABLE "carts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"customer_id" integer,
  	"token" varchar,
  	"status" "enum_carts_status" DEFAULT 'ACTIVE' NOT NULL,
  	"coupon_id" integer,
  	"last_activity_at" timestamp(3) with time zone,
  	"abandoned_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cart_items" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"cart_id" integer NOT NULL,
  	"variant_id" integer NOT NULL,
  	"product_id" integer NOT NULL,
  	"quantity" numeric NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	CONSTRAINT "quantity_whole_positive" CHECK ("quantity" >= 1 AND "quantity" = floor("quantity"))
  );
  
  CREATE TABLE "coupons" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"code" varchar NOT NULL,
  	"is_active" boolean DEFAULT true,
  	"description" varchar,
  	"type" "enum_coupons_type" DEFAULT 'PERCENT' NOT NULL,
  	"percent_bps" numeric,
  	"amount_paise" numeric,
  	"min_subtotal_paise" numeric,
  	"max_discount_paise" numeric,
  	"starts_at" timestamp(3) with time zone,
  	"ends_at" timestamp(3) with time zone,
  	"usage_limit" numeric,
  	"per_customer_limit" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	CONSTRAINT "amount_paise_whole_non_negative" CHECK ("amount_paise" >= 0 AND "amount_paise" = floor("amount_paise")),
  	CONSTRAINT "min_subtotal_paise_whole_non_negative" CHECK ("min_subtotal_paise" >= 0 AND "min_subtotal_paise" = floor("min_subtotal_paise")),
  	CONSTRAINT "max_discount_paise_whole_non_negative" CHECK ("max_discount_paise" >= 0 AND "max_discount_paise" = floor("max_discount_paise"))
  );
  
  CREATE TABLE "coupon_redemptions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"coupon_id" integer NOT NULL,
  	"order_id" integer NOT NULL,
  	"customer_id" integer,
  	"discount_paise" numeric NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	CONSTRAINT "discount_paise_whole_non_negative" CHECK ("discount_paise" >= 0 AND "discount_paise" = floor("discount_paise"))
  );
  
  CREATE TABLE "newsletter_subscribers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"email" varchar NOT NULL,
  	"status" "enum_newsletter_subscribers_status" DEFAULT 'SUBSCRIBED' NOT NULL,
  	"source" varchar DEFAULT 'homepage',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "search_synonyms" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"terms" varchar NOT NULL,
  	"is_active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "customers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"first_name" varchar,
  	"last_name" varchar,
  	"email" varchar,
  	"phone" varchar,
  	"email_verified_at" timestamp(3) with time zone,
  	"phone_verified_at" timestamp(3) with time zone,
  	"status" "enum_customers_status" DEFAULT 'ACTIVE' NOT NULL,
  	"accepts_marketing" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "addresses" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"customer_id" integer NOT NULL,
  	"full_name" varchar NOT NULL,
  	"phone" varchar NOT NULL,
  	"line1" varchar NOT NULL,
  	"line2" varchar NOT NULL,
  	"city" varchar NOT NULL,
  	"pincode" varchar NOT NULL,
  	"state_code" "enum_addresses_state_code" NOT NULL,
  	"type" "enum_addresses_type" DEFAULT 'HOME' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "wishlist_items" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"customer_id" integer NOT NULL,
  	"product_id" integer NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "auth_identities" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"provider" "enum_auth_identities_provider" NOT NULL,
  	"provider_account_id" varchar NOT NULL,
  	"customer_id" integer NOT NULL,
  	"last_used_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "otp_challenges" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"channel" "enum_otp_challenges_channel" NOT NULL,
  	"destination" varchar NOT NULL,
  	"code_hash" varchar NOT NULL,
  	"attempts" numeric DEFAULT 0 NOT NULL,
  	"expires_at" timestamp(3) with time zone NOT NULL,
  	"consumed_at" timestamp(3) with time zone,
  	"ip_hash" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"role" "enum_users_role" DEFAULT 'STAFF' NOT NULL,
  	"is_active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"categories_id" integer,
  	"brands_id" integer,
  	"spec_definitions_id" integer,
  	"products_id" integer,
  	"product_variants_id" integer,
  	"reviews_id" integer,
  	"inventory_id" integer,
  	"stock_movements_id" integer,
  	"media_id" integer,
  	"datasheets_id" integer,
  	"orders_id" integer,
  	"carts_id" integer,
  	"cart_items_id" integer,
  	"coupons_id" integer,
  	"coupon_redemptions_id" integer,
  	"newsletter_subscribers_id" integer,
  	"search_synonyms_id" integer,
  	"customers_id" integer,
  	"addresses_id" integer,
  	"wishlist_items_id" integer,
  	"auth_identities_id" integer,
  	"otp_challenges_id" integer,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "home_page_blocks_hero_carousel_slides" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"mobile_image_id" integer,
  	"link_type" "enum_home_page_blocks_hero_carousel_slides_link_lnk" DEFAULT 'category',
  	"link_category_id" integer,
  	"link_product_id" integer,
  	"link_url" varchar,
  	"overlay_heading" varchar,
  	"overlay_subheading" varchar,
  	"overlay_button_label" varchar,
  	"overlay_button_style" "enum_home_page_blocks_hero_carousel_slides_overlay_btn" DEFAULT 'red',
  	"overlay_position" "enum_home_page_blocks_hero_carousel_slides_overlay_pos" DEFAULT 'left',
  	"overlay_text_tone" "enum_home_page_blocks_hero_carousel_slides_overlay_tone" DEFAULT 'light',
  	"overlay_shade" boolean DEFAULT false
  );
  
  CREATE TABLE "home_page_blocks_hero_carousel" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "home_page_blocks_banner_row_banners" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"mobile_image_id" integer,
  	"link_type" "enum_home_page_blocks_banner_row_banners_link_lnk" DEFAULT 'category',
  	"link_category_id" integer,
  	"link_product_id" integer,
  	"link_url" varchar,
  	"overlay_heading" varchar,
  	"overlay_subheading" varchar,
  	"overlay_button_label" varchar,
  	"overlay_button_style" "enum_home_page_blocks_banner_row_banners_overlay_btn" DEFAULT 'red',
  	"overlay_position" "enum_home_page_blocks_banner_row_banners_overlay_pos" DEFAULT 'left',
  	"overlay_text_tone" "enum_home_page_blocks_banner_row_banners_overlay_tone" DEFAULT 'light',
  	"overlay_shade" boolean DEFAULT false
  );
  
  CREATE TABLE "home_page_blocks_banner_row" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "home_page_blocks_wide_banner" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"hidden" boolean DEFAULT false,
  	"shape" "enum_home_page_blocks_wide_banner_shape" DEFAULT 'feature',
  	"image_id" integer,
  	"mobile_image_id" integer,
  	"link_type" "enum_home_page_blocks_wide_banner_link_lnk" DEFAULT 'category',
  	"link_category_id" integer,
  	"link_product_id" integer,
  	"link_url" varchar,
  	"overlay_heading" varchar,
  	"overlay_subheading" varchar,
  	"overlay_button_label" varchar,
  	"overlay_button_style" "enum_home_page_blocks_wide_banner_overlay_btn" DEFAULT 'red',
  	"overlay_position" "enum_home_page_blocks_wide_banner_overlay_pos" DEFAULT 'left',
  	"overlay_text_tone" "enum_home_page_blocks_wide_banner_overlay_tone" DEFAULT 'light',
  	"overlay_shade" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "home_page_blocks_product_carousel" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"hidden" boolean DEFAULT false,
  	"eyebrow" varchar,
  	"title" varchar,
  	"description" varchar,
  	"source" "enum_home_page_blocks_product_carousel_source" DEFAULT 'new',
  	"limit" numeric DEFAULT 12,
  	"category_id" integer,
  	"block_name" varchar
  );
  
  CREATE TABLE "home_page_blocks_category_grid_tiles" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"category_id" integer,
  	"image_id" integer,
  	"title" varchar,
  	"link_label" varchar
  );
  
  CREATE TABLE "home_page_blocks_category_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"hidden" boolean DEFAULT false,
  	"eyebrow" varchar DEFAULT 'Category Zone',
  	"title" varchar DEFAULT 'Explore Wide Range Of Categories',
  	"description" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "home_page_blocks_collection_showcase" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"hidden" boolean DEFAULT false,
  	"eyebrow" varchar,
  	"title" varchar,
  	"description" varchar,
  	"feature_image_id" integer,
  	"button_label" varchar DEFAULT 'View All',
  	"button_link_type" "enum_home_page_blocks_collection_showcase_button_link_lnk" DEFAULT 'category',
  	"button_link_category_id" integer,
  	"button_link_product_id" integer,
  	"button_link_url" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "home_page_blocks_catalogue_banner" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"hidden" boolean DEFAULT false,
  	"title" varchar DEFAULT 'Download our Product Catalogue',
  	"description" varchar,
  	"button_label" varchar DEFAULT 'Download Catalogue',
  	"file_id" integer,
  	"button_link_type" "enum_home_page_blocks_catalogue_banner_button_link_lnk" DEFAULT 'category',
  	"button_link_category_id" integer,
  	"button_link_product_id" integer,
  	"button_link_url" varchar,
  	"image_id" integer,
  	"block_name" varchar
  );
  
  CREATE TABLE "home_page_blocks_value_props_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"icon_id" integer,
  	"title" varchar,
  	"text" varchar
  );
  
  CREATE TABLE "home_page_blocks_value_props" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"hidden" boolean DEFAULT false,
  	"eyebrow" varchar DEFAULT 'Why Choose Us',
  	"title" varchar DEFAULT 'Reasons to Choose Us',
  	"description" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "home_page_blocks_app_promo" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"hidden" boolean DEFAULT false,
  	"title" varchar DEFAULT 'Shop with Ease on the Tools Hypermarket App',
  	"description" varchar DEFAULT 'Browse, compare, and order your tools anytime, anywhere.',
  	"screenshot_id" integer,
  	"google_play_url" varchar,
  	"app_store_url" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "home_page_blocks_trusted_brands" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"hidden" boolean DEFAULT false,
  	"title" varchar DEFAULT 'Our Trusted Brands',
  	"description" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "home_page_blocks_newsletter" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"hidden" boolean DEFAULT false,
  	"title" varchar DEFAULT 'Be the First to Know',
  	"description" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "home_page" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"_status" "enum_home_page_status" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "home_page_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"products_id" integer,
  	"brands_id" integer
  );
  
  CREATE TABLE "_home_page_v_blocks_hero_carousel_slides" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"mobile_image_id" integer,
  	"link_type" "enum__home_page_v_blocks_hero_carousel_slides_link_lnk" DEFAULT 'category',
  	"link_category_id" integer,
  	"link_product_id" integer,
  	"link_url" varchar,
  	"overlay_heading" varchar,
  	"overlay_subheading" varchar,
  	"overlay_button_label" varchar,
  	"overlay_button_style" "enum__home_page_v_blocks_hero_carousel_slides_overlay_btn" DEFAULT 'red',
  	"overlay_position" "enum__home_page_v_blocks_hero_carousel_slides_overlay_pos" DEFAULT 'left',
  	"overlay_text_tone" "enum__home_page_v_blocks_hero_carousel_slides_overlay_tone" DEFAULT 'light',
  	"overlay_shade" boolean DEFAULT false,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_home_page_v_blocks_hero_carousel" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_home_page_v_blocks_banner_row_banners" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"mobile_image_id" integer,
  	"link_type" "enum__home_page_v_blocks_banner_row_banners_link_lnk" DEFAULT 'category',
  	"link_category_id" integer,
  	"link_product_id" integer,
  	"link_url" varchar,
  	"overlay_heading" varchar,
  	"overlay_subheading" varchar,
  	"overlay_button_label" varchar,
  	"overlay_button_style" "enum__home_page_v_blocks_banner_row_banners_overlay_btn" DEFAULT 'red',
  	"overlay_position" "enum__home_page_v_blocks_banner_row_banners_overlay_pos" DEFAULT 'left',
  	"overlay_text_tone" "enum__home_page_v_blocks_banner_row_banners_overlay_tone" DEFAULT 'light',
  	"overlay_shade" boolean DEFAULT false,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_home_page_v_blocks_banner_row" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_home_page_v_blocks_wide_banner" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"hidden" boolean DEFAULT false,
  	"shape" "enum__home_page_v_blocks_wide_banner_shape" DEFAULT 'feature',
  	"image_id" integer,
  	"mobile_image_id" integer,
  	"link_type" "enum__home_page_v_blocks_wide_banner_link_lnk" DEFAULT 'category',
  	"link_category_id" integer,
  	"link_product_id" integer,
  	"link_url" varchar,
  	"overlay_heading" varchar,
  	"overlay_subheading" varchar,
  	"overlay_button_label" varchar,
  	"overlay_button_style" "enum__home_page_v_blocks_wide_banner_overlay_btn" DEFAULT 'red',
  	"overlay_position" "enum__home_page_v_blocks_wide_banner_overlay_pos" DEFAULT 'left',
  	"overlay_text_tone" "enum__home_page_v_blocks_wide_banner_overlay_tone" DEFAULT 'light',
  	"overlay_shade" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_home_page_v_blocks_product_carousel" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"hidden" boolean DEFAULT false,
  	"eyebrow" varchar,
  	"title" varchar,
  	"description" varchar,
  	"source" "enum__home_page_v_blocks_product_carousel_source" DEFAULT 'new',
  	"limit" numeric DEFAULT 12,
  	"category_id" integer,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_home_page_v_blocks_category_grid_tiles" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"category_id" integer,
  	"image_id" integer,
  	"title" varchar,
  	"link_label" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_home_page_v_blocks_category_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"hidden" boolean DEFAULT false,
  	"eyebrow" varchar DEFAULT 'Category Zone',
  	"title" varchar DEFAULT 'Explore Wide Range Of Categories',
  	"description" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_home_page_v_blocks_collection_showcase" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"hidden" boolean DEFAULT false,
  	"eyebrow" varchar,
  	"title" varchar,
  	"description" varchar,
  	"feature_image_id" integer,
  	"button_label" varchar DEFAULT 'View All',
  	"button_link_type" "enum__home_page_v_blocks_collection_showcase_button_link_lnk" DEFAULT 'category',
  	"button_link_category_id" integer,
  	"button_link_product_id" integer,
  	"button_link_url" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_home_page_v_blocks_catalogue_banner" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"hidden" boolean DEFAULT false,
  	"title" varchar DEFAULT 'Download our Product Catalogue',
  	"description" varchar,
  	"button_label" varchar DEFAULT 'Download Catalogue',
  	"file_id" integer,
  	"button_link_type" "enum__home_page_v_blocks_catalogue_banner_button_link_lnk" DEFAULT 'category',
  	"button_link_category_id" integer,
  	"button_link_product_id" integer,
  	"button_link_url" varchar,
  	"image_id" integer,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_home_page_v_blocks_value_props_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"icon_id" integer,
  	"title" varchar,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_home_page_v_blocks_value_props" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"hidden" boolean DEFAULT false,
  	"eyebrow" varchar DEFAULT 'Why Choose Us',
  	"title" varchar DEFAULT 'Reasons to Choose Us',
  	"description" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_home_page_v_blocks_app_promo" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"hidden" boolean DEFAULT false,
  	"title" varchar DEFAULT 'Shop with Ease on the Tools Hypermarket App',
  	"description" varchar DEFAULT 'Browse, compare, and order your tools anytime, anywhere.',
  	"screenshot_id" integer,
  	"google_play_url" varchar,
  	"app_store_url" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_home_page_v_blocks_trusted_brands" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"hidden" boolean DEFAULT false,
  	"title" varchar DEFAULT 'Our Trusted Brands',
  	"description" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_home_page_v_blocks_newsletter" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"hidden" boolean DEFAULT false,
  	"title" varchar DEFAULT 'Be the First to Know',
  	"description" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_home_page_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version__status" "enum__home_page_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "_home_page_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"products_id" integer,
  	"brands_id" integer
  );
  
  CREATE TABLE "site_settings_offers" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "site_settings_utility_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"icon" "enum_site_settings_utility_links_icon" DEFAULT 'book',
  	"file_id" integer,
  	"link_type" "enum_site_settings_utility_links_link_lnk" DEFAULT 'category',
  	"link_category_id" integer,
  	"link_product_id" integer,
  	"link_url" varchar
  );
  
  CREATE TABLE "site_settings_top_moving_products" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"image_id" integer NOT NULL,
  	"link_type" "enum_site_settings_top_moving_products_link_lnk" DEFAULT 'category',
  	"link_category_id" integer,
  	"link_product_id" integer,
  	"link_url" varchar
  );
  
  CREATE TABLE "site_settings_footer_columns_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"link_type" "enum_site_settings_footer_columns_links_link_lnk" DEFAULT 'category',
  	"link_category_id" integer,
  	"link_product_id" integer,
  	"link_url" varchar
  );
  
  CREATE TABLE "site_settings_footer_columns" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar NOT NULL
  );
  
  CREATE TABLE "site_settings_social_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"platform" "enum_site_settings_social_links_platform" NOT NULL,
  	"url" varchar NOT NULL
  );
  
  CREATE TABLE "site_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"site_name" varchar DEFAULT 'Tools Hypermarket' NOT NULL,
  	"logo_id" integer,
  	"toll_free_number" varchar DEFAULT '+91 70341 27770',
  	"whatsapp_number" varchar,
  	"payment_methods_image_id" integer,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "site_settings_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"categories_id" integer,
  	"media_id" integer
  );
  
  ALTER TABLE "categories" ADD CONSTRAINT "categories_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories" ADD CONSTRAINT "categories_banner_image_id_media_id_fk" FOREIGN KEY ("banner_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "brands" ADD CONSTRAINT "brands_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "spec_definitions" ADD CONSTRAINT "spec_definitions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_badges" ADD CONSTRAINT "products_badges_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_videos" ADD CONSTRAINT "products_videos_file_id_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_videos" ADD CONSTRAINT "products_videos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_free_accessories" ADD CONSTRAINT "products_free_accessories_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_free_accessories" ADD CONSTRAINT "products_free_accessories_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_applications_items" ADD CONSTRAINT "products_applications_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_applications_items" ADD CONSTRAINT "products_applications_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_spec_values" ADD CONSTRAINT "products_spec_values_definition_id_spec_definitions_id_fk" FOREIGN KEY ("definition_id") REFERENCES "public"."spec_definitions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_spec_values" ADD CONSTRAINT "products_spec_values_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products" ADD CONSTRAINT "products_user_manual_id_datasheets_id_fk" FOREIGN KEY ("user_manual_id") REFERENCES "public"."datasheets"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products" ADD CONSTRAINT "products_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products" ADD CONSTRAINT "products_brochure_banner_id_media_id_fk" FOREIGN KEY ("brochure_banner_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products" ADD CONSTRAINT "products_datasheet_id_datasheets_id_fk" FOREIGN KEY ("datasheet_id") REFERENCES "public"."datasheets"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "product_variants_rels" ADD CONSTRAINT "product_variants_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "product_variants_rels" ADD CONSTRAINT "product_variants_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "reviews" ADD CONSTRAINT "reviews_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "inventory" ADD CONSTRAINT "inventory_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "inventory" ADD CONSTRAINT "inventory_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_inventory_id_inventory_id_fk" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventory"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_recorded_by_id_users_id_fk" FOREIGN KEY ("recorded_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "orders_items" ADD CONSTRAINT "orders_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "orders_items" ADD CONSTRAINT "orders_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "carts" ADD CONSTRAINT "carts_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "carts" ADD CONSTRAINT "carts_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "addresses" ADD CONSTRAINT "addresses_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "auth_identities" ADD CONSTRAINT "auth_identities_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_brands_fk" FOREIGN KEY ("brands_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_spec_definitions_fk" FOREIGN KEY ("spec_definitions_id") REFERENCES "public"."spec_definitions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_product_variants_fk" FOREIGN KEY ("product_variants_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_reviews_fk" FOREIGN KEY ("reviews_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_inventory_fk" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventory"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_stock_movements_fk" FOREIGN KEY ("stock_movements_id") REFERENCES "public"."stock_movements"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_datasheets_fk" FOREIGN KEY ("datasheets_id") REFERENCES "public"."datasheets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_orders_fk" FOREIGN KEY ("orders_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_carts_fk" FOREIGN KEY ("carts_id") REFERENCES "public"."carts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_cart_items_fk" FOREIGN KEY ("cart_items_id") REFERENCES "public"."cart_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_coupons_fk" FOREIGN KEY ("coupons_id") REFERENCES "public"."coupons"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_coupon_redemptions_fk" FOREIGN KEY ("coupon_redemptions_id") REFERENCES "public"."coupon_redemptions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_newsletter_subscribers_fk" FOREIGN KEY ("newsletter_subscribers_id") REFERENCES "public"."newsletter_subscribers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_search_synonyms_fk" FOREIGN KEY ("search_synonyms_id") REFERENCES "public"."search_synonyms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_customers_fk" FOREIGN KEY ("customers_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_addresses_fk" FOREIGN KEY ("addresses_id") REFERENCES "public"."addresses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_wishlist_items_fk" FOREIGN KEY ("wishlist_items_id") REFERENCES "public"."wishlist_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_auth_identities_fk" FOREIGN KEY ("auth_identities_id") REFERENCES "public"."auth_identities"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_otp_challenges_fk" FOREIGN KEY ("otp_challenges_id") REFERENCES "public"."otp_challenges"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_page_blocks_hero_carousel_slides" ADD CONSTRAINT "home_page_blocks_hero_carousel_slides_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "home_page_blocks_hero_carousel_slides" ADD CONSTRAINT "home_page_blocks_hero_carousel_slides_mobile_image_id_media_id_fk" FOREIGN KEY ("mobile_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "home_page_blocks_hero_carousel_slides" ADD CONSTRAINT "home_page_blocks_hero_carousel_slides_link_category_id_categories_id_fk" FOREIGN KEY ("link_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "home_page_blocks_hero_carousel_slides" ADD CONSTRAINT "home_page_blocks_hero_carousel_slides_link_product_id_products_id_fk" FOREIGN KEY ("link_product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "home_page_blocks_hero_carousel_slides" ADD CONSTRAINT "home_page_blocks_hero_carousel_slides_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."home_page_blocks_hero_carousel"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_page_blocks_hero_carousel" ADD CONSTRAINT "home_page_blocks_hero_carousel_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."home_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_page_blocks_banner_row_banners" ADD CONSTRAINT "home_page_blocks_banner_row_banners_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "home_page_blocks_banner_row_banners" ADD CONSTRAINT "home_page_blocks_banner_row_banners_mobile_image_id_media_id_fk" FOREIGN KEY ("mobile_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "home_page_blocks_banner_row_banners" ADD CONSTRAINT "home_page_blocks_banner_row_banners_link_category_id_categories_id_fk" FOREIGN KEY ("link_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "home_page_blocks_banner_row_banners" ADD CONSTRAINT "home_page_blocks_banner_row_banners_link_product_id_products_id_fk" FOREIGN KEY ("link_product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "home_page_blocks_banner_row_banners" ADD CONSTRAINT "home_page_blocks_banner_row_banners_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."home_page_blocks_banner_row"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_page_blocks_banner_row" ADD CONSTRAINT "home_page_blocks_banner_row_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."home_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_page_blocks_wide_banner" ADD CONSTRAINT "home_page_blocks_wide_banner_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "home_page_blocks_wide_banner" ADD CONSTRAINT "home_page_blocks_wide_banner_mobile_image_id_media_id_fk" FOREIGN KEY ("mobile_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "home_page_blocks_wide_banner" ADD CONSTRAINT "home_page_blocks_wide_banner_link_category_id_categories_id_fk" FOREIGN KEY ("link_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "home_page_blocks_wide_banner" ADD CONSTRAINT "home_page_blocks_wide_banner_link_product_id_products_id_fk" FOREIGN KEY ("link_product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "home_page_blocks_wide_banner" ADD CONSTRAINT "home_page_blocks_wide_banner_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."home_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_page_blocks_product_carousel" ADD CONSTRAINT "home_page_blocks_product_carousel_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "home_page_blocks_product_carousel" ADD CONSTRAINT "home_page_blocks_product_carousel_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."home_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_page_blocks_category_grid_tiles" ADD CONSTRAINT "home_page_blocks_category_grid_tiles_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "home_page_blocks_category_grid_tiles" ADD CONSTRAINT "home_page_blocks_category_grid_tiles_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "home_page_blocks_category_grid_tiles" ADD CONSTRAINT "home_page_blocks_category_grid_tiles_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."home_page_blocks_category_grid"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_page_blocks_category_grid" ADD CONSTRAINT "home_page_blocks_category_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."home_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_page_blocks_collection_showcase" ADD CONSTRAINT "home_page_blocks_collection_showcase_feature_image_id_media_id_fk" FOREIGN KEY ("feature_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "home_page_blocks_collection_showcase" ADD CONSTRAINT "home_page_blocks_collection_showcase_button_link_category_id_categories_id_fk" FOREIGN KEY ("button_link_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "home_page_blocks_collection_showcase" ADD CONSTRAINT "home_page_blocks_collection_showcase_button_link_product_id_products_id_fk" FOREIGN KEY ("button_link_product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "home_page_blocks_collection_showcase" ADD CONSTRAINT "home_page_blocks_collection_showcase_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."home_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_page_blocks_catalogue_banner" ADD CONSTRAINT "home_page_blocks_catalogue_banner_file_id_datasheets_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."datasheets"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "home_page_blocks_catalogue_banner" ADD CONSTRAINT "home_page_blocks_catalogue_banner_button_link_category_id_categories_id_fk" FOREIGN KEY ("button_link_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "home_page_blocks_catalogue_banner" ADD CONSTRAINT "home_page_blocks_catalogue_banner_button_link_product_id_products_id_fk" FOREIGN KEY ("button_link_product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "home_page_blocks_catalogue_banner" ADD CONSTRAINT "home_page_blocks_catalogue_banner_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "home_page_blocks_catalogue_banner" ADD CONSTRAINT "home_page_blocks_catalogue_banner_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."home_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_page_blocks_value_props_items" ADD CONSTRAINT "home_page_blocks_value_props_items_icon_id_media_id_fk" FOREIGN KEY ("icon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "home_page_blocks_value_props_items" ADD CONSTRAINT "home_page_blocks_value_props_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."home_page_blocks_value_props"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_page_blocks_value_props" ADD CONSTRAINT "home_page_blocks_value_props_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."home_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_page_blocks_app_promo" ADD CONSTRAINT "home_page_blocks_app_promo_screenshot_id_media_id_fk" FOREIGN KEY ("screenshot_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "home_page_blocks_app_promo" ADD CONSTRAINT "home_page_blocks_app_promo_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."home_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_page_blocks_trusted_brands" ADD CONSTRAINT "home_page_blocks_trusted_brands_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."home_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_page_blocks_newsletter" ADD CONSTRAINT "home_page_blocks_newsletter_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."home_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_page_rels" ADD CONSTRAINT "home_page_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."home_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_page_rels" ADD CONSTRAINT "home_page_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_page_rels" ADD CONSTRAINT "home_page_rels_brands_fk" FOREIGN KEY ("brands_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_home_page_v_blocks_hero_carousel_slides" ADD CONSTRAINT "_home_page_v_blocks_hero_carousel_slides_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_home_page_v_blocks_hero_carousel_slides" ADD CONSTRAINT "_home_page_v_blocks_hero_carousel_slides_mobile_image_id_media_id_fk" FOREIGN KEY ("mobile_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_home_page_v_blocks_hero_carousel_slides" ADD CONSTRAINT "_home_page_v_blocks_hero_carousel_slides_link_category_id_categories_id_fk" FOREIGN KEY ("link_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_home_page_v_blocks_hero_carousel_slides" ADD CONSTRAINT "_home_page_v_blocks_hero_carousel_slides_link_product_id_products_id_fk" FOREIGN KEY ("link_product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_home_page_v_blocks_hero_carousel_slides" ADD CONSTRAINT "_home_page_v_blocks_hero_carousel_slides_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_home_page_v_blocks_hero_carousel"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_home_page_v_blocks_hero_carousel" ADD CONSTRAINT "_home_page_v_blocks_hero_carousel_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_home_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_home_page_v_blocks_banner_row_banners" ADD CONSTRAINT "_home_page_v_blocks_banner_row_banners_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_home_page_v_blocks_banner_row_banners" ADD CONSTRAINT "_home_page_v_blocks_banner_row_banners_mobile_image_id_media_id_fk" FOREIGN KEY ("mobile_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_home_page_v_blocks_banner_row_banners" ADD CONSTRAINT "_home_page_v_blocks_banner_row_banners_link_category_id_categories_id_fk" FOREIGN KEY ("link_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_home_page_v_blocks_banner_row_banners" ADD CONSTRAINT "_home_page_v_blocks_banner_row_banners_link_product_id_products_id_fk" FOREIGN KEY ("link_product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_home_page_v_blocks_banner_row_banners" ADD CONSTRAINT "_home_page_v_blocks_banner_row_banners_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_home_page_v_blocks_banner_row"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_home_page_v_blocks_banner_row" ADD CONSTRAINT "_home_page_v_blocks_banner_row_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_home_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_home_page_v_blocks_wide_banner" ADD CONSTRAINT "_home_page_v_blocks_wide_banner_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_home_page_v_blocks_wide_banner" ADD CONSTRAINT "_home_page_v_blocks_wide_banner_mobile_image_id_media_id_fk" FOREIGN KEY ("mobile_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_home_page_v_blocks_wide_banner" ADD CONSTRAINT "_home_page_v_blocks_wide_banner_link_category_id_categories_id_fk" FOREIGN KEY ("link_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_home_page_v_blocks_wide_banner" ADD CONSTRAINT "_home_page_v_blocks_wide_banner_link_product_id_products_id_fk" FOREIGN KEY ("link_product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_home_page_v_blocks_wide_banner" ADD CONSTRAINT "_home_page_v_blocks_wide_banner_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_home_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_home_page_v_blocks_product_carousel" ADD CONSTRAINT "_home_page_v_blocks_product_carousel_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_home_page_v_blocks_product_carousel" ADD CONSTRAINT "_home_page_v_blocks_product_carousel_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_home_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_home_page_v_blocks_category_grid_tiles" ADD CONSTRAINT "_home_page_v_blocks_category_grid_tiles_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_home_page_v_blocks_category_grid_tiles" ADD CONSTRAINT "_home_page_v_blocks_category_grid_tiles_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_home_page_v_blocks_category_grid_tiles" ADD CONSTRAINT "_home_page_v_blocks_category_grid_tiles_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_home_page_v_blocks_category_grid"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_home_page_v_blocks_category_grid" ADD CONSTRAINT "_home_page_v_blocks_category_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_home_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_home_page_v_blocks_collection_showcase" ADD CONSTRAINT "_home_page_v_blocks_collection_showcase_feature_image_id_media_id_fk" FOREIGN KEY ("feature_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_home_page_v_blocks_collection_showcase" ADD CONSTRAINT "_home_page_v_blocks_collection_showcase_button_link_category_id_categories_id_fk" FOREIGN KEY ("button_link_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_home_page_v_blocks_collection_showcase" ADD CONSTRAINT "_home_page_v_blocks_collection_showcase_button_link_product_id_products_id_fk" FOREIGN KEY ("button_link_product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_home_page_v_blocks_collection_showcase" ADD CONSTRAINT "_home_page_v_blocks_collection_showcase_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_home_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_home_page_v_blocks_catalogue_banner" ADD CONSTRAINT "_home_page_v_blocks_catalogue_banner_file_id_datasheets_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."datasheets"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_home_page_v_blocks_catalogue_banner" ADD CONSTRAINT "_home_page_v_blocks_catalogue_banner_button_link_category_id_categories_id_fk" FOREIGN KEY ("button_link_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_home_page_v_blocks_catalogue_banner" ADD CONSTRAINT "_home_page_v_blocks_catalogue_banner_button_link_product_id_products_id_fk" FOREIGN KEY ("button_link_product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_home_page_v_blocks_catalogue_banner" ADD CONSTRAINT "_home_page_v_blocks_catalogue_banner_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_home_page_v_blocks_catalogue_banner" ADD CONSTRAINT "_home_page_v_blocks_catalogue_banner_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_home_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_home_page_v_blocks_value_props_items" ADD CONSTRAINT "_home_page_v_blocks_value_props_items_icon_id_media_id_fk" FOREIGN KEY ("icon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_home_page_v_blocks_value_props_items" ADD CONSTRAINT "_home_page_v_blocks_value_props_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_home_page_v_blocks_value_props"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_home_page_v_blocks_value_props" ADD CONSTRAINT "_home_page_v_blocks_value_props_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_home_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_home_page_v_blocks_app_promo" ADD CONSTRAINT "_home_page_v_blocks_app_promo_screenshot_id_media_id_fk" FOREIGN KEY ("screenshot_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_home_page_v_blocks_app_promo" ADD CONSTRAINT "_home_page_v_blocks_app_promo_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_home_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_home_page_v_blocks_trusted_brands" ADD CONSTRAINT "_home_page_v_blocks_trusted_brands_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_home_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_home_page_v_blocks_newsletter" ADD CONSTRAINT "_home_page_v_blocks_newsletter_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_home_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_home_page_v_rels" ADD CONSTRAINT "_home_page_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_home_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_home_page_v_rels" ADD CONSTRAINT "_home_page_v_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_home_page_v_rels" ADD CONSTRAINT "_home_page_v_rels_brands_fk" FOREIGN KEY ("brands_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_offers" ADD CONSTRAINT "site_settings_offers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_utility_links" ADD CONSTRAINT "site_settings_utility_links_file_id_datasheets_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."datasheets"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings_utility_links" ADD CONSTRAINT "site_settings_utility_links_link_category_id_categories_id_fk" FOREIGN KEY ("link_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings_utility_links" ADD CONSTRAINT "site_settings_utility_links_link_product_id_products_id_fk" FOREIGN KEY ("link_product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings_utility_links" ADD CONSTRAINT "site_settings_utility_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_top_moving_products" ADD CONSTRAINT "site_settings_top_moving_products_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings_top_moving_products" ADD CONSTRAINT "site_settings_top_moving_products_link_category_id_categories_id_fk" FOREIGN KEY ("link_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings_top_moving_products" ADD CONSTRAINT "site_settings_top_moving_products_link_product_id_products_id_fk" FOREIGN KEY ("link_product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings_top_moving_products" ADD CONSTRAINT "site_settings_top_moving_products_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_footer_columns_links" ADD CONSTRAINT "site_settings_footer_columns_links_link_category_id_categories_id_fk" FOREIGN KEY ("link_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings_footer_columns_links" ADD CONSTRAINT "site_settings_footer_columns_links_link_product_id_products_id_fk" FOREIGN KEY ("link_product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings_footer_columns_links" ADD CONSTRAINT "site_settings_footer_columns_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings_footer_columns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_footer_columns" ADD CONSTRAINT "site_settings_footer_columns_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_social_links" ADD CONSTRAINT "site_settings_social_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_payment_methods_image_id_media_id_fk" FOREIGN KEY ("payment_methods_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings_rels" ADD CONSTRAINT "site_settings_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_rels" ADD CONSTRAINT "site_settings_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_rels" ADD CONSTRAINT "site_settings_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "categories_slug_idx" ON "categories" USING btree ("slug");
  CREATE INDEX "categories_image_idx" ON "categories" USING btree ("image_id");
  CREATE INDEX "categories_banner_image_idx" ON "categories" USING btree ("banner_image_id");
  CREATE INDEX "categories_parent_idx" ON "categories" USING btree ("parent_id");
  CREATE INDEX "categories_updated_at_idx" ON "categories" USING btree ("updated_at");
  CREATE INDEX "categories_created_at_idx" ON "categories" USING btree ("created_at");
  CREATE UNIQUE INDEX "brands_name_idx" ON "brands" USING btree ("name");
  CREATE UNIQUE INDEX "brands_slug_idx" ON "brands" USING btree ("slug");
  CREATE INDEX "brands_logo_idx" ON "brands" USING btree ("logo_id");
  CREATE INDEX "brands_updated_at_idx" ON "brands" USING btree ("updated_at");
  CREATE INDEX "brands_created_at_idx" ON "brands" USING btree ("created_at");
  CREATE UNIQUE INDEX "spec_definitions_key_idx" ON "spec_definitions" USING btree ("key");
  CREATE INDEX "spec_definitions_category_idx" ON "spec_definitions" USING btree ("category_id");
  CREATE INDEX "spec_definitions_updated_at_idx" ON "spec_definitions" USING btree ("updated_at");
  CREATE INDEX "spec_definitions_created_at_idx" ON "spec_definitions" USING btree ("created_at");
  CREATE INDEX "products_badges_order_idx" ON "products_badges" USING btree ("order");
  CREATE INDEX "products_badges_parent_idx" ON "products_badges" USING btree ("parent_id");
  CREATE INDEX "products_videos_order_idx" ON "products_videos" USING btree ("_order");
  CREATE INDEX "products_videos_parent_id_idx" ON "products_videos" USING btree ("_parent_id");
  CREATE INDEX "products_videos_file_idx" ON "products_videos" USING btree ("file_id");
  CREATE INDEX "products_free_accessories_order_idx" ON "products_free_accessories" USING btree ("_order");
  CREATE INDEX "products_free_accessories_parent_id_idx" ON "products_free_accessories" USING btree ("_parent_id");
  CREATE INDEX "products_free_accessories_image_idx" ON "products_free_accessories" USING btree ("image_id");
  CREATE INDEX "products_applications_items_order_idx" ON "products_applications_items" USING btree ("_order");
  CREATE INDEX "products_applications_items_parent_id_idx" ON "products_applications_items" USING btree ("_parent_id");
  CREATE INDEX "products_applications_items_image_idx" ON "products_applications_items" USING btree ("image_id");
  CREATE INDEX "products_spec_values_order_idx" ON "products_spec_values" USING btree ("_order");
  CREATE INDEX "products_spec_values_parent_id_idx" ON "products_spec_values" USING btree ("_parent_id");
  CREATE INDEX "products_spec_values_definition_idx" ON "products_spec_values" USING btree ("definition_id");
  CREATE INDEX "products_name_idx" ON "products" USING btree ("name");
  CREATE UNIQUE INDEX "products_slug_idx" ON "products" USING btree ("slug");
  CREATE INDEX "products_status_idx" ON "products" USING btree ("status");
  CREATE INDEX "products_user_manual_idx" ON "products" USING btree ("user_manual_id");
  CREATE INDEX "products_category_idx" ON "products" USING btree ("category_id");
  CREATE INDEX "products_brand_idx" ON "products" USING btree ("brand_id");
  CREATE INDEX "products_brochure_banner_idx" ON "products" USING btree ("brochure_banner_id");
  CREATE INDEX "products_datasheet_idx" ON "products" USING btree ("datasheet_id");
  CREATE INDEX "products_updated_at_idx" ON "products" USING btree ("updated_at");
  CREATE INDEX "products_created_at_idx" ON "products" USING btree ("created_at");
  CREATE INDEX "products_search_vector_idx" ON "products" USING gin ("search_vector");
  CREATE INDEX "products_search_a_trgm_idx" ON "products" USING gin (search_a gin_trgm_ops);
  CREATE INDEX "products_rels_order_idx" ON "products_rels" USING btree ("order");
  CREATE INDEX "products_rels_parent_idx" ON "products_rels" USING btree ("parent_id");
  CREATE INDEX "products_rels_path_idx" ON "products_rels" USING btree ("path");
  CREATE INDEX "products_rels_media_id_idx" ON "products_rels" USING btree ("media_id");
  CREATE INDEX "products_rels_products_id_idx" ON "products_rels" USING btree ("products_id");
  CREATE INDEX "product_variants_product_idx" ON "product_variants" USING btree ("product_id");
  CREATE UNIQUE INDEX "product_variants_sku_idx" ON "product_variants" USING btree ("sku");
  CREATE INDEX "product_variants_updated_at_idx" ON "product_variants" USING btree ("updated_at");
  CREATE INDEX "product_variants_created_at_idx" ON "product_variants" USING btree ("created_at");
  CREATE INDEX "product_variants_rels_order_idx" ON "product_variants_rels" USING btree ("order");
  CREATE INDEX "product_variants_rels_parent_idx" ON "product_variants_rels" USING btree ("parent_id");
  CREATE INDEX "product_variants_rels_path_idx" ON "product_variants_rels" USING btree ("path");
  CREATE INDEX "product_variants_rels_media_id_idx" ON "product_variants_rels" USING btree ("media_id");
  CREATE INDEX "reviews_product_idx" ON "reviews" USING btree ("product_id");
  CREATE INDEX "reviews_status_idx" ON "reviews" USING btree ("status");
  CREATE INDEX "reviews_updated_at_idx" ON "reviews" USING btree ("updated_at");
  CREATE INDEX "reviews_created_at_idx" ON "reviews" USING btree ("created_at");
  CREATE UNIQUE INDEX "inventory_variant_idx" ON "inventory" USING btree ("variant_id");
  CREATE INDEX "inventory_product_idx" ON "inventory" USING btree ("product_id");
  CREATE INDEX "inventory_sku_idx" ON "inventory" USING btree ("sku");
  CREATE INDEX "inventory_stock_status_idx" ON "inventory" USING btree ("stock_status");
  CREATE INDEX "inventory_updated_at_idx" ON "inventory" USING btree ("updated_at");
  CREATE INDEX "inventory_created_at_idx" ON "inventory" USING btree ("created_at");
  CREATE INDEX "stock_movements_variant_idx" ON "stock_movements" USING btree ("variant_id");
  CREATE INDEX "stock_movements_type_idx" ON "stock_movements" USING btree ("type");
  CREATE INDEX "stock_movements_order_idx" ON "stock_movements" USING btree ("order_id");
  CREATE INDEX "stock_movements_inventory_idx" ON "stock_movements" USING btree ("inventory_id");
  CREATE INDEX "stock_movements_recorded_by_idx" ON "stock_movements" USING btree ("recorded_by_id");
  CREATE INDEX "stock_movements_updated_at_idx" ON "stock_movements" USING btree ("updated_at");
  CREATE INDEX "stock_movements_created_at_idx" ON "stock_movements" USING btree ("created_at");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "media_sizes_thumbnail_sizes_thumbnail_filename_idx" ON "media" USING btree ("sizes_thumbnail_filename");
  CREATE INDEX "media_sizes_card_sizes_card_filename_idx" ON "media" USING btree ("sizes_card_filename");
  CREATE INDEX "media_sizes_hero_sizes_hero_filename_idx" ON "media" USING btree ("sizes_hero_filename");
  CREATE INDEX "datasheets_updated_at_idx" ON "datasheets" USING btree ("updated_at");
  CREATE INDEX "datasheets_created_at_idx" ON "datasheets" USING btree ("created_at");
  CREATE UNIQUE INDEX "datasheets_filename_idx" ON "datasheets" USING btree ("filename");
  CREATE INDEX "orders_items_order_idx" ON "orders_items" USING btree ("_order");
  CREATE INDEX "orders_items_parent_id_idx" ON "orders_items" USING btree ("_parent_id");
  CREATE INDEX "orders_items_product_idx" ON "orders_items" USING btree ("product_id");
  CREATE UNIQUE INDEX "orders_order_number_idx" ON "orders" USING btree ("order_number");
  CREATE UNIQUE INDEX "orders_invoice_number_idx" ON "orders" USING btree ("invoice_number");
  CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");
  CREATE INDEX "orders_placed_at_idx" ON "orders" USING btree ("placed_at");
  CREATE INDEX "orders_customer_idx" ON "orders" USING btree ("customer_id");
  CREATE INDEX "orders_updated_at_idx" ON "orders" USING btree ("updated_at");
  CREATE INDEX "orders_created_at_idx" ON "orders" USING btree ("created_at");
  CREATE INDEX "carts_customer_idx" ON "carts" USING btree ("customer_id");
  CREATE UNIQUE INDEX "carts_token_idx" ON "carts" USING btree ("token");
  CREATE INDEX "carts_status_idx" ON "carts" USING btree ("status");
  CREATE INDEX "carts_coupon_idx" ON "carts" USING btree ("coupon_id");
  CREATE INDEX "carts_last_activity_at_idx" ON "carts" USING btree ("last_activity_at");
  CREATE INDEX "carts_abandoned_at_idx" ON "carts" USING btree ("abandoned_at");
  CREATE INDEX "carts_updated_at_idx" ON "carts" USING btree ("updated_at");
  CREATE INDEX "carts_created_at_idx" ON "carts" USING btree ("created_at");
  CREATE INDEX "cart_items_cart_idx" ON "cart_items" USING btree ("cart_id");
  CREATE INDEX "cart_items_variant_idx" ON "cart_items" USING btree ("variant_id");
  CREATE INDEX "cart_items_product_idx" ON "cart_items" USING btree ("product_id");
  CREATE INDEX "cart_items_updated_at_idx" ON "cart_items" USING btree ("updated_at");
  CREATE INDEX "cart_items_created_at_idx" ON "cart_items" USING btree ("created_at");
  CREATE UNIQUE INDEX "cart_variant_idx" ON "cart_items" USING btree ("cart_id","variant_id");
  CREATE UNIQUE INDEX "coupons_code_idx" ON "coupons" USING btree ("code");
  CREATE INDEX "coupons_updated_at_idx" ON "coupons" USING btree ("updated_at");
  CREATE INDEX "coupons_created_at_idx" ON "coupons" USING btree ("created_at");
  CREATE INDEX "coupon_redemptions_coupon_idx" ON "coupon_redemptions" USING btree ("coupon_id");
  CREATE INDEX "coupon_redemptions_order_idx" ON "coupon_redemptions" USING btree ("order_id");
  CREATE INDEX "coupon_redemptions_customer_idx" ON "coupon_redemptions" USING btree ("customer_id");
  CREATE INDEX "coupon_redemptions_updated_at_idx" ON "coupon_redemptions" USING btree ("updated_at");
  CREATE INDEX "coupon_redemptions_created_at_idx" ON "coupon_redemptions" USING btree ("created_at");
  CREATE UNIQUE INDEX "coupon_order_idx" ON "coupon_redemptions" USING btree ("coupon_id","order_id");
  CREATE UNIQUE INDEX "newsletter_subscribers_email_idx" ON "newsletter_subscribers" USING btree ("email");
  CREATE INDEX "newsletter_subscribers_updated_at_idx" ON "newsletter_subscribers" USING btree ("updated_at");
  CREATE INDEX "newsletter_subscribers_created_at_idx" ON "newsletter_subscribers" USING btree ("created_at");
  CREATE INDEX "search_synonyms_updated_at_idx" ON "search_synonyms" USING btree ("updated_at");
  CREATE INDEX "search_synonyms_created_at_idx" ON "search_synonyms" USING btree ("created_at");
  CREATE INDEX "customers_email_idx" ON "customers" USING btree ("email");
  CREATE INDEX "customers_phone_idx" ON "customers" USING btree ("phone");
  CREATE INDEX "customers_updated_at_idx" ON "customers" USING btree ("updated_at");
  CREATE INDEX "customers_created_at_idx" ON "customers" USING btree ("created_at");
  CREATE INDEX "addresses_customer_idx" ON "addresses" USING btree ("customer_id");
  CREATE INDEX "addresses_updated_at_idx" ON "addresses" USING btree ("updated_at");
  CREATE INDEX "addresses_created_at_idx" ON "addresses" USING btree ("created_at");
  CREATE INDEX "wishlist_items_customer_idx" ON "wishlist_items" USING btree ("customer_id");
  CREATE INDEX "wishlist_items_product_idx" ON "wishlist_items" USING btree ("product_id");
  CREATE INDEX "wishlist_items_updated_at_idx" ON "wishlist_items" USING btree ("updated_at");
  CREATE INDEX "wishlist_items_created_at_idx" ON "wishlist_items" USING btree ("created_at");
  CREATE UNIQUE INDEX "customer_product_idx" ON "wishlist_items" USING btree ("customer_id","product_id");
  CREATE INDEX "auth_identities_provider_account_id_idx" ON "auth_identities" USING btree ("provider_account_id");
  CREATE INDEX "auth_identities_customer_idx" ON "auth_identities" USING btree ("customer_id");
  CREATE INDEX "auth_identities_updated_at_idx" ON "auth_identities" USING btree ("updated_at");
  CREATE INDEX "auth_identities_created_at_idx" ON "auth_identities" USING btree ("created_at");
  CREATE UNIQUE INDEX "provider_providerAccountId_idx" ON "auth_identities" USING btree ("provider","provider_account_id");
  CREATE INDEX "otp_challenges_ip_hash_idx" ON "otp_challenges" USING btree ("ip_hash");
  CREATE INDEX "otp_challenges_updated_at_idx" ON "otp_challenges" USING btree ("updated_at");
  CREATE INDEX "otp_challenges_created_at_idx" ON "otp_challenges" USING btree ("created_at");
  CREATE INDEX "channel_destination_idx" ON "otp_challenges" USING btree ("channel","destination");
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_categories_id_idx" ON "payload_locked_documents_rels" USING btree ("categories_id");
  CREATE INDEX "payload_locked_documents_rels_brands_id_idx" ON "payload_locked_documents_rels" USING btree ("brands_id");
  CREATE INDEX "payload_locked_documents_rels_spec_definitions_id_idx" ON "payload_locked_documents_rels" USING btree ("spec_definitions_id");
  CREATE INDEX "payload_locked_documents_rels_products_id_idx" ON "payload_locked_documents_rels" USING btree ("products_id");
  CREATE INDEX "payload_locked_documents_rels_product_variants_id_idx" ON "payload_locked_documents_rels" USING btree ("product_variants_id");
  CREATE INDEX "payload_locked_documents_rels_reviews_id_idx" ON "payload_locked_documents_rels" USING btree ("reviews_id");
  CREATE INDEX "payload_locked_documents_rels_inventory_id_idx" ON "payload_locked_documents_rels" USING btree ("inventory_id");
  CREATE INDEX "payload_locked_documents_rels_stock_movements_id_idx" ON "payload_locked_documents_rels" USING btree ("stock_movements_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_datasheets_id_idx" ON "payload_locked_documents_rels" USING btree ("datasheets_id");
  CREATE INDEX "payload_locked_documents_rels_orders_id_idx" ON "payload_locked_documents_rels" USING btree ("orders_id");
  CREATE INDEX "payload_locked_documents_rels_carts_id_idx" ON "payload_locked_documents_rels" USING btree ("carts_id");
  CREATE INDEX "payload_locked_documents_rels_cart_items_id_idx" ON "payload_locked_documents_rels" USING btree ("cart_items_id");
  CREATE INDEX "payload_locked_documents_rels_coupons_id_idx" ON "payload_locked_documents_rels" USING btree ("coupons_id");
  CREATE INDEX "payload_locked_documents_rels_coupon_redemptions_id_idx" ON "payload_locked_documents_rels" USING btree ("coupon_redemptions_id");
  CREATE INDEX "payload_locked_documents_rels_newsletter_subscribers_id_idx" ON "payload_locked_documents_rels" USING btree ("newsletter_subscribers_id");
  CREATE INDEX "payload_locked_documents_rels_search_synonyms_id_idx" ON "payload_locked_documents_rels" USING btree ("search_synonyms_id");
  CREATE INDEX "payload_locked_documents_rels_customers_id_idx" ON "payload_locked_documents_rels" USING btree ("customers_id");
  CREATE INDEX "payload_locked_documents_rels_addresses_id_idx" ON "payload_locked_documents_rels" USING btree ("addresses_id");
  CREATE INDEX "payload_locked_documents_rels_wishlist_items_id_idx" ON "payload_locked_documents_rels" USING btree ("wishlist_items_id");
  CREATE INDEX "payload_locked_documents_rels_auth_identities_id_idx" ON "payload_locked_documents_rels" USING btree ("auth_identities_id");
  CREATE INDEX "payload_locked_documents_rels_otp_challenges_id_idx" ON "payload_locked_documents_rels" USING btree ("otp_challenges_id");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");
  CREATE INDEX "home_page_blocks_hero_carousel_slides_order_idx" ON "home_page_blocks_hero_carousel_slides" USING btree ("_order");
  CREATE INDEX "home_page_blocks_hero_carousel_slides_parent_id_idx" ON "home_page_blocks_hero_carousel_slides" USING btree ("_parent_id");
  CREATE INDEX "home_page_blocks_hero_carousel_slides_image_idx" ON "home_page_blocks_hero_carousel_slides" USING btree ("image_id");
  CREATE INDEX "home_page_blocks_hero_carousel_slides_mobile_image_idx" ON "home_page_blocks_hero_carousel_slides" USING btree ("mobile_image_id");
  CREATE INDEX "home_page_blocks_hero_carousel_slides_link_link_category_idx" ON "home_page_blocks_hero_carousel_slides" USING btree ("link_category_id");
  CREATE INDEX "home_page_blocks_hero_carousel_slides_link_link_product_idx" ON "home_page_blocks_hero_carousel_slides" USING btree ("link_product_id");
  CREATE INDEX "home_page_blocks_hero_carousel_order_idx" ON "home_page_blocks_hero_carousel" USING btree ("_order");
  CREATE INDEX "home_page_blocks_hero_carousel_parent_id_idx" ON "home_page_blocks_hero_carousel" USING btree ("_parent_id");
  CREATE INDEX "home_page_blocks_hero_carousel_path_idx" ON "home_page_blocks_hero_carousel" USING btree ("_path");
  CREATE INDEX "home_page_blocks_banner_row_banners_order_idx" ON "home_page_blocks_banner_row_banners" USING btree ("_order");
  CREATE INDEX "home_page_blocks_banner_row_banners_parent_id_idx" ON "home_page_blocks_banner_row_banners" USING btree ("_parent_id");
  CREATE INDEX "home_page_blocks_banner_row_banners_image_idx" ON "home_page_blocks_banner_row_banners" USING btree ("image_id");
  CREATE INDEX "home_page_blocks_banner_row_banners_mobile_image_idx" ON "home_page_blocks_banner_row_banners" USING btree ("mobile_image_id");
  CREATE INDEX "home_page_blocks_banner_row_banners_link_link_category_idx" ON "home_page_blocks_banner_row_banners" USING btree ("link_category_id");
  CREATE INDEX "home_page_blocks_banner_row_banners_link_link_product_idx" ON "home_page_blocks_banner_row_banners" USING btree ("link_product_id");
  CREATE INDEX "home_page_blocks_banner_row_order_idx" ON "home_page_blocks_banner_row" USING btree ("_order");
  CREATE INDEX "home_page_blocks_banner_row_parent_id_idx" ON "home_page_blocks_banner_row" USING btree ("_parent_id");
  CREATE INDEX "home_page_blocks_banner_row_path_idx" ON "home_page_blocks_banner_row" USING btree ("_path");
  CREATE INDEX "home_page_blocks_wide_banner_order_idx" ON "home_page_blocks_wide_banner" USING btree ("_order");
  CREATE INDEX "home_page_blocks_wide_banner_parent_id_idx" ON "home_page_blocks_wide_banner" USING btree ("_parent_id");
  CREATE INDEX "home_page_blocks_wide_banner_path_idx" ON "home_page_blocks_wide_banner" USING btree ("_path");
  CREATE INDEX "home_page_blocks_wide_banner_image_idx" ON "home_page_blocks_wide_banner" USING btree ("image_id");
  CREATE INDEX "home_page_blocks_wide_banner_mobile_image_idx" ON "home_page_blocks_wide_banner" USING btree ("mobile_image_id");
  CREATE INDEX "home_page_blocks_wide_banner_link_link_category_idx" ON "home_page_blocks_wide_banner" USING btree ("link_category_id");
  CREATE INDEX "home_page_blocks_wide_banner_link_link_product_idx" ON "home_page_blocks_wide_banner" USING btree ("link_product_id");
  CREATE INDEX "home_page_blocks_product_carousel_order_idx" ON "home_page_blocks_product_carousel" USING btree ("_order");
  CREATE INDEX "home_page_blocks_product_carousel_parent_id_idx" ON "home_page_blocks_product_carousel" USING btree ("_parent_id");
  CREATE INDEX "home_page_blocks_product_carousel_path_idx" ON "home_page_blocks_product_carousel" USING btree ("_path");
  CREATE INDEX "home_page_blocks_product_carousel_category_idx" ON "home_page_blocks_product_carousel" USING btree ("category_id");
  CREATE INDEX "home_page_blocks_category_grid_tiles_order_idx" ON "home_page_blocks_category_grid_tiles" USING btree ("_order");
  CREATE INDEX "home_page_blocks_category_grid_tiles_parent_id_idx" ON "home_page_blocks_category_grid_tiles" USING btree ("_parent_id");
  CREATE INDEX "home_page_blocks_category_grid_tiles_category_idx" ON "home_page_blocks_category_grid_tiles" USING btree ("category_id");
  CREATE INDEX "home_page_blocks_category_grid_tiles_image_idx" ON "home_page_blocks_category_grid_tiles" USING btree ("image_id");
  CREATE INDEX "home_page_blocks_category_grid_order_idx" ON "home_page_blocks_category_grid" USING btree ("_order");
  CREATE INDEX "home_page_blocks_category_grid_parent_id_idx" ON "home_page_blocks_category_grid" USING btree ("_parent_id");
  CREATE INDEX "home_page_blocks_category_grid_path_idx" ON "home_page_blocks_category_grid" USING btree ("_path");
  CREATE INDEX "home_page_blocks_collection_showcase_order_idx" ON "home_page_blocks_collection_showcase" USING btree ("_order");
  CREATE INDEX "home_page_blocks_collection_showcase_parent_id_idx" ON "home_page_blocks_collection_showcase" USING btree ("_parent_id");
  CREATE INDEX "home_page_blocks_collection_showcase_path_idx" ON "home_page_blocks_collection_showcase" USING btree ("_path");
  CREATE INDEX "home_page_blocks_collection_showcase_feature_image_idx" ON "home_page_blocks_collection_showcase" USING btree ("feature_image_id");
  CREATE INDEX "home_page_blocks_collection_showcase_button_link_button__idx" ON "home_page_blocks_collection_showcase" USING btree ("button_link_category_id");
  CREATE INDEX "home_page_blocks_collection_showcase_button_link_butto_1_idx" ON "home_page_blocks_collection_showcase" USING btree ("button_link_product_id");
  CREATE INDEX "home_page_blocks_catalogue_banner_order_idx" ON "home_page_blocks_catalogue_banner" USING btree ("_order");
  CREATE INDEX "home_page_blocks_catalogue_banner_parent_id_idx" ON "home_page_blocks_catalogue_banner" USING btree ("_parent_id");
  CREATE INDEX "home_page_blocks_catalogue_banner_path_idx" ON "home_page_blocks_catalogue_banner" USING btree ("_path");
  CREATE INDEX "home_page_blocks_catalogue_banner_file_idx" ON "home_page_blocks_catalogue_banner" USING btree ("file_id");
  CREATE INDEX "home_page_blocks_catalogue_banner_button_link_button_lin_idx" ON "home_page_blocks_catalogue_banner" USING btree ("button_link_category_id");
  CREATE INDEX "home_page_blocks_catalogue_banner_button_link_button_l_1_idx" ON "home_page_blocks_catalogue_banner" USING btree ("button_link_product_id");
  CREATE INDEX "home_page_blocks_catalogue_banner_image_idx" ON "home_page_blocks_catalogue_banner" USING btree ("image_id");
  CREATE INDEX "home_page_blocks_value_props_items_order_idx" ON "home_page_blocks_value_props_items" USING btree ("_order");
  CREATE INDEX "home_page_blocks_value_props_items_parent_id_idx" ON "home_page_blocks_value_props_items" USING btree ("_parent_id");
  CREATE INDEX "home_page_blocks_value_props_items_icon_idx" ON "home_page_blocks_value_props_items" USING btree ("icon_id");
  CREATE INDEX "home_page_blocks_value_props_order_idx" ON "home_page_blocks_value_props" USING btree ("_order");
  CREATE INDEX "home_page_blocks_value_props_parent_id_idx" ON "home_page_blocks_value_props" USING btree ("_parent_id");
  CREATE INDEX "home_page_blocks_value_props_path_idx" ON "home_page_blocks_value_props" USING btree ("_path");
  CREATE INDEX "home_page_blocks_app_promo_order_idx" ON "home_page_blocks_app_promo" USING btree ("_order");
  CREATE INDEX "home_page_blocks_app_promo_parent_id_idx" ON "home_page_blocks_app_promo" USING btree ("_parent_id");
  CREATE INDEX "home_page_blocks_app_promo_path_idx" ON "home_page_blocks_app_promo" USING btree ("_path");
  CREATE INDEX "home_page_blocks_app_promo_screenshot_idx" ON "home_page_blocks_app_promo" USING btree ("screenshot_id");
  CREATE INDEX "home_page_blocks_trusted_brands_order_idx" ON "home_page_blocks_trusted_brands" USING btree ("_order");
  CREATE INDEX "home_page_blocks_trusted_brands_parent_id_idx" ON "home_page_blocks_trusted_brands" USING btree ("_parent_id");
  CREATE INDEX "home_page_blocks_trusted_brands_path_idx" ON "home_page_blocks_trusted_brands" USING btree ("_path");
  CREATE INDEX "home_page_blocks_newsletter_order_idx" ON "home_page_blocks_newsletter" USING btree ("_order");
  CREATE INDEX "home_page_blocks_newsletter_parent_id_idx" ON "home_page_blocks_newsletter" USING btree ("_parent_id");
  CREATE INDEX "home_page_blocks_newsletter_path_idx" ON "home_page_blocks_newsletter" USING btree ("_path");
  CREATE INDEX "home_page__status_idx" ON "home_page" USING btree ("_status");
  CREATE INDEX "home_page_rels_order_idx" ON "home_page_rels" USING btree ("order");
  CREATE INDEX "home_page_rels_parent_idx" ON "home_page_rels" USING btree ("parent_id");
  CREATE INDEX "home_page_rels_path_idx" ON "home_page_rels" USING btree ("path");
  CREATE INDEX "home_page_rels_products_id_idx" ON "home_page_rels" USING btree ("products_id");
  CREATE INDEX "home_page_rels_brands_id_idx" ON "home_page_rels" USING btree ("brands_id");
  CREATE INDEX "_home_page_v_blocks_hero_carousel_slides_order_idx" ON "_home_page_v_blocks_hero_carousel_slides" USING btree ("_order");
  CREATE INDEX "_home_page_v_blocks_hero_carousel_slides_parent_id_idx" ON "_home_page_v_blocks_hero_carousel_slides" USING btree ("_parent_id");
  CREATE INDEX "_home_page_v_blocks_hero_carousel_slides_image_idx" ON "_home_page_v_blocks_hero_carousel_slides" USING btree ("image_id");
  CREATE INDEX "_home_page_v_blocks_hero_carousel_slides_mobile_image_idx" ON "_home_page_v_blocks_hero_carousel_slides" USING btree ("mobile_image_id");
  CREATE INDEX "_home_page_v_blocks_hero_carousel_slides_link_link_categ_idx" ON "_home_page_v_blocks_hero_carousel_slides" USING btree ("link_category_id");
  CREATE INDEX "_home_page_v_blocks_hero_carousel_slides_link_link_produ_idx" ON "_home_page_v_blocks_hero_carousel_slides" USING btree ("link_product_id");
  CREATE INDEX "_home_page_v_blocks_hero_carousel_order_idx" ON "_home_page_v_blocks_hero_carousel" USING btree ("_order");
  CREATE INDEX "_home_page_v_blocks_hero_carousel_parent_id_idx" ON "_home_page_v_blocks_hero_carousel" USING btree ("_parent_id");
  CREATE INDEX "_home_page_v_blocks_hero_carousel_path_idx" ON "_home_page_v_blocks_hero_carousel" USING btree ("_path");
  CREATE INDEX "_home_page_v_blocks_banner_row_banners_order_idx" ON "_home_page_v_blocks_banner_row_banners" USING btree ("_order");
  CREATE INDEX "_home_page_v_blocks_banner_row_banners_parent_id_idx" ON "_home_page_v_blocks_banner_row_banners" USING btree ("_parent_id");
  CREATE INDEX "_home_page_v_blocks_banner_row_banners_image_idx" ON "_home_page_v_blocks_banner_row_banners" USING btree ("image_id");
  CREATE INDEX "_home_page_v_blocks_banner_row_banners_mobile_image_idx" ON "_home_page_v_blocks_banner_row_banners" USING btree ("mobile_image_id");
  CREATE INDEX "_home_page_v_blocks_banner_row_banners_link_link_categor_idx" ON "_home_page_v_blocks_banner_row_banners" USING btree ("link_category_id");
  CREATE INDEX "_home_page_v_blocks_banner_row_banners_link_link_product_idx" ON "_home_page_v_blocks_banner_row_banners" USING btree ("link_product_id");
  CREATE INDEX "_home_page_v_blocks_banner_row_order_idx" ON "_home_page_v_blocks_banner_row" USING btree ("_order");
  CREATE INDEX "_home_page_v_blocks_banner_row_parent_id_idx" ON "_home_page_v_blocks_banner_row" USING btree ("_parent_id");
  CREATE INDEX "_home_page_v_blocks_banner_row_path_idx" ON "_home_page_v_blocks_banner_row" USING btree ("_path");
  CREATE INDEX "_home_page_v_blocks_wide_banner_order_idx" ON "_home_page_v_blocks_wide_banner" USING btree ("_order");
  CREATE INDEX "_home_page_v_blocks_wide_banner_parent_id_idx" ON "_home_page_v_blocks_wide_banner" USING btree ("_parent_id");
  CREATE INDEX "_home_page_v_blocks_wide_banner_path_idx" ON "_home_page_v_blocks_wide_banner" USING btree ("_path");
  CREATE INDEX "_home_page_v_blocks_wide_banner_image_idx" ON "_home_page_v_blocks_wide_banner" USING btree ("image_id");
  CREATE INDEX "_home_page_v_blocks_wide_banner_mobile_image_idx" ON "_home_page_v_blocks_wide_banner" USING btree ("mobile_image_id");
  CREATE INDEX "_home_page_v_blocks_wide_banner_link_link_category_idx" ON "_home_page_v_blocks_wide_banner" USING btree ("link_category_id");
  CREATE INDEX "_home_page_v_blocks_wide_banner_link_link_product_idx" ON "_home_page_v_blocks_wide_banner" USING btree ("link_product_id");
  CREATE INDEX "_home_page_v_blocks_product_carousel_order_idx" ON "_home_page_v_blocks_product_carousel" USING btree ("_order");
  CREATE INDEX "_home_page_v_blocks_product_carousel_parent_id_idx" ON "_home_page_v_blocks_product_carousel" USING btree ("_parent_id");
  CREATE INDEX "_home_page_v_blocks_product_carousel_path_idx" ON "_home_page_v_blocks_product_carousel" USING btree ("_path");
  CREATE INDEX "_home_page_v_blocks_product_carousel_category_idx" ON "_home_page_v_blocks_product_carousel" USING btree ("category_id");
  CREATE INDEX "_home_page_v_blocks_category_grid_tiles_order_idx" ON "_home_page_v_blocks_category_grid_tiles" USING btree ("_order");
  CREATE INDEX "_home_page_v_blocks_category_grid_tiles_parent_id_idx" ON "_home_page_v_blocks_category_grid_tiles" USING btree ("_parent_id");
  CREATE INDEX "_home_page_v_blocks_category_grid_tiles_category_idx" ON "_home_page_v_blocks_category_grid_tiles" USING btree ("category_id");
  CREATE INDEX "_home_page_v_blocks_category_grid_tiles_image_idx" ON "_home_page_v_blocks_category_grid_tiles" USING btree ("image_id");
  CREATE INDEX "_home_page_v_blocks_category_grid_order_idx" ON "_home_page_v_blocks_category_grid" USING btree ("_order");
  CREATE INDEX "_home_page_v_blocks_category_grid_parent_id_idx" ON "_home_page_v_blocks_category_grid" USING btree ("_parent_id");
  CREATE INDEX "_home_page_v_blocks_category_grid_path_idx" ON "_home_page_v_blocks_category_grid" USING btree ("_path");
  CREATE INDEX "_home_page_v_blocks_collection_showcase_order_idx" ON "_home_page_v_blocks_collection_showcase" USING btree ("_order");
  CREATE INDEX "_home_page_v_blocks_collection_showcase_parent_id_idx" ON "_home_page_v_blocks_collection_showcase" USING btree ("_parent_id");
  CREATE INDEX "_home_page_v_blocks_collection_showcase_path_idx" ON "_home_page_v_blocks_collection_showcase" USING btree ("_path");
  CREATE INDEX "_home_page_v_blocks_collection_showcase_feature_image_idx" ON "_home_page_v_blocks_collection_showcase" USING btree ("feature_image_id");
  CREATE INDEX "_home_page_v_blocks_collection_showcase_button_link_butt_idx" ON "_home_page_v_blocks_collection_showcase" USING btree ("button_link_category_id");
  CREATE INDEX "_home_page_v_blocks_collection_showcase_button_link_bu_1_idx" ON "_home_page_v_blocks_collection_showcase" USING btree ("button_link_product_id");
  CREATE INDEX "_home_page_v_blocks_catalogue_banner_order_idx" ON "_home_page_v_blocks_catalogue_banner" USING btree ("_order");
  CREATE INDEX "_home_page_v_blocks_catalogue_banner_parent_id_idx" ON "_home_page_v_blocks_catalogue_banner" USING btree ("_parent_id");
  CREATE INDEX "_home_page_v_blocks_catalogue_banner_path_idx" ON "_home_page_v_blocks_catalogue_banner" USING btree ("_path");
  CREATE INDEX "_home_page_v_blocks_catalogue_banner_file_idx" ON "_home_page_v_blocks_catalogue_banner" USING btree ("file_id");
  CREATE INDEX "_home_page_v_blocks_catalogue_banner_button_link_button__idx" ON "_home_page_v_blocks_catalogue_banner" USING btree ("button_link_category_id");
  CREATE INDEX "_home_page_v_blocks_catalogue_banner_button_link_butto_1_idx" ON "_home_page_v_blocks_catalogue_banner" USING btree ("button_link_product_id");
  CREATE INDEX "_home_page_v_blocks_catalogue_banner_image_idx" ON "_home_page_v_blocks_catalogue_banner" USING btree ("image_id");
  CREATE INDEX "_home_page_v_blocks_value_props_items_order_idx" ON "_home_page_v_blocks_value_props_items" USING btree ("_order");
  CREATE INDEX "_home_page_v_blocks_value_props_items_parent_id_idx" ON "_home_page_v_blocks_value_props_items" USING btree ("_parent_id");
  CREATE INDEX "_home_page_v_blocks_value_props_items_icon_idx" ON "_home_page_v_blocks_value_props_items" USING btree ("icon_id");
  CREATE INDEX "_home_page_v_blocks_value_props_order_idx" ON "_home_page_v_blocks_value_props" USING btree ("_order");
  CREATE INDEX "_home_page_v_blocks_value_props_parent_id_idx" ON "_home_page_v_blocks_value_props" USING btree ("_parent_id");
  CREATE INDEX "_home_page_v_blocks_value_props_path_idx" ON "_home_page_v_blocks_value_props" USING btree ("_path");
  CREATE INDEX "_home_page_v_blocks_app_promo_order_idx" ON "_home_page_v_blocks_app_promo" USING btree ("_order");
  CREATE INDEX "_home_page_v_blocks_app_promo_parent_id_idx" ON "_home_page_v_blocks_app_promo" USING btree ("_parent_id");
  CREATE INDEX "_home_page_v_blocks_app_promo_path_idx" ON "_home_page_v_blocks_app_promo" USING btree ("_path");
  CREATE INDEX "_home_page_v_blocks_app_promo_screenshot_idx" ON "_home_page_v_blocks_app_promo" USING btree ("screenshot_id");
  CREATE INDEX "_home_page_v_blocks_trusted_brands_order_idx" ON "_home_page_v_blocks_trusted_brands" USING btree ("_order");
  CREATE INDEX "_home_page_v_blocks_trusted_brands_parent_id_idx" ON "_home_page_v_blocks_trusted_brands" USING btree ("_parent_id");
  CREATE INDEX "_home_page_v_blocks_trusted_brands_path_idx" ON "_home_page_v_blocks_trusted_brands" USING btree ("_path");
  CREATE INDEX "_home_page_v_blocks_newsletter_order_idx" ON "_home_page_v_blocks_newsletter" USING btree ("_order");
  CREATE INDEX "_home_page_v_blocks_newsletter_parent_id_idx" ON "_home_page_v_blocks_newsletter" USING btree ("_parent_id");
  CREATE INDEX "_home_page_v_blocks_newsletter_path_idx" ON "_home_page_v_blocks_newsletter" USING btree ("_path");
  CREATE INDEX "_home_page_v_version_version__status_idx" ON "_home_page_v" USING btree ("version__status");
  CREATE INDEX "_home_page_v_created_at_idx" ON "_home_page_v" USING btree ("created_at");
  CREATE INDEX "_home_page_v_updated_at_idx" ON "_home_page_v" USING btree ("updated_at");
  CREATE INDEX "_home_page_v_latest_idx" ON "_home_page_v" USING btree ("latest");
  CREATE INDEX "_home_page_v_rels_order_idx" ON "_home_page_v_rels" USING btree ("order");
  CREATE INDEX "_home_page_v_rels_parent_idx" ON "_home_page_v_rels" USING btree ("parent_id");
  CREATE INDEX "_home_page_v_rels_path_idx" ON "_home_page_v_rels" USING btree ("path");
  CREATE INDEX "_home_page_v_rels_products_id_idx" ON "_home_page_v_rels" USING btree ("products_id");
  CREATE INDEX "_home_page_v_rels_brands_id_idx" ON "_home_page_v_rels" USING btree ("brands_id");
  CREATE INDEX "site_settings_offers_order_idx" ON "site_settings_offers" USING btree ("_order");
  CREATE INDEX "site_settings_offers_parent_id_idx" ON "site_settings_offers" USING btree ("_parent_id");
  CREATE INDEX "site_settings_utility_links_order_idx" ON "site_settings_utility_links" USING btree ("_order");
  CREATE INDEX "site_settings_utility_links_parent_id_idx" ON "site_settings_utility_links" USING btree ("_parent_id");
  CREATE INDEX "site_settings_utility_links_file_idx" ON "site_settings_utility_links" USING btree ("file_id");
  CREATE INDEX "site_settings_utility_links_link_link_category_idx" ON "site_settings_utility_links" USING btree ("link_category_id");
  CREATE INDEX "site_settings_utility_links_link_link_product_idx" ON "site_settings_utility_links" USING btree ("link_product_id");
  CREATE INDEX "site_settings_top_moving_products_order_idx" ON "site_settings_top_moving_products" USING btree ("_order");
  CREATE INDEX "site_settings_top_moving_products_parent_id_idx" ON "site_settings_top_moving_products" USING btree ("_parent_id");
  CREATE INDEX "site_settings_top_moving_products_image_idx" ON "site_settings_top_moving_products" USING btree ("image_id");
  CREATE INDEX "site_settings_top_moving_products_link_link_category_idx" ON "site_settings_top_moving_products" USING btree ("link_category_id");
  CREATE INDEX "site_settings_top_moving_products_link_link_product_idx" ON "site_settings_top_moving_products" USING btree ("link_product_id");
  CREATE INDEX "site_settings_footer_columns_links_order_idx" ON "site_settings_footer_columns_links" USING btree ("_order");
  CREATE INDEX "site_settings_footer_columns_links_parent_id_idx" ON "site_settings_footer_columns_links" USING btree ("_parent_id");
  CREATE INDEX "site_settings_footer_columns_links_link_link_category_idx" ON "site_settings_footer_columns_links" USING btree ("link_category_id");
  CREATE INDEX "site_settings_footer_columns_links_link_link_product_idx" ON "site_settings_footer_columns_links" USING btree ("link_product_id");
  CREATE INDEX "site_settings_footer_columns_order_idx" ON "site_settings_footer_columns" USING btree ("_order");
  CREATE INDEX "site_settings_footer_columns_parent_id_idx" ON "site_settings_footer_columns" USING btree ("_parent_id");
  CREATE INDEX "site_settings_social_links_order_idx" ON "site_settings_social_links" USING btree ("_order");
  CREATE INDEX "site_settings_social_links_parent_id_idx" ON "site_settings_social_links" USING btree ("_parent_id");
  CREATE INDEX "site_settings_logo_idx" ON "site_settings" USING btree ("logo_id");
  CREATE INDEX "site_settings_payment_methods_image_idx" ON "site_settings" USING btree ("payment_methods_image_id");
  CREATE INDEX "site_settings_rels_order_idx" ON "site_settings_rels" USING btree ("order");
  CREATE INDEX "site_settings_rels_parent_idx" ON "site_settings_rels" USING btree ("parent_id");
  CREATE INDEX "site_settings_rels_path_idx" ON "site_settings_rels" USING btree ("path");
  CREATE INDEX "site_settings_rels_categories_id_idx" ON "site_settings_rels" USING btree ("categories_id");
  CREATE INDEX "site_settings_rels_media_id_idx" ON "site_settings_rels" USING btree ("media_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "categories" CASCADE;
  DROP TABLE "brands" CASCADE;
  DROP TABLE "spec_definitions" CASCADE;
  DROP TABLE "products_badges" CASCADE;
  DROP TABLE "products_videos" CASCADE;
  DROP TABLE "products_free_accessories" CASCADE;
  DROP TABLE "products_applications_items" CASCADE;
  DROP TABLE "products_spec_values" CASCADE;
  DROP TABLE "products" CASCADE;
  DROP TABLE "products_rels" CASCADE;
  DROP TABLE "product_variants" CASCADE;
  DROP TABLE "product_variants_rels" CASCADE;
  DROP TABLE "reviews" CASCADE;
  DROP TABLE "inventory" CASCADE;
  DROP TABLE "stock_movements" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "datasheets" CASCADE;
  DROP TABLE "orders_items" CASCADE;
  DROP TABLE "orders" CASCADE;
  DROP TABLE "carts" CASCADE;
  DROP TABLE "cart_items" CASCADE;
  DROP TABLE "coupons" CASCADE;
  DROP TABLE "coupon_redemptions" CASCADE;
  DROP TABLE "newsletter_subscribers" CASCADE;
  DROP TABLE "search_synonyms" CASCADE;
  DROP TABLE "customers" CASCADE;
  DROP TABLE "addresses" CASCADE;
  DROP TABLE "wishlist_items" CASCADE;
  DROP TABLE "auth_identities" CASCADE;
  DROP TABLE "otp_challenges" CASCADE;
  DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TABLE "home_page_blocks_hero_carousel_slides" CASCADE;
  DROP TABLE "home_page_blocks_hero_carousel" CASCADE;
  DROP TABLE "home_page_blocks_banner_row_banners" CASCADE;
  DROP TABLE "home_page_blocks_banner_row" CASCADE;
  DROP TABLE "home_page_blocks_wide_banner" CASCADE;
  DROP TABLE "home_page_blocks_product_carousel" CASCADE;
  DROP TABLE "home_page_blocks_category_grid_tiles" CASCADE;
  DROP TABLE "home_page_blocks_category_grid" CASCADE;
  DROP TABLE "home_page_blocks_collection_showcase" CASCADE;
  DROP TABLE "home_page_blocks_catalogue_banner" CASCADE;
  DROP TABLE "home_page_blocks_value_props_items" CASCADE;
  DROP TABLE "home_page_blocks_value_props" CASCADE;
  DROP TABLE "home_page_blocks_app_promo" CASCADE;
  DROP TABLE "home_page_blocks_trusted_brands" CASCADE;
  DROP TABLE "home_page_blocks_newsletter" CASCADE;
  DROP TABLE "home_page" CASCADE;
  DROP TABLE "home_page_rels" CASCADE;
  DROP TABLE "_home_page_v_blocks_hero_carousel_slides" CASCADE;
  DROP TABLE "_home_page_v_blocks_hero_carousel" CASCADE;
  DROP TABLE "_home_page_v_blocks_banner_row_banners" CASCADE;
  DROP TABLE "_home_page_v_blocks_banner_row" CASCADE;
  DROP TABLE "_home_page_v_blocks_wide_banner" CASCADE;
  DROP TABLE "_home_page_v_blocks_product_carousel" CASCADE;
  DROP TABLE "_home_page_v_blocks_category_grid_tiles" CASCADE;
  DROP TABLE "_home_page_v_blocks_category_grid" CASCADE;
  DROP TABLE "_home_page_v_blocks_collection_showcase" CASCADE;
  DROP TABLE "_home_page_v_blocks_catalogue_banner" CASCADE;
  DROP TABLE "_home_page_v_blocks_value_props_items" CASCADE;
  DROP TABLE "_home_page_v_blocks_value_props" CASCADE;
  DROP TABLE "_home_page_v_blocks_app_promo" CASCADE;
  DROP TABLE "_home_page_v_blocks_trusted_brands" CASCADE;
  DROP TABLE "_home_page_v_blocks_newsletter" CASCADE;
  DROP TABLE "_home_page_v" CASCADE;
  DROP TABLE "_home_page_v_rels" CASCADE;
  DROP TABLE "site_settings_offers" CASCADE;
  DROP TABLE "site_settings_utility_links" CASCADE;
  DROP TABLE "site_settings_top_moving_products" CASCADE;
  DROP TABLE "site_settings_footer_columns_links" CASCADE;
  DROP TABLE "site_settings_footer_columns" CASCADE;
  DROP TABLE "site_settings_social_links" CASCADE;
  DROP TABLE "site_settings" CASCADE;
  DROP TABLE "site_settings_rels" CASCADE;
  DROP TYPE "public"."enum_spec_definitions_type";
  DROP TYPE "public"."enum_products_badges";
  DROP TYPE "public"."enum_products_videos_source";
  DROP TYPE "public"."enum_products_status";
  DROP TYPE "public"."enum_product_variants_power_source";
  DROP TYPE "public"."enum_product_variants_pack_type";
  DROP TYPE "public"."enum_reviews_status";
  DROP TYPE "public"."enum_inventory_stock_status";
  DROP TYPE "public"."enum_stock_movements_type";
  DROP TYPE "public"."enum_orders_status";
  DROP TYPE "public"."enum_carts_status";
  DROP TYPE "public"."enum_coupons_type";
  DROP TYPE "public"."enum_newsletter_subscribers_status";
  DROP TYPE "public"."enum_customers_status";
  DROP TYPE "public"."enum_addresses_state_code";
  DROP TYPE "public"."enum_addresses_type";
  DROP TYPE "public"."enum_auth_identities_provider";
  DROP TYPE "public"."enum_otp_challenges_channel";
  DROP TYPE "public"."enum_users_role";
  DROP TYPE "public"."enum_home_page_blocks_hero_carousel_slides_link_lnk";
  DROP TYPE "public"."enum_home_page_blocks_hero_carousel_slides_overlay_btn";
  DROP TYPE "public"."enum_home_page_blocks_hero_carousel_slides_overlay_pos";
  DROP TYPE "public"."enum_home_page_blocks_hero_carousel_slides_overlay_tone";
  DROP TYPE "public"."enum_home_page_blocks_banner_row_banners_link_lnk";
  DROP TYPE "public"."enum_home_page_blocks_banner_row_banners_overlay_btn";
  DROP TYPE "public"."enum_home_page_blocks_banner_row_banners_overlay_pos";
  DROP TYPE "public"."enum_home_page_blocks_banner_row_banners_overlay_tone";
  DROP TYPE "public"."enum_home_page_blocks_wide_banner_shape";
  DROP TYPE "public"."enum_home_page_blocks_wide_banner_link_lnk";
  DROP TYPE "public"."enum_home_page_blocks_wide_banner_overlay_btn";
  DROP TYPE "public"."enum_home_page_blocks_wide_banner_overlay_pos";
  DROP TYPE "public"."enum_home_page_blocks_wide_banner_overlay_tone";
  DROP TYPE "public"."enum_home_page_blocks_product_carousel_source";
  DROP TYPE "public"."enum_home_page_blocks_collection_showcase_button_link_lnk";
  DROP TYPE "public"."enum_home_page_blocks_catalogue_banner_button_link_lnk";
  DROP TYPE "public"."enum_home_page_status";
  DROP TYPE "public"."enum__home_page_v_blocks_hero_carousel_slides_link_lnk";
  DROP TYPE "public"."enum__home_page_v_blocks_hero_carousel_slides_overlay_btn";
  DROP TYPE "public"."enum__home_page_v_blocks_hero_carousel_slides_overlay_pos";
  DROP TYPE "public"."enum__home_page_v_blocks_hero_carousel_slides_overlay_tone";
  DROP TYPE "public"."enum__home_page_v_blocks_banner_row_banners_link_lnk";
  DROP TYPE "public"."enum__home_page_v_blocks_banner_row_banners_overlay_btn";
  DROP TYPE "public"."enum__home_page_v_blocks_banner_row_banners_overlay_pos";
  DROP TYPE "public"."enum__home_page_v_blocks_banner_row_banners_overlay_tone";
  DROP TYPE "public"."enum__home_page_v_blocks_wide_banner_shape";
  DROP TYPE "public"."enum__home_page_v_blocks_wide_banner_link_lnk";
  DROP TYPE "public"."enum__home_page_v_blocks_wide_banner_overlay_btn";
  DROP TYPE "public"."enum__home_page_v_blocks_wide_banner_overlay_pos";
  DROP TYPE "public"."enum__home_page_v_blocks_wide_banner_overlay_tone";
  DROP TYPE "public"."enum__home_page_v_blocks_product_carousel_source";
  DROP TYPE "public"."enum__home_page_v_blocks_collection_showcase_button_link_lnk";
  DROP TYPE "public"."enum__home_page_v_blocks_catalogue_banner_button_link_lnk";
  DROP TYPE "public"."enum__home_page_v_version_status";
  DROP TYPE "public"."enum_site_settings_utility_links_icon";
  DROP TYPE "public"."enum_site_settings_utility_links_link_lnk";
  DROP TYPE "public"."enum_site_settings_top_moving_products_link_lnk";
  DROP TYPE "public"."enum_site_settings_footer_columns_links_link_lnk";
  DROP TYPE "public"."enum_site_settings_social_links_platform";`)
}
