# Dalat Chill Homepage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Một trang tĩnh duy nhất biến `dalatchill_nofish.png` thành cảnh sống: nước gợn, koi bơi, sương, nắng, âm thanh, và 5 góc tham quan.

**Architecture:** Ảnh nền là nguồn của mọi điểm ảnh; một shader toàn màn hình làm lệch và cộng sáng lên ảnh dựa trên bản đồ chiều sâu và các mặt nạ. Cá được vẽ vào một render target riêng rồi được shader nước lấy mẫu (khúc xạ, nhuộm màu nước, phản chiếu đè lên). Logic thuần (máy quay, cá, gợn sóng, trộn âm) tách khỏi WebGL và Web Audio để chạy được bằng `node --test`.

**Tech Stack:** HTML, CSS, ES modules không build; Three.js đặt sẵn trong `vendor/`; Web Audio API; Node 24 (`node --test`) cho kiểm thử; Python cho công cụ tạo mặt nạ.

**Spec:** `docs/superpowers/specs/2026-11-12-dalat-chill-homepage-design.md`

## Global Constraints

- Ảnh nền: `dalatchill_nofish.png` 1408×768, đường dẫn khai báo một chỗ duy nhất trong `src/config.js`.
- Mặt nạ và mọi tọa độ dùng hệ tỉ lệ ảnh `(u, v)` trong [0,1], gốc ở góc trên trái, v hướng xuống.
- Không CDN, không bước build, không backend, không phân tích truy cập.
- Giới hạn devicePixelRatio ở 2. Mục tiêu 60 fps ở 1080p trên card tích hợp.
- Mức phóng tối đa khoảng 2 lần so với toàn cảnh.
- Giao diện tiếng Việt, tự mờ sau 4000 ms không rê chuột.
- Tự dạo dừng 20000 ms mỗi góc; chuyển góc 3500 ms.
- 8–12 con koi (mặc định 10).
- Âm thanh chỉ bắt đầu sau cử chỉ đầu tiên của người xem, hòa lên trong 3 s.
- Tạm dừng vẽ và âm thanh khi tab ẩn.
- `prefers-reduced-motion`: tắt dịch theo chuột, chuyển góc bằng mờ dần.
- Không có WebGL: hiện ảnh tĩnh và một dòng thông báo.
- Dự án không dùng git: bỏ qua mọi bước commit.
- Chạy thử: `npx http-server -p 8080 -c-1 .` (hoặc `python -m http.server 8080`). Kiểm thử: `node --test`.

## Review Focus

1. Tab bị ẩn lâu rồi quay lại (dt rất lớn): cá không được nhảy ra ngoài hồ. Test ở Task 4.
2. Bấm liên tục vào hồ: số gợn sóng bị chặn, không tụt khung hình. Test ở Task 3.
3. Bấm một góc khác khi máy quay đang trôi: chuyển hướng mượt từ vị trí hiện tại, không giật về góc cũ. Test ở Task 7.
4. Cửa sổ rất rộng hoặc rất hẹp, đổi kích thước giữa chừng: khung nhìn không bao giờ lộ ra ngoài mép ảnh. Test ở Task 1.
5. Tệp âm thanh tải lỗi hoặc không giải mã được: trang vẫn chạy, không có lỗi chưa bắt. Test ở Task 8.

## File Structure

