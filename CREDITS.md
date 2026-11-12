# Nguồn gốc tài sản

## Hình ảnh

- `assets/scene.png`: bản sao của `dalatchill_nofish.png` do chủ dự án cung cấp.
- `assets/depth.png`: bản đồ chiều sâu suy ra từ `assets/scene.png` bằng mô hình Depth Anything V2 Small (`onnx-community/depth-anything-v2-small`, giấy phép Apache-2.0), chạy cục bộ qua `tools/make_depth.mjs`.
- `assets/masks.png`, `src/pond-data.js`: tạo bởi `tools/make_masks.py` từ các đường vẽ tay và ngưỡng màu trên `assets/scene.png`.
- Da cá koi: vẽ bằng mã lúc chạy (`src/koi-skins.js`), không dùng ảnh ngoài.

## Âm thanh

Toàn bộ âm thanh hiện được **tổng hợp trong trình duyệt** bằng Web Audio (`src/audio.js`): gió thông, nước róc rách, chim, ếch và dế, chuông gió, tiếng nước khi chạm hồ. Không có tệp ghi âm nào, nên không có giấy phép bên thứ ba.

Để thay một lớp bằng bản ghi âm thật, đặt tệp lặp liền mạch vào `assets/audio/` và khai báo trong `CONFIG.audioFiles` ở `src/config.js`, ví dụ `{ birds: 'assets/audio/birds.ogg' }`. Các lớp: `birds`, `wind`, `water`, `frogs`, `chimes`. Khi thêm tệp, ghi tác giả, nguồn và giấy phép vào đây.

## Thư viện

- Three.js r187 (`vendor/three.module.js`, `vendor/three.core.js`), giấy phép MIT, © three.js authors.
- Bộ nạp glTF của Three.js (`vendor/jsm/loaders/GLTFLoader.js`, `vendor/jsm/utils/SkeletonUtils.js`), giấy phép MIT.

## Mô hình 3D và ảnh chất liệu quét từ vật thật (bản 3D)

Tất cả lấy từ **Poly Haven** (https://polyhaven.com), giấy phép **CC0 1.0** (phạm vi công cộng, dùng tự do, không bắt buộc ghi công). Tải ngày 2026-11-12, bản 1k, qua API công khai `api.polyhaven.com`.

| Tệp trong `assets/models/` | Tài sản gốc | Tác giả |
|---|---|---|
| `pine.glb`, `pine_*_far*.png` | Pine Sapling Medium | Rob Tuytel, Rico Cilliers |
| `fern.glb` | Fern 02 | Rob Tuytel, Rico Cilliers |
| `shrub.glb` | Shrub 02 | Rico Cilliers |
| `understory.glb` | Shrub 03 | Rico Cilliers |
| `calathea.glb` | Calathea Orbifolia 01 | Rob Tuytel, Rico Cilliers |
| `grass.glb` | Grass Medium 01 | Rob Tuytel, Rico Cilliers |
| `grass_tuft.glb` | Grass Medium 02 | Rico Cilliers |
| `celandine.glb` | Celandine 01 | Rob Tuytel, Rico Cilliers |
| `ursinia.glb` | Flower Ursinia | Jenelle van Heerden, Rico Cilliers |
| `periwinkle.glb` | Periwinkle Plant | Amal Kumar |
| `weed.glb` | Weed Plant 02 | Rob Tuytel, Rico Cilliers |
| `rock.glb` | Rock Moss Set 02 | Kless Gyzen |
| `boulder.glb` | Rock Moss Set 01 | Kless Gyzen |
| `stump.glb` | Tree Stump 01 | Rob Tuytel |

| Tệp trong `assets/textures/` | Tài sản gốc | Tác giả |
|---|---|---|
| `leafy_grass_*.jpg` | Leafy Grass | Charlotte Baglioni |
| `forest_ground_04_*.jpg` | Forest Ground 04 | Rob Tuytel, Rico Cilliers |
| `gravel_floor_*.jpg` | Gravel Floor | Jenelle van Heerden, Matterfield |

Các mô hình đã được xử lý lại bằng Blender 4.5 (`tools/models/process.py`) cho nhẹ: chọn một số biến thể, giảm lưới đá và bụi cây, ghép bản đồ alpha vào ảnh màu, tỉa bớt lá kim của cây thông (bản gốc 1,5 đến 2,7 triệu tam giác mỗi cây) và kết xuất ảnh của chính các cây đó để dùng cho cây ở xa. Màu lá được nâng sáng lúc chạy (`src3d/models.js`). Hoa cẩm tú cầu, nhà, cầu, cá koi và lá súng vẫn dựng bằng mã.
