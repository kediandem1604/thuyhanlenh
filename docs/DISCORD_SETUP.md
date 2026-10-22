# Bật đăng nhập Discord cho Thủy Hàn Lệnh

Mất khoảng 5 phút. Bạn cần một tài khoản Discord (nên bật xác thực 2 lớp).

## Bước 1 — Tạo ứng dụng Discord

1. Mở https://discord.com/developers/applications và đăng nhập Discord.
2. Bấm **New Application** (góc trên bên phải).
3. Đặt tên, ví dụ `Thủy Hàn Lệnh` — tên này hiện trên màn hình "cho phép" khi thành viên đăng nhập.
4. Tick đồng ý điều khoản → **Create**.
5. (Tùy chọn) Trang **General Information**: thêm ảnh đại diện (PNG/JPG) và mô tả cho đẹp.

## Bước 2 — Lấy Client ID và Client Secret

1. Cột bên trái → **OAuth2**.
2. Mục **Client information** → **Client ID** → bấm **Copy**.
3. **Client Secret** → bấm **Reset Secret** → xác nhận (có thể phải nhập mã 2FA) → bấm **Copy** ngay. Discord chỉ hiện secret **một lần**; lỡ mất thì Reset lại.

## Bước 3 — Thêm địa chỉ chuyển hướng (Redirect)

1. Vẫn ở trang **OAuth2** → mục **Redirects** → **Add Redirect**.
2. Dán chính xác:
   ```
   http://localhost:5173/auth/discord/callback
   ```
3. Bấm **Save Changes** (thanh lưu hiện ở cuối trang).

Không cần dùng "OAuth2 URL Generator", không cần chọn scope, không cần tạo Bot — app tự tạo đường dẫn đăng nhập với quyền `identify` (chỉ đọc tên và ảnh đại diện).

## Bước 4 — Điền vào file `.env`

Mở file `.env` ở thư mục gốc dự án (nếu chưa có thì sao chép từ `.env.example`) và điền:

```
DISCORD_CLIENT_ID=dán-client-id-vào-đây
DISCORD_CLIENT_SECRET=dán-client-secret-vào-đây
DISCORD_REDIRECT_URI=http://localhost:5173/auth/discord/callback
```

Không thêm dấu cách hay dấu ngoặc kép quanh giá trị.

**(Tùy chọn) Chỉ định ai là Bang Chủ:** Discord → **Cài đặt người dùng → Nâng cao → Chế độ nhà phát triển** (bật) → bấm vào tên của bạn → **Sao chép ID người dùng** → điền `BOOTSTRAP_LEADER_DISCORD_ID=...`. Để trống thì **người đăng nhập Discord đầu tiên** trở thành Bang Chủ.

## Bước 5 — Khởi động lại máy chủ

Máy chủ chỉ đọc `.env` lúc khởi động: dừng `npm run dev` (Ctrl + C) rồi chạy lại.

```bash
npm run dev
```

Log của máy chủ phải có dòng `Discord: bật`.

## Bước 6 — Đăng nhập

1. Mở **http://localhost:5173** (dùng đúng `localhost`, không dùng `127.0.0.1`).
2. Bấm nút tím **Đăng nhập bằng Discord** → **Authorize / Cho phép**.
3. Bạn quay lại app:
   - Đang dùng dữ liệu demo → tài khoản của bạn gắn vào Bang Chủ demo "Dạ Lăng Phong" (đổi tên, tạo hình ở Hồ sơ / Xưởng Chibi).
   - Bang trống → bạn **lập bang mới** và trở thành Bang Chủ, tên lấy từ Discord.
4. Thành viên khác đăng nhập sẽ thấy màn **Nhập môn** → gửi đơn hoặc xin nhận danh tính → bạn (hoặc Trưởng Lão trở lên) duyệt ở trang **Chiêu Mộ**.

## Dùng bang thật thay cho bang demo

1. Dừng máy chủ.
2. Xóa thư mục `server/.data` (CSDL dev).
3. Trong `.env`: `SEED_DEMO=false`, và `DEV_LOGIN=false` nếu không cần đăng nhập thử.
4. Chạy lại `npm run dev`, đăng nhập Discord → bạn lập bang và là Bang Chủ.

Muốn giữ dữ liệu đã nhập ở bản demo cũ (chạy trong trình duyệt): ở bản cũ bấm **Xuất JSON**, rồi chạy `npm run db:import -- duong-dan-file.json`.

## Khi đưa lên mạng (production)

1. Discord Developer Portal → OAuth2 → **Add Redirect** thứ hai: `https://ten-mien-cua-ban/auth/discord/callback`.
2. Trên máy chủ: `WEB_ORIGIN=https://ten-mien-cua-ban`, `DISCORD_REDIRECT_URI=https://ten-mien-cua-ban/auth/discord/callback`, `DEV_LOGIN=false`.
3. Bắt buộc chạy sau HTTPS (cookie phiên bật `Secure` ở production).

## Gặp lỗi?

| Hiện tượng | Nguyên nhân & cách sửa |
|---|---|
| Discord báo **Invalid OAuth2 redirect_uri** | Redirect trong Developer Portal không khớp từng ký tự với `DISCORD_REDIRECT_URI` (http/https, cổng `5173`, dấu `/` thừa cuối). |
| Quay về app với "Phiên đăng nhập hết hạn hoặc không hợp lệ" | Mở app bằng `127.0.0.1` thay vì `localhost`, hoặc để trang Discord quá 10 phút. Mở lại bằng `http://localhost:5173`. |
| "Discord từ chối mã đăng nhập" | Client Secret sai hoặc đã bị Reset — copy lại secret mới vào `.env`, khởi động lại. |
| Không thấy nút Discord | Chưa khởi động lại máy chủ sau khi sửa `.env`, hoặc thiếu `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET`. |
| Đăng nhập xong nhưng phải "Nhập môn" dù là chủ bang | Đã có người Discord khác vào trước và thành Bang Chủ. Đặt `BOOTSTRAP_LEADER_DISCORD_ID` là ID của bạn trên một CSDL mới, hoặc nhờ Bang Chủ hiện tại truyền ngôi. |

## Bảo mật

- **Client Secret giống mật khẩu**: không gửi cho ai, không chụp màn hình đăng lên nhóm, không đưa lên GitHub (`.env` đã nằm trong `.gitignore`).
- Nghi bị lộ → Developer Portal → **Reset Secret** → cập nhật `.env` → khởi động lại máy chủ.
- App chỉ xin quyền `identify`: không đọc tin nhắn, không vào được server Discord của bạn.