| Tệp | Trách nhiệm |
|---|---|
| `index.html`, `css/style.css` | Khung trang, lớp giao diện, màn hình tải, ảnh dự phòng |
| `vendor/three.module.js` | Three.js đặt sẵn |
| `assets/scene.png` | Bản sao ảnh nền |
| `assets/depth.png` | Bản đồ chiều sâu (trắng = gần) |
| `assets/masks.png` | R = nước (đã trừ lá súng và đá), G = cây lá đung đưa, B = đèn |
| `assets/koi/` | Da cá |
| `assets/audio/` | Các vòng lặp âm thanh |
| `src/config.js` | Hằng số và danh sách góc nhìn |
| `src/camera.js` | Toán khung nhìn, CameraRig, tự dạo (thuần) |
| `src/pond.js`, `src/pond-data.js` | Đa giác hồ, kiểm tra trong hồ, tỉ lệ phối cảnh (thuần) |
| `src/ripples.js` | Danh sách gợn sóng do bấm (thuần) |
| `src/koi-sim.js` | Hành vi đàn cá (thuần) |
| `src/koi-render.js` | Lưới cá uốn và render target |
| `src/scene.js` | Renderer, shader cảnh |
| `src/ambient.js` | Bướm, chuồn chuồn, bụi sáng, khói |
| `src/audio.js` | Trộn âm (thuần) và AudioEngine |
| `src/ui.js` | Điểm sáng, nút, bàn phím, tự mờ |
| `src/main.js` | Nối tất cả, vòng lặp khung hình |
| `tools/` | Script tạo chiều sâu, mặt nạ, đa giác hồ, da cá |
| `tests/*.test.js` | Kiểm thử logic thuần |
| `CREDITS.md` | Nguồn và giấy phép âm thanh, thư viện |

---

### Task 1: Khung trang và cảnh tĩnh trùng ảnh

**Files:**
- Create: `package.json` (`"type": "module"`), `index.html`, `css/style.css`, `vendor/three.module.js`, `assets/scene.png`, `src/config.js`, `src/camera.js`, `src/scene.js`, `src/main.js`
- Test: `tests/camera.test.js`

**Interfaces:**
- Produces:
  - `config.js`: `CONFIG = { image, imageAspect: 1408/768, maxDpr: 2, uiIdleMs: 4000, tourDwellMs: 20000, moveMs: 3500, koiCount: 10, maxRipples: 8, parallax: 0.012 }`
  - `config.js`: `VIEWS = [{ id, label, cx, cy, zoom, audio }]` theo thứ tự `overview`, `pond`, `bridge`, `porch`, `hydrangea`, `path`. Giá trị khởi điểm: overview (0.5, 0.5, 1); pond (0.52, 0.80, 1.9); bridge (0.80, 0.70, 2.0); porch (0.60, 0.47, 2.0); hydrangea (0.10, 0.56, 2.0); path (0.14, 0.84, 1.9). `audio` lần lượt: `null`, `water`, `frogs`, `chimes`, `birds`, `wind`.
  - `camera.js`: `visibleRect(view, viewAspect, imgAspect) -> { u0, v0, u1, v1 }` (vùng ảnh đang thấy, kiểu cover); `clampView(view, viewAspect, imgAspect) -> view` (đẩy tâm vào để vùng thấy nằm trọn trong ảnh); `screenToImage(sx, sy, view, viewAspect, imgAspect) -> [u, v]` với `sx, sy` trong [0,1]; `imageToScreen(u, v, view, viewAspect, imgAspect) -> [sx, sy]`.
  - `scene.js`: `createScene(canvas) -> { setView(view), setTime(t), resize(), render(), uniforms }`.

- [ ] **Step 1: Viết test thất bại** trong `tests/camera.test.js`:
  - `visibleRect` với overview, `viewAspect === imgAspect` trả về đúng `{0,0,1,1}`.
  - Với `viewAspect = 1.0` (hẹp hơn ảnh) và `viewAspect = 3.5` (rộng hơn), vùng thấy có `u1-u0 <= 1`, `v1-v0 <= 1`, và đúng một chiều bằng 1 ở zoom 1.
  - `clampView` với mọi góc trong `VIEWS` và các `viewAspect` 0.5, 1, 1.83, 3.5: vùng thấy thỏa `u0 >= 0, v0 >= 0, u1 <= 1, v1 <= 1` (Review Focus 4).
  - `imageToScreen(screenToImage(p))` trả lại `p` với sai số 1e-9.
