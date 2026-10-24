-- Phó bản theo game thật (bản 1.3.3): bỏ 6 phó bản hư cấu, thay bằng
-- Trích Tiên Kinh Đào (6 người) · Thiên Hoang Dị Văn (6 người) · Vĩnh Dạ Tinh Đô (8–12 người).
-- Lượt clear và đội hình cũ được chuyển sang phó bản mới gần nhất để giữ lịch sử;
-- độ khó "Ác Mộng" (game không có) gộp vào Anh Hùng; Thiên Hoang Dị Văn hiện chỉ có bản Thường.

UPDATE clears AS c SET dungeon_id = m.new_dungeon, boss_id = m.new_boss
FROM (VALUES
  ('lien-van-trai', 'lvt-1', 'trich-tien-kinh-dao', 'tt-1'),
  ('lien-van-trai', 'lvt-2', 'trich-tien-kinh-dao', 'tt-2'),
  ('lien-van-trai', 'lvt-3', 'trich-tien-kinh-dao', 'tt-3'),
  ('huy-nac-thanh', 'hnt-1', 'thien-hoang-di-van', 'thd-1'),
  ('huy-nac-thanh', 'hnt-2', 'thien-hoang-di-van', 'thd-2'),
  ('huy-nac-thanh', 'hnt-3', 'thien-hoang-di-van', 'thd-3'),
  ('kim-phong-lau', 'kpl-1', 'thien-hoang-di-van', 'thd-2'),
  ('kim-phong-lau', 'kpl-2', 'thien-hoang-di-van', 'thd-3'),
  ('kim-phong-lau', 'kpl-3', 'thien-hoang-di-van', 'thd-4'),
  ('thien-lao', 'tl-1', 'vinh-da-tinh-do', 'vd-1'),
  ('thien-lao', 'tl-2', 'vinh-da-tinh-do', 'vd-2'),
  ('thien-lao', 'tl-3', 'vinh-da-tinh-do', 'vd-3'),
  ('thien-lao', 'tl-4', 'vinh-da-tinh-do', 'vd-4'),
  ('tay-ha-lang', 'thl-1', 'vinh-da-tinh-do', 'vd-3'),
  ('tay-ha-lang', 'thl-2', 'vinh-da-tinh-do', 'vd-4'),
  ('tay-ha-lang', 'thl-3', 'vinh-da-tinh-do', 'vd-5'),
  ('tay-ha-lang', 'thl-4', 'vinh-da-tinh-do', 'vd-6'),
  ('cuu-long-uyen', 'clu-1', 'vinh-da-tinh-do', 'vd-3'),
  ('cuu-long-uyen', 'clu-2', 'vinh-da-tinh-do', 'vd-4'),
  ('cuu-long-uyen', 'clu-3', 'vinh-da-tinh-do', 'vd-5'),
  ('cuu-long-uyen', 'clu-4', 'vinh-da-tinh-do', 'vd-6')
) AS m(old_dungeon, old_boss, new_dungeon, new_boss)
WHERE c.dungeon_id = m.old_dungeon AND c.boss_id = m.old_boss;
--> statement-breakpoint
UPDATE clears SET mode = 'anh-hung' WHERE mode = 'ac-mong';
--> statement-breakpoint
UPDATE clears SET mode = 'thuong' WHERE dungeon_id = 'thien-hoang-di-van' AND mode <> 'thuong';
--> statement-breakpoint
UPDATE teams AS t SET dungeon_id = m.new_dungeon
FROM (VALUES
  ('lien-van-trai', 'trich-tien-kinh-dao'),
  ('huy-nac-thanh', 'thien-hoang-di-van'),
  ('kim-phong-lau', 'thien-hoang-di-van'),
  ('thien-lao', 'vinh-da-tinh-do'),
  ('tay-ha-lang', 'vinh-da-tinh-do'),
  ('cuu-long-uyen', 'vinh-da-tinh-do')
) AS m(old_dungeon, new_dungeon)
WHERE t.dungeon_id = m.old_dungeon;
--> statement-breakpoint
-- mẫu đội hình dữ liệu mẫu: xếp lại theo tổ 6 người (tank · healer · 4 DPS)
UPDATE teams SET name = 'Đoàn chủ lực · Vĩnh Dạ Tinh Đô',
  slots = CASE WHEN jsonb_array_length(slots) = 10
    THEN jsonb_build_array(slots->0, slots->2, slots->4, slots->5, slots->6, slots->7, slots->1, slots->3, slots->8, slots->9)
    ELSE slots END
WHERE name = 'Đội chủ lực · Cửu Long Uyên';
--> statement-breakpoint
UPDATE teams SET name = 'Bạch Gia · Vĩnh Dạ Tinh Đô', dungeon_id = 'vinh-da-tinh-do',
  slots = '["bg02","bg03","bg01","bg04","bg05","bg06","bg10","bg07","bg08","bg09","bg11","bg12"]'::jsonb
