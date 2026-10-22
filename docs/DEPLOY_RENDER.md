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

## Đăng nhập Discord báo "Discord đang trục trặc" (HTTP 429)

Render dùng chung vài địa chỉ IP ra ngoài cho mọi dịch vụ trong một vùng, và Discord thường chặn các IP này (log Render có dòng `đăng nhập Discord thất bại` với `"status":429`). Cách xử lý: cho 2 lời gọi Discord đi qua một **Cloudflare Worker** miễn phí.

1. Đăng ký / đăng nhập https://dash.cloudflare.com → **Workers & Pages** → **Create** → **Create Worker** → đặt tên (vd `thl-discord`) → **Deploy**.
2. **Edit code** → xóa code mẫu, dán toàn bộ [`deploy/discord-proxy-worker.js`](../deploy/discord-proxy-worker.js) → **Deploy**.
3. Worker → **Settings → Variables and Secrets → Add** → loại **Secret**, tên `PROXY_KEY`, giá trị là một chuỗi ngẫu nhiên dài → **Deploy**.
4. Render → `thuy-han-lenh` → **Environment** → thêm:
   - `DISCORD_API_BASE` = địa chỉ Worker, dạng `https://thl-discord.<tài-khoản>.workers.dev`
   - `DISCORD_PROXY_KEY` = đúng chuỗi đã đặt cho `PROXY_KEY`
   → **Save, rebuild, and deploy**.

Trang cấp quyền Discord vẫn mở thẳng trên trình duyệt người dùng; Worker chỉ chuyển tiếp `POST /oauth2/token` và `GET /users/@me`, từ chối mọi yêu cầu không có khóa.

## Cập nhật về sau

Mỗi lần `git push` lên nhánh `main`, Render tự build và deploy lại (không mất dữ liệu — dữ liệu nằm trong Postgres).

## Giới hạn gói free

- Web **ngủ sau 15 phút** không ai truy cập; lần mở sau chờ khoảng 1 phút. Reset tuần tự chạy bù khi thức dậy.
- **CSDL free hết hạn sau 30 ngày** (sau đó 14 ngày thì bị xóa). Muốn giữ dữ liệu: Render Dashboard → `thuy-han-lenh-db` → đổi sang gói trả phí *trước* hạn (khoảng $6/tháng; web luôn bật thêm $7/tháng).

## Bảo mật

- Khóa Discord chỉ nằm trong Render Dashboard, không nằm trong mã nguồn.
- CSDL không mở ra internet (`ipAllowList: []`), chỉ web service kết nối qua mạng riêng của Render.
- Đăng nhập thử (`DEV_LOGIN`) tắt ở bản online.