- [ ] **Step 2:** Chạy `node --test` và thấy lỗi thiếu mô-đun.
- [ ] **Step 3:** Viết `config.js` và `camera.js`.
- [ ] **Step 4:** Chạy `node --test`, tất cả qua.
- [ ] **Step 5:** Tải Three.js bản ổn định mới nhất vào `vendor/three.module.js` (qua `npm pack three`, lấy `build/three.module.js` và tệp lõi nó nhập nếu có). Sao `dalatchill_nofish.png` thành `assets/scene.png`.
- [ ] **Step 6:** Viết `index.html`, `style.css`, `scene.js`, `main.js`: canvas phủ kín cửa sổ, một quad toàn màn hình lấy mẫu `scene.png` theo `visibleRect`, không đổi màu (tắt tone mapping, xuất sRGB đúng). Nếu không tạo được ngữ cảnh WebGL: hiện `<img>` tĩnh và dòng "Trình duyệt không hỗ trợ hiệu ứng, đang hiển thị ảnh tĩnh."
- [ ] **Step 7: Kiểm bằng mắt.** Mở trang ở cửa sổ 1408×768, chụp màn hình, so với `dalatchill_nofish.png`: bố cục và màu phải trùng. Đổi kích thước cửa sổ: không lộ mép.

### Task 2: Bản đồ chiều sâu, mặt nạ, đa giác hồ

**Files:**
- Create: `tools/make_depth.py`, `tools/make_masks.py`, `tools/overlay_check.py`, `assets/depth.png`, `assets/masks.png`, `src/pond-data.js`, `src/pond.js`
- Test: `tests/pond.test.js`

**Interfaces:**
- Produces:
  - `pond-data.js`: `POND_POLYGON: [u, v][]` (đường bao vùng nước bơi được, đã thu vào trong bờ một khoảng nhỏ), `OBSTACLES: { u, v, r }[]` (lá súng và đá nổi mà cá vẫn bơi bên dưới, chỉ dùng để tham khảo).
  - `pond.js`: `pointInPond(u, v) -> boolean`; `distanceToShore(u, v) -> number` (dương khi ở trong); `nearestInside(u, v) -> [u, v]`; `perspectiveScale(v) -> number` (1 ở mép gần nhất của hồ, giảm tuyến tính về khoảng 0.45 ở mép xa); `randomPointInPond(rng) -> [u, v]`.

- [ ] **Step 1:** `make_depth.py`: thử mô hình ước lượng chiều sâu chạy cục bộ (Depth Anything V2 Small qua `transformers`). Nếu không cài được trong 10 phút, dựng chiều sâu bằng tay: gradient theo v cộng các vùng vẽ tay cho trời, rừng xa, nhà, tiền cảnh. Xuất `assets/depth.png` 8 bit, làm mờ nhẹ để không có bậc.
- [ ] **Step 2:** `make_masks.py`: mặt nạ nước từ đa giác vẽ tay tinh chỉnh bằng ngưỡng màu, trừ lá súng và đá; mặt nạ đung đưa cho dương xỉ, cỏ lau, hoa tiền cảnh (không gồm thân thông, nhà, đá, cầu); mặt nạ đèn cho hai đèn hiên và các cửa sổ sáng. Mép mặt nạ làm mềm 2–3 px. Xuất `assets/masks.png` cùng kích thước ảnh, và ghi `src/pond-data.js`.
- [ ] **Step 3:** `overlay_check.py` xuất ảnh chồng từng kênh lên ảnh nền vào thư mục scratchpad. Xem từng ảnh; sửa cho tới khi mép nước bám đúng bờ đá và không kênh nào tràn sang nhà hay cầu.
- [ ] **Step 4: Viết test thất bại** trong `tests/pond.test.js`: tâm hồ `(0.52, 0.80)` trong hồ; `(0.60, 0.45)` (nhà) và `(0.05, 0.9)` ngoài hồ; `nearestInside` của một điểm ngoài trả về điểm có `pointInPond === true`; `perspectiveScale` giảm đơn điệu khi v giảm; 1000 điểm từ `randomPointInPond` đều trong hồ.
- [ ] **Step 5:** Viết `pond.js`, chạy `node --test`, tất cả qua.

### Task 3: Mặt nước và gợn sóng

**Files:**
- Create: `src/ripples.js`
- Modify: `src/scene.js`, `src/main.js`
- Test: `tests/ripples.test.js`

