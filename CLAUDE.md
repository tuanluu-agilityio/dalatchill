# Dalat Chill: hướng dẫn cho trợ lý AI

Trang tĩnh, một khu vườn 3D đi lại được (Three.js r187). Mục đích: người xem ghé vào thư giãn. Xem `README.md` để biết cấu trúc thư mục và cách dùng.

## Lệnh

- Chạy: `npm start` (http://localhost:8080). Phải qua HTTP, không mở tệp trực tiếp.
- Kiểm thử: `npm test`, tức `node --test`. Đừng dùng `node --test tests/`: lệnh đó hỏng trên Node 24.
- Deploy: `npx netlify-cli deploy --prod --build` (site `dalatchill`, https://dalatchill.netlify.app). Chỉ deploy khi được yêu cầu.

## Điều chủ dự án đã quyết

- Trang chủ phải là cảnh 3D dựng bằng code, người xem tự đi lại. Đừng đề xuất quay lại hướng dùng ảnh làm nền (bản đó nằm ở `photo.html`, chỉ để tham khảo).
- Hướng cải thiện là tăng độ chân thực. Được phép tải mô hình và ảnh chất liệu thật, miễn giấy phép cho dùng tự do.
- Giao diện và ghi chú trong tài liệu viết bằng tiếng Việt.
- Các điểm mở về thiết kế và kỹ thuật: tự quyết, ghi lại, báo sau. Việc khó hoàn tác hoặc hướng ra ngoài (deploy, đổi chế độ công khai của repo) vẫn cần được yêu cầu rõ.

## Quy ước mã

- Không có bước build, không có phụ thuộc npm lúc chạy. Three.js nằm trong `vendor/`, nạp qua importmap `"three"` trong `index.html`. Cần phần mở rộng mới thì chép từ gói `three@0.187.0` vào `vendor/jsm/`, giữ nguyên đường dẫn tương đối.
- Mô-đun ES, mỗi tệp một trách nhiệm. Logic thuần (`world.js`, `koi-sim3d.js`, phần lớn `src/`) không được nhập Three.js hay chạm DOM, để kiểm thử được bằng Node.
- Thay đổi logic thuần: viết bài kiểm thử trước, thấy nó hỏng, rồi mới sửa.
- Đơn vị là mét, trục Y hướng lên. Hằng số bản đồ (`POND`, `HOUSE`, `BRIDGE`, `START`, `BOUNDS`) chỉ khai báo ở `src3d/world.js`.
- Mọi vị trí ngẫu nhiên dùng `seeded()` trong `src3d/textures.js`, để cảnh giống nhau ở mỗi lần tải.

## Những chỗ dễ sai

- **Mô hình:** `loadModels()` trả về mỗi gói là một mảng biến thể đã sắp theo tên. Mã ở `flora.js`, `terrain.js`, `pond.js` chọn biến thể theo chỉ số, nên thêm hoặc bớt biến thể trong `tools/models/process.py` sẽ làm lệch chỉ số.
- **Kênh trong suốt:** bản glTF dạng JPG của Poly Haven bỏ mất alpha. `process.py` ghép bản đồ alpha tải riêng vào ảnh màu. Thêm cây mới mà quên bước này thì lá hiện thành tấm đen.
- **Màu lá:** bản quét thường tối. `LIFT` trong `src3d/models.js` nâng sáng theo tên vật liệu.
- **Lớp chi tiết:** cỏ, hoa nhỏ, cỏ dại nằm ở `DETAIL_LAYER` và bị tắt trong lượt vẽ phản chiếu của hồ (`pond.js`). Vật nhỏ, nhiều bản sao thì đặt vào lớp này.
- **Bóng đổ:** chỉ vẽ trong 3 giây đầu rồi giữ nguyên (`shadowMap.autoUpdate = false`). Vật chuyển động không nên đổ bóng. Thông đổ bóng bằng tấm ảnh, không bằng lưới.
- **Thông:** 14 cây gần nhất là lưới (6 trên máy cảm ứng), còn lại là hai tấm ảnh chéo nhau; danh sách xếp lại mỗi 1,5 m di chuyển.
- **Vòng đặt cây:** các vòng `do/while` trong `flora.js` và `pond.js` không giới hạn số lần thử. Đổi `inView`, `clearOf` hay kích thước nhà có thể làm trang treo ở màn hình chờ.
- **Va chạm:** vật cản mới phải thêm vào mảng `trunks` (`{ x, z, r }`).

## Kiểm tra bằng mắt

Phần 3D không có bài kiểm thử tự động. Sau khi sửa, mở trang, xem console không có lỗi và chụp ít nhất ba góc: điểm bắt đầu, trên cầu nhìn xuống hồ, trong rừng. `window.__garden` cho `{ player, school, renderer, scene, camera }` để di chuyển người xem và đo.

Đo tốc độ bằng `renderer.render()` rồi `gl.finish()` và lấy trung vị; `requestAnimationFrame` bị bóp khi cửa sổ bị che nên không tin được.

## Tài sản bên ngoài

Mỗi tệp tải về phải ghi tên gốc, tác giả, nguồn và giấy phép vào `CREDITS.md`. Hiện tất cả là Poly Haven, CC0.

## Việc còn treo

Xem mục "Hạn chế đã biết" trong `README.md`. Bản thiết kế và các quyết định trước đây: `docs/superpowers/specs/2026-11-12-dalat-chill-homepage-design.md`.