WHERE name = 'Bạch Gia · Hủy Nặc Thành';
--> statement-breakpoint
-- đội hình dài hơn sĩ số tối đa của phó bản (cũ có phó bản 10 / 25 người) → cắt bớt vị trí thừa
UPDATE teams SET slots = (
  SELECT COALESCE(jsonb_agg(x.e ORDER BY x.i), '[]'::jsonb)
  FROM jsonb_array_elements(teams.slots) WITH ORDINALITY AS x(e, i)
  WHERE x.i <= CASE WHEN teams.dungeon_id IN ('trich-tien-kinh-dao', 'thien-hoang-di-van') THEN 6 ELSE 12 END
)
WHERE jsonb_array_length(slots) > CASE WHEN dungeon_id IN ('trich-tien-kinh-dao', 'thien-hoang-di-van') THEN 6 ELSE 12 END;
--> statement-breakpoint
-- Câu chữ dữ liệu mẫu nhắc tên phó bản cũ — chỉ sửa đúng các dòng còn nguyên văn bản gốc
UPDATE events SET title = 'Vĩnh Dạ Tinh Đô · Anh Hùng', location = 'Cổng Vĩnh Dạ Tinh Đô',
  capacity = GREATEST(24, (SELECT count(*) FROM event_rsvps r WHERE r.event_id = events.id AND r.status = 'yes')),
  note = 'Hai đoàn 12 người, báo danh trước 20:00 để chia tổ.'
WHERE title = 'Thiên Lao · Ác Mộng';
--> statement-breakpoint
UPDATE events SET title = 'Dạy tân thủ: Cơ chế Nhật Nguyệt Song Thú' WHERE title = 'Dạy tân thủ: Cơ chế Hủy Nặc Thành';
--> statement-breakpoint
UPDATE events SET title = 'Vĩnh Dạ Tinh Đô · Thường', location = 'Cổng Vĩnh Dạ Tinh Đô',
  capacity = GREATEST(24, (SELECT count(*) FROM event_rsvps r WHERE r.event_id = events.id AND r.status = 'yes')),
  note = 'Chia hai đoàn 12 người, đoàn 2 ưu tiên người mới.'
WHERE title = 'Cửu Long Uyên · Anh Hùng';
--> statement-breakpoint
UPDATE events SET title = 'Vĩnh Dạ Tinh Đô · Anh Hùng (Bạch Gia)', location = 'Cổng Vĩnh Dạ Tinh Đô', capacity = 12,
  note = 'Tam tỷ và Thất tỷ mỗi người giữ máu một tổ.'
WHERE title = 'Hủy Nặc Thành · Ác Mộng (Bạch Gia)';
--> statement-breakpoint
UPDATE events SET title = 'Trích Tiên Kinh Đào · Anh Hùng (hai tổ)', location = 'Trích Tiên Kinh Đào', capacity = 12,
  note = 'Chia hai tổ 6 người, tổ nào xong trước thì sang phụ tổ kia.'
WHERE title = 'Kim Phong Tế Vũ Lâu · Anh Hùng';
--> statement-breakpoint
UPDATE events SET title = 'Thiên Hoang Dị Văn · dắt Tiểu muội', location = 'Thiên Hoang Dị Văn', capacity = 6,
  note = 'Săn nhẫn Độc Trân cấp 87 cho Tiểu Hồ.'
WHERE title = 'Liên Vân Trại · dắt Tiểu muội';
--> statement-breakpoint
UPDATE events SET title = 'Trích Tiên Kinh Đào · Anh Hùng (Thất Tinh)', location = 'Trích Tiên Kinh Đào', capacity = 6
WHERE title = 'Liên Vân Trại · Ác Mộng (Thất Tinh)';
--> statement-breakpoint
UPDATE events SET title = 'Luyện cơ chế Lý Bạch', note = 'Tập xử lý Kiếm Đãng Hồng Trần trước khi vào bản Anh Hùng.'
WHERE title = 'Luyện cơ chế Thiết Bối Hùng Vương';
--> statement-breakpoint
UPDATE announcements SET title = 'Mục tiêu tuần: Vĩnh Dạ Tinh Đô · Anh Hùng',
  body = 'Tối thứ Hai 20:30 tập trung ở cổng Vĩnh Dạ Tinh Đô, chia hai đoàn 12 người. Thiết Y giữ boss, Tố Vấn chia 2 tổ hồi máu theo đội hình đã lưu.'
WHERE title = 'Mục tiêu tuần: hạ Lôi Đình Long Tướng (Anh Hùng)';
--> statement-breakpoint
UPDATE announcements SET title = 'Tuần này: Vĩnh Dạ Tinh Đô · Anh Hùng',
  body = 'Tối thứ Ba 21:00 tập trung ở cổng Vĩnh Dạ Tinh Đô. Nhị ca và Thập đệ mỗi người giữ boss cho một tổ, Tam tỷ và Thất tỷ lo hồi máu.'