**Interfaces:**
- Consumes: `screenToImage`, `pointInPond`, `CONFIG.maxRipples`.
- Produces: `ripples.js`: `class RippleField { add(u, v, tSec): boolean; active(tSec): { u, v, age }[]; }`. Mỗi gợn sống 4 s. `add` trả `false` và không thêm nếu điểm ngoài hồ. Khi đã đủ `maxRipples`, gợn cũ nhất bị thay. `scene.js` nhận `setRipples(list)`.

- [ ] **Step 1: Viết test thất bại:** thêm ngoài hồ trả `false`; thêm 50 gợn liên tiếp thì `active().length <= 8` (Review Focus 2); gợn biến mất sau 4 s; `age` tăng đúng theo thời gian.
- [ ] **Step 2:** Chạy test, thấy thất bại. Viết `ripples.js`. Chạy lại, qua.
- [ ] **Step 3:** Trong shader, tại vùng R của mặt nạ: làm lệch tọa độ lấy mẫu bằng tổng vài lớp nhiễu trôi chậm, biên độ nhỏ dần theo chiều sâu (xa thì sóng nhỏ và dẹt theo phối cảnh); cộng vòng gợn từ `setRipples` (sóng tròn bị nén theo trục dọc, tắt dần theo tuổi và bán kính); thêm lấp lánh thưa ở vùng nước sáng. Mép mặt nạ pha mềm để bờ đá không rung.
- [ ] **Step 4:** `main.js`: bấm hoặc chạm vào canvas thì đổi sang `(u, v)` và gọi `ripples.add`.
- [ ] **Step 5: Kiểm bằng mắt.** Chụp hai khung cách nhau 1 s: hình phản chiếu căn nhà rung nhẹ, bờ đá và lá súng đứng yên. Bấm vào hồ: vòng gợn lan ra. Bấm ngoài hồ: không có gì.

### Task 4: Hành vi đàn cá

**Files:**
- Create: `src/koi-sim.js`
- Test: `tests/koi-sim.test.js`

**Interfaces:**
- Consumes: `pond.js`.
- Produces:
  - `createSchool(count, rng) -> Koi[]`, với `Koi = { u, v, heading, speed, turn, phase, size, skin, mood }`. `heading` tính bằng radian trong không gian mặt hồ đã bỏ nén phối cảnh; `size` trong khoảng 0.8–1.25; `skin` là chỉ số da.
  - `stepSchool(school, dtSec, tSec, rng)`: cập nhật tại chỗ. `dtSec` bị chặn ở 0.1.
  - `disturb(school, u, v, tSec)`: cá trong bán kính gần bơi tản ra nhanh trong khoảng 1 s, sau đó chuyển `mood` sang tò mò và bơi lại gần điểm đó trong khoảng 6 s.
  - Hằng số xuất: `SQUASH` (tỉ lệ nén trục dọc của mặt hồ do phối cảnh), dùng chung với shader gợn sóng.

- [ ] **Step 1: Viết test thất bại** (dùng rng có hạt giống cố định):
  - `createSchool(10)` cho 10 con, tất cả trong hồ.
  - Chạy 60 s mô phỏng ở dt 1/60: mọi con luôn `pointInPond`.
  - Một bước với `dtSec = 600` (Review Focus 1): mọi con vẫn trong hồ.
  - Sau 30 s, không cặp nào gần nhau hơn nửa chiều dài thân trong hơn 1 s liên tiếp.
  - Tốc độ luôn trong khoảng [min, max] đã định; đổi hướng mỗi bước không vượt tốc độ quay tối đa (không giật đầu).
  - Sau `disturb` tại tâm hồ: trong 1 s khoảng cách trung bình của các con gần đó tới điểm bấm tăng; sau 6 s giảm xuống dưới mức ban đầu.
- [ ] **Step 2:** Chạy test, thấy thất bại.
- [ ] **Step 3:** Viết `koi-sim.js`. Hướng tiếp cận: mỗi con lang thang theo nhiễu mượt trên tốc độ quay, có các pha lững lờ và tăng tốc ngắn; lực tránh bờ tăng dần theo `distanceToShore`; lực tách khỏi con gần; `phase` tăng theo tốc độ để nhịp quẫy đuôi khớp tốc độ bơi. Sau mỗi bước, con nào ra ngoài thì đặt về `nearestInside` và quay đầu vào trong.
- [ ] **Step 4:** Chạy `node --test`, tất cả qua.

