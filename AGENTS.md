# Hướng dẫn cho trợ lý AI

Toàn bộ hướng dẫn nằm trong [CLAUDE.md](CLAUDE.md): lệnh chạy và kiểm thử, các quyết định của chủ dự án, quy ước mã, những chỗ dễ sai và cách kiểm tra bằng mắt. Đọc tệp đó trước khi sửa mã.

Tóm tắt nhanh:

- Chạy `npm start`, kiểm thử `npm test`. Không có bước build.
- Trang chủ là khu vườn 3D trong `src3d/`; `photo.html` và phần lớn `src/` là bản cũ.
- Three.js nằm sẵn trong `vendor/`; đừng thêm phụ thuộc npm lúc chạy.
- Tài sản tải về phải ghi nguồn và giấy phép vào `CREDITS.md`.
- Chỉ deploy hoặc đổi cài đặt repo khi được yêu cầu rõ.