WHERE title = 'Tuần này: Ác Mộng Hủy Nặc Thành';
--> statement-breakpoint
UPDATE announcements SET body = replace(body, 'dắt muội đi Liên Vân Trại cuối tuần', 'dắt muội đi Thiên Hoang Dị Văn cuối tuần')
WHERE body LIKE '%dắt muội đi Liên Vân Trại cuối tuần%';
--> statement-breakpoint
UPDATE announcements SET body = 'Thất Tinh Đội đi Trích Tiên Kinh Đào bản Anh Hùng mỗi tuần — ai bận nhắn sớm để gọi dự bị.'
WHERE body = 'Thất Tinh Đội đi Liên Vân Trại Ác Mộng mỗi tuần. Mục tiêu tháng này: hạ Thiết Bối Hùng Vương.';
--> statement-breakpoint
-- nhật ký: đổi tên boss theo đúng cách đã chuyển lượt clear ở trên
UPDATE activities SET text = 'Bang hạ gục lần đầu Ác Dịch Tâm Ma (Vĩnh Dạ Tinh Đô · Anh Hùng)!' WHERE text = 'Bang hạ gục lần đầu Huyết Y Hầu (Ác Mộng)!';
--> statement-breakpoint
UPDATE activities SET text = replace(text, 'dẫn đội clear Hủy Nặc Thành · Anh Hùng', 'dẫn tổ 6 người clear Thiên Hoang Dị Văn')
WHERE text LIKE '%dẫn đội clear Hủy Nặc Thành · Anh Hùng%';
--> statement-breakpoint
UPDATE activities SET text = 'Bạch gia hạ gục lần đầu Hắc Lân Mãnh Giao (Thiên Hoang Dị Văn)!' WHERE text = 'Bạch gia hạ gục lần đầu Thành Chủ Hủy Nặc (Ác Mộng)!';
--> statement-breakpoint
UPDATE activities SET text = 'Đội của Bạch Tử Mặc hạ Nhạc Đại Lực · Thiên Hoang Dị Văn' WHERE text = 'Đội của Bạch Tử Mặc hạ Tuyết Ảnh Kiếm Cơ · Hủy Nặc Thành';
--> statement-breakpoint
UPDATE activities SET text = 'Bạch Ngọc Lan đặt lịch Trích Tiên Kinh Đào · Anh Hùng' WHERE text = 'Bạch Ngọc Lan đặt lịch Kim Phong Tế Vũ Lâu · Anh Hùng';
--> statement-breakpoint
UPDATE activities SET text = 'Thất Tinh Đội hạ Viên Công · Trích Tiên Kinh Đào (Anh Hùng)' WHERE text = 'Thất Tinh Đội hạ Song Đao Quỷ Ảnh · Liên Vân Trại (Ác Mộng)';
--> statement-breakpoint
UPDATE characters SET bio = 'Mục tiêu: hạ Liễu Thương Hải bản Anh Hùng trước Tết.' WHERE bio = 'Mục tiêu: clear Ác Mộng Cửu Long Uyên trước Tết.';
--> statement-breakpoint
UPDATE characters SET bio = 'Đỡ đòn cho cả nhà từ thuở Ảo Vực còn chưa ai qua nổi.' WHERE bio = 'Đỡ đòn cho cả nhà từ thuở Liên Vân Trại còn là phó bản khó.';
--> statement-breakpoint
UPDATE applications SET message = 'Online mỗi tối, muốn vào bang đi Vĩnh Dạ Tinh Đô đoàn 12 người cùng mọi người.' WHERE message = 'Online mỗi tối, muốn vào bang đánh phó bản 25 người cùng mọi người.';
--> statement-breakpoint
UPDATE applications SET message = 'Healer chính, đã qua Ảo Vực Vĩnh Dạ Tinh Đô bản Anh Hùng.' WHERE message = 'Healer chính, có kinh nghiệm Ác Mộng Thiên Lao.';
--> statement-breakpoint
UPDATE guilds SET description = 'Nhóm cố định 7 người tách ra từ Kinh Hồng Các để đi Trích Tiên Kinh Đào mỗi tuần.'
WHERE description = 'Nhóm cố định 7 người tách ra từ Kinh Hồng Các để đi phó bản 5 người mỗi tuần.';
--> statement-breakpoint
-- nhiệm vụ sư đồ lưu kèm tên nhiệm vụ trong jsonb
UPDATE mentorships SET tasks = replace(replace(tasks::text,
    'Cùng sư phụ đánh 3 phó bản 5 người', 'Cùng sư phụ đánh 3 lượt phó bản 6 người'),
    'Clear 1 phó bản 10 người cùng bang', 'Đi Vĩnh Dạ Tinh Đô cùng đoàn của bang')::jsonb
WHERE tasks::text LIKE '%phó bản 5 người%' OR tasks::text LIKE '%phó bản 10 người%';