### Task 5: Vẽ cá dưới mặt nước, rồi mốc duyệt sớm

**Files:**
- Create: `src/koi-render.js`, `tools/make_koi_skins.py`, `assets/koi/skins.png`
- Modify: `src/scene.js`, `src/main.js`

**Interfaces:**
- Consumes: `Koi`, `SQUASH`, `perspectiveScale`, `RippleField`.
- Produces: `createKoiRenderer(renderer, count) -> { update(school, tSec), render(view, viewAspect), texture }`. `texture` là render target trong không gian ảnh (màu cá nhân trước với alpha). `scene.js` nhận `setKoiTexture(tex)`.

- [ ] **Step 1:** Da cá: thử cắt các con koi nhìn rõ nhất từ `dalatchill.png` và nắn thẳng thành dải da nhìn từ trên xuống. Nếu kết quả mờ hoặc lẫn nước, vẽ da bằng thủ tục (nền trắng ngà hoặc cam, mảng đỏ cam ngẫu nhiên, vây mờ) với bảng màu lấy mẫu từ ảnh gốc. Xuất atlas `skins.png` ít nhất 5 kiểu.
- [ ] **Step 2:** Lưới cá: dải gồm khoảng 16 đốt dọc thân, có vây ngực và đuôi; trong vertex shader, uốn thân bằng sóng chạy từ đầu về đuôi với biên độ lớn dần về đuôi, pha lấy từ `koi.phase`, cộng độ cong theo `koi.turn`. Đặt theo `(u, v)`, xoay theo `heading`, nén trục dọc bằng `SQUASH`, nhân `perspectiveScale(v) * size`.
- [ ] **Step 3:** Ghép trong shader cảnh, chỉ tại vùng nước: lấy mẫu `koiTexture` bằng tọa độ đã bị gợn sóng làm lệch; nhuộm cá về màu nước tại chỗ và giảm tương phản theo độ sâu giả định; thêm bóng mờ lệch nhẹ dưới thân; pha phần sáng của ảnh nền (hình phản chiếu) đè lên cá để cá nằm dưới mặt nước chứ không nổi trên mặt. Mặt nạ R đã trừ lá súng và đá nên cá tự bị che ở đó.
- [ ] **Step 4:** `main.js`: mỗi khung gọi `stepSchool`, `update`, `render`; bấm vào hồ gọi thêm `disturb`.
- [ ] **Step 5: Kiểm bằng mắt.** Chụp ảnh ở toàn cảnh và ở góc hồ, so với `dalatchill.png` về kích cỡ, màu, độ chìm của cá. Chụp chuỗi 5 khung liên tiếp để kiểm thân uốn và không có con nào ló ra ngoài bờ. Đo fps bằng bộ đếm tạm.
- [ ] **Step 6: MỐC DUYỆT SỚM.** Dừng lại, báo chủ dự án cách mở trang, kèm ảnh chụp và các quyết định đã tự đưa ra. Chờ góp ý về cá và nước trước khi làm Task 6 trở đi.

### Task 6: Sương, nắng, cây lá, đèn, chiều sâu, chi tiết nhỏ

**Files:**
- Create: `src/ambient.js`
- Modify: `src/scene.js`, `src/main.js`

**Interfaces:**
- Consumes: `depth.png`, kênh G và B của `masks.png`, `CONFIG.parallax`.
- Produces: `scene.setPointer(x, y)` với x, y trong [-1, 1]; `createAmbient(scene) -> { update(tSec, view) }`.

