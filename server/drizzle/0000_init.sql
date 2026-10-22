CREATE TABLE "activities" (
	"id" text PRIMARY KEY NOT NULL,
	"guild_id" text NOT NULL,
	"type" text NOT NULL,
	"text" text NOT NULL,
	"date" timestamp with time zone DEFAULT now() NOT NULL,
	"member_id" text
);
--> statement-breakpoint
CREATE TABLE "announcements" (
	"id" text PRIMARY KEY NOT NULL,
	"guild_id" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"author_id" text NOT NULL,
	"date" timestamp with time zone DEFAULT now() NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"tag" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" text PRIMARY KEY NOT NULL,
	"guild_id" text NOT NULL,
	"kind" text DEFAULT 'join' NOT NULL,
	"user_id" text,
	"claim_member_id" text,
	"name" text NOT NULL,
	"class_id" text NOT NULL,
	"power" integer NOT NULL,
	"level" integer NOT NULL,
	"message" text DEFAULT '' NOT NULL,
	"stage" text DEFAULT 'moi' NOT NULL,
	"applied_at" timestamp with time zone DEFAULT now() NOT NULL,
	"referrer_id" text,
	"look" jsonb NOT NULL,
	"member_id" text,
	CONSTRAINT "applications_kind_ck" CHECK ("applications"."kind" in ('join','claim')),
	CONSTRAINT "applications_stage_ck" CHECK ("applications"."stage" in ('moi','phong-van','thu-thach','chap-nhan','tu-choi'))
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"guild_id" text NOT NULL,
	"user_id" text,
	"action" text NOT NULL,
	"target" text,
	"payload" jsonb,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bonds" (
	"id" text PRIMARY KEY NOT NULL,
	"guild_id" text NOT NULL,
	"a_id" text NOT NULL,
	"b_id" text NOT NULL,
	"type" text NOT NULL,
	"since" timestamp with time zone NOT NULL,
	"intimacy" integer DEFAULT 0 NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	CONSTRAINT "bonds_self_ck" CHECK ("bonds"."a_id" <> "bonds"."b_id")
);
--> statement-breakpoint
CREATE TABLE "clears" (
	"id" text PRIMARY KEY NOT NULL,
	"guild_id" text NOT NULL,
	"dungeon_id" text NOT NULL,
	"mode" text NOT NULL,
	"boss_id" text NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"duration_sec" integer NOT NULL,
	"member_ids" jsonb NOT NULL,
	"mvp_id" text NOT NULL,
	"wipes" integer DEFAULT 0 NOT NULL,
	"created_by" text,
	CONSTRAINT "clears_duration_ck" CHECK ("clears"."duration_sec" > 0)
);
--> statement-breakpoint
CREATE TABLE "event_rsvps" (
	"event_id" text NOT NULL,
	"member_id" text NOT NULL,
	"status" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_rsvps_event_id_member_id_pk" PRIMARY KEY("event_id","member_id"),
	CONSTRAINT "rsvp_status_ck" CHECK ("event_rsvps"."status" in ('yes','maybe','no'))
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" text PRIMARY KEY NOT NULL,
	"guild_id" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"start" timestamp with time zone NOT NULL,
	"duration_min" integer NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"leader_id" text NOT NULL,
	"capacity" integer NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_by" text
);
--> statement-breakpoint
CREATE TABLE "guilds" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"han" text NOT NULL,
	"server" text NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"motto" text DEFAULT '' NOT NULL,
	"capacity" integer DEFAULT 80 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "idempotency_keys" (
	"user_id" text NOT NULL,
	"key" text NOT NULL,
	"route" text NOT NULL,
	"status_code" integer NOT NULL,
	"response" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "idempotency_keys_user_id_key_pk" PRIMARY KEY("user_id","key")
);
--> statement-breakpoint
CREATE TABLE "job_runs" (
	"job" text NOT NULL,
	"period" text NOT NULL,
	"ran_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "job_runs_job_period_pk" PRIMARY KEY("job","period")
);
--> statement-breakpoint
CREATE TABLE "ledger_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"guild_id" text NOT NULL,
	"member_id" text NOT NULL,
	"delta" integer NOT NULL,
	"reason" text NOT NULL,
	"category" text NOT NULL,
	"date" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	CONSTRAINT "ledger_category_ck" CHECK ("ledger_entries"."category" in ('pho-ban','bang-chien','quyen-gop','nhiem-vu','dau-gia','dieu-chinh')),
	CONSTRAINT "ledger_delta_ck" CHECK ("ledger_entries"."delta" <> 0)
);
--> statement-breakpoint
CREATE TABLE "loot_bids" (
	"id" text PRIMARY KEY NOT NULL,
	"item_id" text NOT NULL,
	"member_id" text NOT NULL,
	"amount" integer NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loot_items" (
	"id" text PRIMARY KEY NOT NULL,
	"guild_id" text NOT NULL,
	"name" text NOT NULL,
	"rarity" text NOT NULL,
	"source" text NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'auction' NOT NULL,
	"start_price" integer NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"assigned_to" text,
	"price" integer,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "loot_price_ck" CHECK ("loot_items"."start_price" > 0)
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" text PRIMARY KEY NOT NULL,
	"guild_id" text NOT NULL,
	"user_id" text,
	"name" text NOT NULL,
	"class_id" text NOT NULL,
	"rank" text NOT NULL,
	"level" integer NOT NULL,
	"power" integer NOT NULL,
	"activity" integer DEFAULT 50 NOT NULL,
	"status" text DEFAULT 'offline' NOT NULL,
	"joined_at" timestamp with time zone NOT NULL,
	"last_online" timestamp with time zone NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"bio" text DEFAULT '' NOT NULL,
	"look" jsonb NOT NULL,
	"stats" jsonb NOT NULL,
	"achievements" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"pvp" jsonb NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "members_rank_ck" CHECK (rank in ('bang-chu','pho-bang-chu','truong-lao','duong-chu','tinh-anh','thanh-vien','tan-binh')),
	CONSTRAINT "members_class_ck" CHECK (class_id in ('to-van','cuu-linh','than-tuong','thiet-y','huyet-ha','toai-mong','long-ngam')),
	CONSTRAINT "members_level_ck" CHECK ("members"."level" between 1 and 100),
	CONSTRAINT "members_power_ck" CHECK ("members"."power" >= 0)
);
--> statement-breakpoint
CREATE TABLE "mentorships" (
	"id" text PRIMARY KEY NOT NULL,
	"guild_id" text NOT NULL,
	"master_id" text NOT NULL,
	"disciple_id" text NOT NULL,
	"stage" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"graduated_at" timestamp with time zone,
	"bond" integer DEFAULT 0 NOT NULL,
	"tasks" jsonb NOT NULL,
	CONSTRAINT "mentorships_stage_ck" CHECK ("mentorships"."stage" between 0 and 4),
	CONSTRAINT "mentorships_self_ck" CHECK ("mentorships"."master_id" <> "mentorships"."disciple_id")
);
--> statement-breakpoint
CREATE TABLE "power_snapshots" (
	"member_id" text NOT NULL,
	"week_start" date NOT NULL,
	"power" integer NOT NULL,
	CONSTRAINT "power_snapshots_member_id_week_start_pk" PRIMARY KEY("member_id","week_start")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"token_hash" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"user_agent" text,
	CONSTRAINT "sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" text PRIMARY KEY NOT NULL,
	"guild_id" text NOT NULL,
	"name" text NOT NULL,
	"dungeon_id" text,
	"slots" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"discord_id" text,
	"username" text NOT NULL,
	"display_name" text NOT NULL,
	"avatar_url" text,
	"is_dev" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone,
	CONSTRAINT "users_discord_id_unique" UNIQUE("discord_id")
);
--> statement-breakpoint
CREATE TABLE "wars" (
	"id" text PRIMARY KEY NOT NULL,
	"guild_id" text NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"opponent" text NOT NULL,
	"result" text NOT NULL,
	"score" jsonb NOT NULL,
	"mvp_id" text NOT NULL,
	"mode" text NOT NULL,
	"lines" jsonb NOT NULL,
	"created_by" text
);
--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bonds" ADD CONSTRAINT "bonds_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bonds" ADD CONSTRAINT "bonds_a_id_members_id_fk" FOREIGN KEY ("a_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bonds" ADD CONSTRAINT "bonds_b_id_members_id_fk" FOREIGN KEY ("b_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clears" ADD CONSTRAINT "clears_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_rsvps" ADD CONSTRAINT "event_rsvps_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_rsvps" ADD CONSTRAINT "event_rsvps_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loot_bids" ADD CONSTRAINT "loot_bids_item_id_loot_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."loot_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loot_bids" ADD CONSTRAINT "loot_bids_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loot_items" ADD CONSTRAINT "loot_items_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentorships" ADD CONSTRAINT "mentorships_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentorships" ADD CONSTRAINT "mentorships_master_id_members_id_fk" FOREIGN KEY ("master_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentorships" ADD CONSTRAINT "mentorships_disciple_id_members_id_fk" FOREIGN KEY ("disciple_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "power_snapshots" ADD CONSTRAINT "power_snapshots_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wars" ADD CONSTRAINT "wars_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activities_date_idx" ON "activities" USING btree ("guild_id","date");--> statement-breakpoint
CREATE INDEX "applications_guild_idx" ON "applications" USING btree ("guild_id","stage");--> statement-breakpoint
CREATE INDEX "audit_guild_idx" ON "audit_log" USING btree ("guild_id","at");--> statement-breakpoint
CREATE INDEX "bonds_guild_idx" ON "bonds" USING btree ("guild_id");--> statement-breakpoint
CREATE INDEX "clears_boss_idx" ON "clears" USING btree ("guild_id","dungeon_id","mode","boss_id");--> statement-breakpoint
CREATE INDEX "clears_date_idx" ON "clears" USING btree ("guild_id","date");--> statement-breakpoint
CREATE INDEX "events_start_idx" ON "events" USING btree ("guild_id","start");--> statement-breakpoint
CREATE INDEX "ledger_member_idx" ON "ledger_entries" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "ledger_date_idx" ON "ledger_entries" USING btree ("guild_id","date");--> statement-breakpoint
CREATE INDEX "bids_item_idx" ON "loot_bids" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "loot_guild_idx" ON "loot_items" USING btree ("guild_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "members_user_uq" ON "members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "members_guild_name_uq" ON "members" USING btree ("guild_id",lower("name")) WHERE "members"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "members_guild_idx" ON "members" USING btree ("guild_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mentorships_active_disciple_uq" ON "mentorships" USING btree ("disciple_id") WHERE "mentorships"."status" = 'active';--> statement-breakpoint
CREATE INDEX "mentorships_guild_idx" ON "mentorships" USING btree ("guild_id");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "wars_date_idx" ON "wars" USING btree ("guild_id","date");