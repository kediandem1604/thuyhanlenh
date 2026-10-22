-- Giai đoạn 3: tách "nhân vật" (characters) ra khỏi "tư cách thành viên" (members).
-- Mỗi môn hạ cũ thành một nhân vật 'ch-<id môn hạ>', giữ nguyên liên kết tài khoản Discord / dev.
INSERT INTO characters (id, user_id, name, class_id, level, power, title, bio, look, stats, achievements, pvp, created_at)
SELECT 'ch-' || id, user_id, name, class_id, level, power, title, bio, look, stats, achievements, pvp, joined_at
FROM members
ON CONFLICT (id) DO NOTHING;
--> statement-breakpoint
UPDATE members SET character_id = 'ch-' || id WHERE character_id IS NULL;
--> statement-breakpoint
INSERT INTO power_history (character_id, week_start, power)
SELECT 'ch-' || member_id, week_start, power FROM power_snapshots
ON CONFLICT DO NOTHING;
--> statement-breakpoint
-- Bang hội có sẵn: là bang công khai (nhận đơn từ Sảnh Giang Hồ)
UPDATE guilds SET is_public = true WHERE type = 'guild';
