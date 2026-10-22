# Đưa Thủy Hàn Lệnh lên mạng bằng Render

Cấu hình nằm trong [`render.yaml`](../render.yaml): một **web service** (API + web, Node 24) và một **Postgres**, cả hai ở **Singapore**, gói **free**.

## Lần đầu

1. **Ứng dụng Discord** — làm Bước 1–2 trong [DISCORD_SETUP.md](DISCORD_SETUP.md) để có *Client ID* và *Client Secret* (bước Redirect làm sau, khi đã có địa chỉ web).
2. **ID Discord của bạn** (để nhận ghế Bang Chủ Kinh Hồng Các): Discord → Cài đặt → Nâng cao → bật *Chế độ nhà phát triển* → bấm chuột phải vào tên mình → *Sao chép ID người dùng*.
3. Mở **https://dashboard.render.com/blueprint/new?repo=https://github.com/kediandem1604/thuyhanlenh**
   - Đăng nhập Render bằng GitHub; khi GitHub hỏi quyền, chọn *Only select repositories* → `thuyhanlenh`.
   - Điền 3 biến: `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `BOOTSTRAP_LEADER_DISCORD_ID`.
   - Bấm **Apply**. Lần build đầu mất khoảng 3–6 phút; Render tạo CSDL, build web, chạy migration và nạp dữ liệu mẫu.
4. Lấy địa chỉ web (dạng `https://thuy-han-lenh.onrender.com`, có thể có thêm hậu tố) → Discord Developer Portal → OAuth2 → **Add Redirect**: `https://<địa-chỉ-web>/auth/discord/callback` → **Save Changes**.
5. Mở địa chỉ web → **Đăng nhập bằng Discord**.

## Cập nhật về sau

Mỗi lần `git push` lên nhánh `main`, Render tự build và deploy lại (không mất dữ liệu — dữ liệu nằm trong Postgres).

## Giới hạn gói free

- Web **ngủ sau 15 phút** không ai truy cập; lần mở sau chờ khoảng 1 phút. Reset tuần tự chạy bù khi thức dậy.
- **CSDL free hết hạn sau 30 ngày** (sau đó 14 ngày thì bị xóa). Muốn giữ dữ liệu: Render Dashboard → `thuy-han-lenh-db` → đổi sang gói trả phí *trước* hạn (khoảng $6/tháng; web luôn bật thêm $7/tháng).

## Bảo mật

- Khóa Discord chỉ nằm trong Render Dashboard, không nằm trong mã nguồn.
- CSDL không mở ra internet (`ipAllowList: []`), chỉ web service kết nối qua mạng riêng của Render.
- Đăng nhập thử (`DEV_LOGIN`) tắt ở bản online.
