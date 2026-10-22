CREATE TABLE "characters" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"name" text NOT NULL,
	"class_id" text NOT NULL,
	"level" integer NOT NULL,
	"power" integer NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"bio" text DEFAULT '' NOT NULL,
	"look" jsonb NOT NULL,
	"stats" jsonb NOT NULL,
	"achievements" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"pvp" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "characters_class_ck" CHECK (class_id in ('to-van','cuu-linh','than-tuong','thiet-y','huyet-ha','toai-mong','long-ngam')),
	CONSTRAINT "characters_level_ck" CHECK ("characters"."level" between 1 and 100),
	CONSTRAINT "characters_power_ck" CHECK ("characters"."power" >= 0)
);
--> statement-breakpoint
CREATE TABLE "org_invites" (
	"code" text PRIMARY KEY NOT NULL,
	"guild_id" text NOT NULL,
	"kind" text DEFAULT 'join' NOT NULL,
	"member_id" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"max_uses" integer,
	"uses" integer DEFAULT 0 NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "invites_kind_ck" CHECK ("org_invites"."kind" in ('join','claim'))
);
--> statement-breakpoint
CREATE TABLE "power_history" (
	"character_id" text NOT NULL,
	"week_start" date NOT NULL,
	"power" integer NOT NULL,
	CONSTRAINT "power_history_character_id_week_start_pk" PRIMARY KEY("character_id","week_start")
);
--> statement-breakpoint
ALTER TABLE "members" DROP CONSTRAINT "members_rank_ck";--> statement-breakpoint
ALTER TABLE "guilds" ALTER COLUMN "capacity" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "character_id" text;--> statement-breakpoint
ALTER TABLE "guilds" ADD COLUMN "type" text DEFAULT 'guild' NOT NULL;--> statement-breakpoint
ALTER TABLE "guilds" ADD COLUMN "description" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "guilds" ADD COLUMN "theme" text DEFAULT 'kinh-hong' NOT NULL;--> statement-breakpoint
ALTER TABLE "guilds" ADD COLUMN "features" jsonb;--> statement-breakpoint
ALTER TABLE "guilds" ADD COLUMN "is_public" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "guilds" ADD COLUMN "created_by" text;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "character_id" text;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "seat" integer;--> statement-breakpoint
ALTER TABLE "characters" ADD CONSTRAINT "characters_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_invites" ADD CONSTRAINT "org_invites_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "power_history" ADD CONSTRAINT "power_history_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "characters_user_uq" ON "characters" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "invites_guild_idx" ON "org_invites" USING btree ("guild_id");--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guilds" ADD CONSTRAINT "guilds_type_ck" CHECK ("guilds"."type" in ('guild','kimlan','team'));--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_seat_ck" CHECK ("members"."seat" is null or "members"."seat" between 1 and 12);--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_rank_ck" CHECK (rank in ('bang-chu','pho-bang-chu','truong-lao','duong-chu','tinh-anh','thanh-vien','tan-binh','dai-ca','huynh-de','truong-nhom','pho-nhom'));