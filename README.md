# Dalat Chill

Một khu vườn Đà Lạt dựng bằng 3D để ghé vào thư giãn vài phút: nhà gỗ, hồ cá koi, rừng thông trong sương, tiếng gió và chim. Người xem tự đi lại trong vườn như đang ở đó.

**Xem trực tiếp:** https://dalatchill.netlify.app

## Cách dùng

| Thao tác | Kết quả |
|---|---|
| Kéo chuột hoặc ngón tay | Nhìn quanh |
| `W` `A` `S` `D` hoặc phím mũi tên lên/xuống | Đi |
| Mũi tên trái/phải, `Q` `E` | Xoay người |
| Bấm xuống đất | Đi tới chỗ đó |
| Bấm vào mặt hồ | Tạo gợn nước, cá bơi tránh |
| `T` hoặc nút "Dạo quanh khu vườn" | Tự động dạo một vòng |
| `M` hoặc nút âm thanh | Bật/tắt tiếng |

Âm thanh chỉ bắt đầu sau lần bấm hoặc gõ phím đầu tiên, vì trình duyệt yêu cầu vậy.

## Chạy trên máy

Cần Node.js (đã chạy với bản 24). Không có bước cài đặt hay build.

```bash
npm start        # mở http://localhost:8080
npm test         # chạy bài kiểm thử (node --test)
```

Phải chạy qua máy chủ HTTP; mở thẳng `index.html` từ ổ đĩa sẽ không tải được mô-đun và mô hình.

## Cấu trúc

```
index.html            trang chủ: khu vườn 3D (nạp src3d/main3d.js)
photo.html            bản cũ "bức ảnh sống" (nạp src/main.js), giữ lại để tham khảo
src3d/                mã khu vườn 3D
  world.js            bản đồ: hồ, nhà, cầu, lối đi, chỗ nào đi được (thuần logic, có test)
  koi-sim3d.js        hành vi đàn cá (thuần logic)
  models.js           nạp mô hình .glb và rải thành nhiều bản sao
  flora.js            thông, dương xỉ, bụi cây, cẩm tú cầu, hoa, cỏ
  terrain.js          mặt đất và đá lát lối đi
  pond.js             mặt nước, đá quanh hồ, lá súng, cầu
  house.js            nhà gỗ
  atmosphere.js       trời, nắng, sương, bóng đổ
  koi3d.js            hình cá koi
  player.js           người xem: đi lại, nhìn quanh, dạo tự động
  main3d.js           khởi động, giao diện, vòng lặp khung hình
src/                  mã bản ảnh; src/audio.js dùng chung cho cả hai bản
assets/models/        mô hình quét thật đã xử lý (.glb) và ảnh thông cho tầm xa
assets/textures/      ảnh chụp nền đất
vendor/               Three.js r187 và các phần mở rộng, chép sẵn (không dùng npm)
tools/models/         kịch bản tải và xử lý mô hình bằng Blender
tests/                bài kiểm thử cho phần logic thuần
docs/superpowers/     bản thiết kế và kế hoạch
```

## Tài sản

Cây cỏ, đá và ảnh nền đất lấy từ [Poly Haven](https://polyhaven.com), giấy phép CC0. Âm thanh được tổng hợp trong trình duyệt, không dùng tệp ghi âm. Danh sách đầy đủ, tác giả và giấy phép ở [CREDITS.md](CREDITS.md).

Để dựng lại các gói mô hình từ bản gốc (cần Blender 4.5 và Python):

```bash
python tools/models/download.py <thư mục json> <thư mục raw> <tên tài sản...>
python tools/models/download_alpha.py <thư mục json> <thư mục raw>
blender -b --factory-startup --python tools/models/process.py -- <thư mục raw> assets/models <tên gói...>
```

Tên gói và cách xử lý từng gói nằm trong bảng `PACKS` ở đầu `tools/models/process.py`.

## Đưa lên mạng

Trang chạy trên Netlify. `netlify.toml` chỉ xuất bản những gì trang cần (không có tài liệu, bài kiểm thử, công cụ).

```bash
npx netlify-cli deploy --prod --build
```

Site chưa nối với repo GitHub, nên đẩy mã lên GitHub không tự deploy lại.

## Hạn chế đã biết

- Lần tải đầu khoảng 50 MB và chưa có thanh tiến độ.
- Chưa kiểm tra trên điện thoại.
- Nhà, cầu, cá koi, lá súng và bông cẩm tú cầu vẫn dựng bằng mã, chưa phải mô hình quét.
- Chế độ giảm chuyển động (`prefers-reduced-motion`) mới chỉ tắt nhún đầu khi đi.
- Phần hiển thị 3D chưa có bài kiểm thử tự động; chỉ kiểm bằng mắt trong trình duyệt.
