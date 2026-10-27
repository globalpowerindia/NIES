import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_home_page_blocks_collection_showcase_feature_type" AS ENUM('image', 'video');
  CREATE TYPE "public"."enum__home_page_v_blocks_collection_showcase_feature_type" AS ENUM('image', 'video');
  ALTER TABLE "home_page_blocks_collection_showcase" ADD COLUMN "feature_type" "enum_home_page_blocks_collection_showcase_feature_type" DEFAULT 'image';
  ALTER TABLE "home_page_blocks_collection_showcase" ADD COLUMN "feature_video_id" integer;
  ALTER TABLE "_home_page_v_blocks_collection_showcase" ADD COLUMN "feature_type" "enum__home_page_v_blocks_collection_showcase_feature_type" DEFAULT 'image';
  ALTER TABLE "_home_page_v_blocks_collection_showcase" ADD COLUMN "feature_video_id" integer;
  ALTER TABLE "home_page_blocks_collection_showcase" ADD CONSTRAINT "home_page_blocks_collection_showcase_feature_video_id_media_id_fk" FOREIGN KEY ("feature_video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_home_page_v_blocks_collection_showcase" ADD CONSTRAINT "_home_page_v_blocks_collection_showcase_feature_video_id_media_id_fk" FOREIGN KEY ("feature_video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "home_page_blocks_collection_showcase_feature_video_idx" ON "home_page_blocks_collection_showcase" USING btree ("feature_video_id");
  CREATE INDEX "_home_page_v_blocks_collection_showcase_feature_video_idx" ON "_home_page_v_blocks_collection_showcase" USING btree ("feature_video_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "home_page_blocks_collection_showcase" DROP CONSTRAINT "home_page_blocks_collection_showcase_feature_video_id_media_id_fk";
  
  ALTER TABLE "_home_page_v_blocks_collection_showcase" DROP CONSTRAINT "_home_page_v_blocks_collection_showcase_feature_video_id_media_id_fk";
  
  DROP INDEX "home_page_blocks_collection_showcase_feature_video_idx";
  DROP INDEX "_home_page_v_blocks_collection_showcase_feature_video_idx";
  ALTER TABLE "home_page_blocks_collection_showcase" DROP COLUMN "feature_type";
  ALTER TABLE "home_page_blocks_collection_showcase" DROP COLUMN "feature_video_id";
  ALTER TABLE "_home_page_v_blocks_collection_showcase" DROP COLUMN "feature_type";
  ALTER TABLE "_home_page_v_blocks_collection_showcase" DROP COLUMN "feature_video_id";
  DROP TYPE "public"."enum_home_page_blocks_collection_showcase_feature_type";
  DROP TYPE "public"."enum__home_page_v_blocks_collection_showcase_feature_type";`)
}