- [ ] **Step 1:** Dịch theo chuột: lệch tọa độ lấy mẫu theo `depth * pointer * CONFIG.parallax`, làm mượt chuyển động con trỏ. Tắt khi `prefers-reduced-motion`.
- [ ] **Step 2:** Sương: nhiễu trôi ngang rất chậm, cường độ theo chiều sâu (chỉ ở rừng phía sau nhà), màu lấy theo sương trong ảnh.
- [ ] **Step 3:** Nắng: các vệt sáng tỏa từ khoảng `(0.07, 0.10)`, cộng sáng rất nhẹ, đổi cường độ chậm.
- [ ] **Step 4:** Đung đưa: tại vùng G, lệch tọa độ theo nhiễu tần số thấp, biên độ lớn hơn ở phần ngọn. Đèn: tại vùng B, nhân độ sáng dao động khoảng ±6%.
- [ ] **Step 5:** `ambient.js`: 2–3 con bướm quanh bụi hoa, 1–2 chuồn chuồn trên mặt hồ, bụi sáng trong vệt nắng, khói mỏng từ ống khói tại khoảng `(0.533, 0.24)`. Kích cỡ theo chiều sâu tại vị trí.
- [ ] **Step 6: Kiểm bằng mắt** ở cả 6 góc: không méo ở mép vật thể, nhà và thân thông đứng yên. Chi tiết nào trông giả thì giảm hoặc bỏ, ghi lại. Đo lại fps.

### Task 7: Tham quan và giao diện

**Files:**
- Create: `src/ui.js`
- Modify: `src/camera.js`, `src/main.js`, `index.html`, `css/style.css`
- Test: `tests/camera.test.js`

**Interfaces:**
- Produces:
  - `camera.js`: `class CameraRig { constructor(views, { moveMs, dwellMs }); index; touring; goTo(i); next(); prev(); startTour(); stopTour(); update(dtMs) -> view; progress }`. `update` trả về view hiện tại đã nội suy (chưa clamp). Chuyển động dùng easing mềm hai đầu; `goTo` khi đang trôi bắt đầu từ view hiện tại.
  - `ui.js`: `createUI({ rig, onMute, onFirstGesture }) -> { layout(viewAspect), setMuted(b) }`.

- [ ] **Step 1: Viết test thất bại** cho `CameraRig`:
  - `goTo(1)` rồi `update` tổng 3500 ms: view bằng `VIEWS[1]`.
  - Giữa chừng (1750 ms) gọi `goTo(3)`: view ngay sau đó bằng view ngay trước đó với sai số 1e-6, và sau 3500 ms nữa bằng `VIEWS[3]` (Review Focus 3).
  - `startTour()`: lần lượt qua chỉ số 1..5 rồi quay lại 1, mỗi góc dừng 20000 ms; `stopTour()` giữ nguyên góc hiện tại.
  - `next()` ở góc 5 về 0; `prev()` ở 0 về 5.
- [ ] **Step 2:** Chạy test, thấy thất bại. Viết `CameraRig`. Chạy lại, qua.
- [ ] **Step 3:** `ui.js` và HTML/CSS: tên "Dalat Chill" góc trên trái; nút âm thanh góc trên phải; nút "Dạo quanh khu vườn" giữa dưới; 5 điểm sáng đặt bằng `imageToScreen` tại tâm từng góc và cập nhật mỗi khung; nút "Toàn cảnh" khi đang ở một góc; nhãn tên góc hiện mờ khi tới nơi. Tất cả mờ đi sau 4000 ms không có chuột hoặc chạm.
- [ ] **Step 4:** Phím: trái phải gọi `prev`/`next`, Esc về 0, M tắt bật tiếng. Bấm bất kỳ đâu khi đang tự dạo thì `stopTour()`. Bấm vào điểm sáng không tạo gợn sóng.
- [ ] **Step 5:** `prefers-reduced-motion`: chuyển góc bằng mờ dần qua màu tối rồi hiện, không trôi.
- [ ] **Step 6:** Điện thoại: kéo ngang để dịch tâm nhìn khi ảnh bị cắt; phân biệt kéo với chạm bằng ngưỡng 8 px.
- [ ] **Step 7: Kiểm bằng mắt.** Chụp cả 6 góc ở 1920×1080; chỉnh `cx, cy, zoom` trong `VIEWS` cho bố cục đẹp và ảnh chưa vỡ rõ. Thử tự dạo một vòng.

### Task 8: Âm thanh

