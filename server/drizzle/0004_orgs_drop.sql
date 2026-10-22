ALTER TABLE "power_snapshots" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "power_snapshots" CASCADE;--> statement-breakpoint
ALTER TABLE "members" DROP CONSTRAINT "members_class_ck";--> statement-breakpoint
ALTER TABLE "members" DROP CONSTRAINT "members_level_ck";--> statement-breakpoint
ALTER TABLE "members" DROP CONSTRAINT "members_power_ck";--> statement-breakpoint
ALTER TABLE "members" DROP CONSTRAINT "members_user_id_users_id_fk";
--> statement-breakpoint
DROP INDEX "members_user_uq";--> statement-breakpoint
DROP INDEX "members_guild_name_uq";--> statement-breakpoint
ALTER TABLE "members" ALTER COLUMN "character_id" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "members_org_character_uq" ON "members" USING btree ("guild_id","character_id") WHERE "members"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "members_character_idx" ON "members" USING btree ("character_id");--> statement-breakpoint
ALTER TABLE "members" DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "members" DROP COLUMN "name";--> statement-breakpoint
ALTER TABLE "members" DROP COLUMN "class_id";--> statement-breakpoint
ALTER TABLE "members" DROP COLUMN "level";--> statement-breakpoint
ALTER TABLE "members" DROP COLUMN "power";--> statement-breakpoint
ALTER TABLE "members" DROP COLUMN "title";--> statement-breakpoint
ALTER TABLE "members" DROP COLUMN "bio";--> statement-breakpoint
ALTER TABLE "members" DROP COLUMN "look";--> statement-breakpoint
ALTER TABLE "members" DROP COLUMN "stats";--> statement-breakpoint
ALTER TABLE "members" DROP COLUMN "achievements";--> statement-breakpoint
ALTER TABLE "members" DROP COLUMN "pvp";