**Files:**
- Create: `src/audio.js`, `assets/audio/*`, `CREDITS.md`
- Modify: `src/main.js`, `src/ui.js`
- Test: `tests/audio.test.js`

**Interfaces:**
- Produces:
  - `mixFor(viewId, muted) -> { master, birds, wind, water, frogs, chimes }` (thuần). Nền: birds 0.5, wind 0.4, water 0.3, frogs 0, chimes 0. Lớp riêng của góc được nâng lên 0.85 (frogs, chimes từ 0). `muted` thì `master` bằng 0, ngược lại 1.
  - `class AudioEngine { constructor(manifest); async start(); setView(viewId); setMuted(b); splash(); suspend(); resume(); failed: string[] }`. Gain chuyển trong 2.5 s; `start` hòa `master` lên trong 3 s. Trạng thái tắt tiếng lưu ở `localStorage` khóa `dalatchill.muted`.

- [ ] **Step 1: Viết test thất bại:** `mixFor('overview', false)` đúng mức nền; `mixFor('porch', false).chimes === 0.85`; `mixFor('pond', false).water === 0.85`; `mixFor('bridge', true).master === 0`; mọi `id` trong `VIEWS` cho kết quả đủ 6 khóa trong [0,1]. Với `AudioEngine` dùng `AudioContext` giả và `fetch` giả luôn lỗi: `start()` không ném lỗi, `failed` chứa tên các lớp, `setView` và `splash` không ném lỗi (Review Focus 5).
- [ ] **Step 2:** Chạy test, thấy thất bại. Viết `audio.js`. Chạy lại, qua.
- [ ] **Step 3:** Tìm 5 vòng lặp CC0 hoặc phạm vi công cộng (chim rừng sớm, gió qua thông, nước chảy nhẹ, ếch và côn trùng, chuông gió) và một tiếng nước khẽ. Cắt, chuẩn hóa âm lượng, làm liền điểm nối (crossfade đầu cuối), xuất định dạng nén chạy trên mọi trình duyệt đích. Lớp nào không tìm được: tổng hợp bằng Web Audio trong `audio.js` và đánh dấu trong `CREDITS.md`.
- [ ] **Step 4:** Ghi `CREDITS.md`: tên tệp, tác giả, đường dẫn nguồn, giấy phép cho từng âm thanh, và Three.js.
- [ ] **Step 5:** Nối: cử chỉ đầu tiên gọi `start()`; `rig` đổi góc gọi `setView`; bấm hồ gọi `splash()`; `visibilitychange` gọi `suspend`/`resume` và dừng vòng lặp vẽ.
- [ ] **Step 6: Kiểm.** Bảng điều khiển không có lỗi; dùng `AnalyserNode` tạm để xác nhận có tín hiệu ở từng lớp và mức đổi khi chuyển góc. Ghi rõ trong báo cáo rằng chất lượng nghe chưa được kiểm.

### Task 9: Kiểm chứng cuối

**Files:**
- Modify: theo kết quả kiểm

- [ ] **Step 1:** `node --test`: tất cả qua.
- [ ] **Step 2:** Màn hình tải: hiện tới khi ảnh, mặt nạ, da cá tải xong rồi cảnh hiện dần. Âm thanh tải nền, không chặn cảnh.
- [ ] **Step 3:** Chụp khung đầu tiên ở 1408×768, so với `dalatchill_nofish.png`: chỉ khác ở cá, gợn nước và lớp giao diện.
- [ ] **Step 4:** Chụp 6 góc ở 1920×1080, kiểm độ nét và méo ảnh.
- [ ] **Step 5:** Đo fps ở 1080p trong 30 s ở toàn cảnh và ở góc hồ.
- [ ] **Step 6:** Thử: cửa sổ hẹp kiểu điện thoại dọc, tab ẩn 1 phút rồi quay lại, bấm hồ 30 lần liên tiếp, đổi góc liên tục, bật giảm chuyển động.
- [ ] **Step 7:** Gỡ bộ đếm fps và mã gỡ lỗi tạm. Báo chủ dự án: kết quả từng mục, danh sách quyết định đã tự đưa ra, và phần âm thanh cần họ nghe duyệt.
