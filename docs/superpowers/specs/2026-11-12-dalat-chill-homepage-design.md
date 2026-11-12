# Dalat Chill: trang chủ "bức ảnh sống"

Ngày: 2026-11-12. Trạng thái: đã duyệt. Chủ dự án giao người dựng tự quyết các điểm còn mở, ghi lại và báo sau.

Hai điểm mở cuối cùng, người viết tự quyết theo ủy quyền đó:

- **Ảnh:** dựng với `dalatchill_nofish.png` 1408×768 hiện có. Người dựng được phép phóng to chính ảnh này bằng công cụ cục bộ nếu kết quả giữ nguyên vị trí mọi vật thể và trông nét hơn; nếu không thì dùng ảnh gốc và giới hạn mức phóng.
- **Điện thoại:** chỉ cần mở lên không vỡ. Không có mục tiêu tốc độ khung hình riêng và không thử trên máy thật.

Ghi chú về nguồn gốc quyết định: mục nào ghi **(người dùng)** là điều chủ dự án đã nói hoặc đã đồng ý. Mục nào ghi **(quyết định của người viết)** là lựa chọn mặc định, chủ dự án chưa xác nhận riêng và có thể đổi.

## 1. Ý định

Một trang web duy nhất để thư giãn: "một giây phút để chill" **(người dùng)**. Người xem mở trang và thấy ngay đúng khung cảnh trong ảnh `dalatchill.png`: căn nhà gỗ mái ngói giữa rừng thông mù sương, hồ cá koi, cầu gỗ, lối sỏi, vườn cẩm tú cầu. Khung cảnh đó đang sống: nước gợn, cá bơi, sương trôi. Sau đó họ dạo quanh khu vườn bên ngoài căn nhà, có âm thanh hợp cảnh **(người dùng)**.

Thước đo thành công: người xem nhìn trang và tin đó là một cảnh quay thật của chính bức ảnh, và muốn để trang mở vài phút.

## 2. Mục tiêu

1. Khung hình đầu tiên giống ảnh gốc gần như tuyệt đối về bố cục, màu và ánh sáng **(người dùng)**.
2. Đàn cá koi bơi tung tăng dưới hồ, trông thật **(người dùng)**.
3. Người xem tham quan được khu vườn bên ngoài nhà **(người dùng)**.
4. Có âm thanh hợp hoàn cảnh **(người dùng)**.
5. Siêu thực nhất có thể: mọi chuyển động thêm vào phải chậm, nhẹ, và không lộ là hiệu ứng **(người dùng nêu yêu cầu, cách diễn giải là của người viết)**.

## 3. Không làm

- Không có nội dung giới thiệu, đặt phòng, menu, trang con, biểu mẫu **(người dùng đã đồng ý)**.
- Không vào bên trong nhà **(người dùng đã đồng ý)**.
- Không dựng lại khu vườn bằng 3D để đi lại tự do. Chỉ khám phá trong góc nhìn của bức ảnh **(người dùng đã đồng ý)**.
- Không có backend, tài khoản, phân tích truy cập.

## 4. Điều sẽ làm hỏng trang dù chạy đúng kỹ thuật

- Cá trông như hình dán trượt trên mặt nước: thân cứng, không uốn, không chìm dưới nước.
- Hiệu ứng lộ liễu: nước sóng sánh như biển, cây lắc mạnh, sương cuộn nhanh, ảnh bị kéo méo ở mép các vật thể.
- Giao diện che cảnh: chữ to, nút đậm, bảng điều khiển luôn hiện.
- Âm thanh giật khi lặp, to đột ngột, hoặc tự phát khi người xem chưa bấm gì.
- Giật khung hình trên laptop thông thường.

## 5. Tài sản đầu vào

| Tệp | Kích thước | Vai trò |
|---|---|---|
| `dalatchill.png` | 1408×768 | Ảnh tham chiếu. Có khoảng 10 con koi đứng yên và một vòng gợn sóng giữa hồ. Dùng để lấy mẫu màu, kích cỡ, số lượng cá. Không hiển thị trên trang. |
| `dalatchill_nofish.png` | 1408×768 | Ảnh nền của trang. Cùng khung cảnh, mặt hồ không có cá. |

Ràng buộc: cả hai ảnh chỉ 1408×768. Chủ dự án có nói đã tạo lại ở độ phân giải cao, nhưng tệp trong thư mục vẫn là 1408×768. Hệ quả: trên màn hình 1920 px ảnh đã bị phóng 1,36 lần ngay ở toàn cảnh, nên cận cảnh sẽ mềm. Xem mục 8 để biết cách xử lý.

## 6. Trải nghiệm

### 6.1 Mở trang

- Màn hình tải tối giản trong lúc tải ảnh và âm thanh, sau đó cảnh hiện dần lên **(quyết định của người viết)**.
- Cảnh phủ kín cửa sổ theo kiểu cắt vừa khung (cover), căn giữa sao cho hồ và nhà luôn nằm trong khung **(quyết định của người viết)**.
- Lớp chữ rất nhạt: tên "Dalat Chill" ở góc trên trái, nút bật tắt âm thanh ở góc trên phải, nút "Dạo quanh khu vườn" ở giữa phía dưới, 5 điểm sáng nhỏ đánh dấu các góc vườn. Tất cả tự mờ đi sau khoảng 4 giây không rê chuột và hiện lại khi rê chuột hoặc chạm **(bố cục người dùng đã xem trong bản phác thảo và đồng ý, thời gian 4 giây là quyết định của người viết)**.
- Giao diện bằng tiếng Việt **(quyết định của người viết)**.

### 6.2 Cảnh sống

Các chuyển động chạy liên tục, ở mọi góc nhìn:

- **Mặt hồ:** gợn sóng nhỏ làm rung nhẹ hình phản chiếu căn nhà và cây, có ánh lấp lánh thưa ở vùng nước sáng.
- **Cá koi:** xem 6.3.
- **Sương:** các dải sương mỏng trôi rất chậm ngang vùng rừng thông phía sau nhà, đậm ở xa và tan ở gần.
- **Nắng:** các vệt nắng mờ từ góc trên trái (nơi mặt trời trong ảnh) đổi cường độ rất chậm.
- **Cây lá:** dương xỉ, cỏ lau quanh hồ, hoa ở tiền cảnh đung đưa nhẹ. Thân thông, nhà, đá, cầu đứng yên tuyệt đối.
- **Đèn hiên và cửa sổ:** ánh ấm dao động nhẹ.
- **Khói:** một làn khói mỏng từ ống khói **(quyết định của người viết, có thể bỏ nếu trông giả)**.
- **Chi tiết nhỏ:** vài con bướm hoặc chuồn chuồn gần hoa và mặt nước, vài hạt bụi sáng trong vệt nắng **(quyết định của người viết)**.
- **Chiều sâu:** khi rê chuột, cảnh dịch rất nhẹ theo chiều sâu (tiền cảnh dịch nhiều hơn hậu cảnh), biên độ nhỏ để không lộ méo ảnh.

### 6.3 Đàn cá koi

- Số lượng 8–12 con, màu lấy theo ảnh tham chiếu: trắng đốm đỏ, cam, vàng **(quyết định của người viết dựa trên ảnh gốc)**.
- Mỗi con có thân uốn theo nhịp bơi, đuôi quẫy, tốc độ thay đổi: lúc lững lờ, lúc tăng tốc ngắn, lúc đổi hướng.
- Cá ở dưới mặt nước: bị gợn sóng làm méo nhẹ, màu ngả theo màu nước, hình phản chiếu trên mặt nước đè lên cá, cá ở xa nhỏ hơn và mờ hơn theo phối cảnh của hồ.
- Cá chỉ bơi trong vùng nước, tránh nhau, quay đầu trước khi chạm bờ. Khi bơi qua dưới lá súng hoặc sát đá bờ thì bị che.
- Bấm hoặc chạm vào mặt nước: một vòng gợn sóng lan ra từ điểm bấm, cá gần đó giật mình tản ra rồi tò mò bơi lại trong vài giây **(người dùng đã đồng ý)**.

### 6.4 Tham quan

Sáu góc nhìn: toàn cảnh và 5 góc vườn **(người dùng đã đồng ý với 5 góc này)**:

| # | Góc | Vùng trong ảnh | Âm thanh riêng |
|---|---|---|---|
| 0 | Toàn cảnh | cả ảnh | chỉ có nền |
| 1 | Hồ cá koi | giữa, phía dưới | nước róc rách rõ hơn |
| 2 | Cầu gỗ | bên phải hồ | ếch, côn trùng |
| 3 | Hiên nhà | hiên và sân đá | chuông gió |
| 4 | Cẩm tú cầu | bên trái, tầm giữa | chim rừng gần hơn |
| 5 | Lối sỏi | góc dưới trái, hướng vào rừng | gió thông rõ hơn |

- Bấm một điểm sáng: khung hình trôi chậm và tiến vào góc đó trong khoảng 3–4 giây, có gia tốc mềm ở đầu và cuối. Âm thanh riêng của góc hòa dần vào.
- Khi đang ở một góc: cảnh vẫn sống, vẫn dịch nhẹ theo chuột. Có nút quay về toàn cảnh. Phím Esc cũng quay về.
- Nút "Dạo quanh khu vườn": chế độ tự dạo, đi lần lượt qua các góc, dừng ở mỗi góc khoảng 20 giây, lặp vô hạn cho tới khi người xem bấm bất kỳ đâu **(thời gian dừng là quyết định của người viết)**.
- Bàn phím: mũi tên trái phải để chuyển góc, phím M để tắt bật tiếng **(quyết định của người viết)**.

### 6.5 Âm thanh

- Trình duyệt chặn tự phát tiếng, nên âm thanh bắt đầu ở lần bấm hoặc chạm đầu tiên của người xem, và hòa dần lên trong khoảng 3 giây **(người dùng đã được báo và đồng ý)**.
- Lớp nền chạy liên tục: chim rừng buổi sớm, gió qua tán thông, nước róc rách nhẹ.
- Lớp theo góc: mỗi góc tăng âm lượng một lớp riêng theo bảng ở 6.4, chuyển mượt cùng lúc với máy quay.
- Âm sự kiện: tiếng nước khẽ khi bấm vào hồ.
- Các đoạn lặp phải liền mạch, không nghe được điểm nối.
- Nút tắt bật tiếng nhớ lựa chọn của người xem cho lần sau.
- Nguồn: tệp âm thanh thật thuộc phạm vi công cộng hoặc giấy phép CC0, ghi rõ nguồn và giấy phép từng tệp trong `CREDITS.md` **(quyết định của người viết)**. Nếu không tìm được tệp phù hợp cho một lớp, dùng âm tổng hợp bằng Web Audio cho gió và nước, và báo cho chủ dự án biết lớp nào là tổng hợp.
- Người dựng trang không nghe được âm thanh. Chủ dự án duyệt phần tiếng bằng tai.

## 7. Cách dựng **(toàn bộ mục này là quyết định của người viết)**

Chủ dự án giao việc chọn công nghệ cho người viết, với điều kiện giống ảnh và siêu thực nhất có thể.

- **Nền tảng:** trang tĩnh, một tệp `index.html` với các mô-đun JavaScript, không cần bước build. Vẽ bằng WebGL qua Three.js, thư viện đặt sẵn trong dự án chứ không tải từ CDN. Âm thanh bằng Web Audio API.
- **Nguyên tắc cốt lõi:** ảnh `dalatchill_nofish.png` là nền của mọi điểm ảnh. Hiệu ứng chỉ làm lệch, phủ thêm, hoặc cộng sáng lên ảnh, không vẽ lại cảnh. Nhờ đó khung hình tĩnh luôn trùng với ảnh.
- **Tài sản phụ tạo một lần, lưu thành tệp:**
  - bản đồ chiều sâu của ảnh, dùng cho hiệu ứng dịch theo chuột, độ đậm của sương, và tỉ lệ phối cảnh của cá;
  - mặt nạ vùng nước, kèm vùng lá súng và đá che cá;
  - mặt nạ vùng cây lá được phép đung đưa;
  - mặt nạ vùng đèn.
  Cách tạo (mô hình ước lượng chiều sâu chạy cục bộ, tách theo màu, hoặc vẽ tay bằng script) do người dựng chọn. Mỗi mặt nạ phải được kiểm bằng mắt bằng cách chồng lên ảnh.
- **Cá:** hình học uốn theo xương sống. Da cá có thể cắt từ các con koi trong `dalatchill.png`, vẽ bằng thủ tục, hoặc kết hợp: người dựng chọn cách nào trông thật nhất trên nền ảnh. Cá vẽ vào một lớp riêng nằm dưới mặt nước rồi mới qua hiệu ứng khúc xạ và phản chiếu của nước. Hành vi bầy đàn là logic thuần, tách khỏi phần vẽ để kiểm thử được.
- **Chạy thử:** cần một máy chủ tĩnh cục bộ, mở trực tiếp bằng `file://` sẽ không tải được ảnh và mô-đun.

Việc chia tệp, cấu trúc mã, công thức shader, tham số chuyển động: để người dựng quyết.

## 8. Ràng buộc và cách xử lý

- **Độ phân giải ảnh:** giới hạn mức phóng ở mỗi góc để ảnh không vỡ rõ, dự kiến tối đa khoảng 2 lần so với toàn cảnh, người dựng chỉnh theo mắt. Tệp ảnh nền khai báo ở một chỗ duy nhất, để sau này chủ dự án thay bằng bản cùng khung hình có độ phân giải cao hơn mà không sửa mã. Các mặt nạ lưu theo tọa độ tỉ lệ nên vẫn dùng được.
- **Hiệu năng:** mượt 60 khung hình mỗi giây trên laptop có card đồ họa tích hợp ở 1080p. Giới hạn tỉ lệ điểm ảnh thiết bị ở 2. Tạm dừng vẽ và âm thanh khi tab bị ẩn.
- **Màn hình:** ưu tiên máy tính màn ngang. Trên điện thoại trang vẫn chạy: cắt vừa khung, kéo ngang để xem phần bị cắt, chạm thay cho bấm. Không tối ưu riêng cho màn dọc.
- **Trình duyệt:** bản hiện hành của Chrome, Edge, Firefox, Safari. Nếu không có WebGL thì hiện ảnh tĩnh với một dòng thông báo ngắn.
- **Giảm chuyển động:** nếu hệ điều hành bật "giảm chuyển động", tắt dịch theo chuột và đổi chuyển góc thành mờ dần thay vì trôi.

## 9. Kiểm chứng

- **Mốc duyệt sớm:** trước khi làm phần tham quan và âm thanh, dựng một bản thử chỉ gồm ảnh nền, nước và cá, để chủ dự án xem và góp ý. Cá và nước là rủi ro lớn nhất của dự án, nên phải được duyệt trước khi xây tiếp **(quyết định của người viết)**.
- So khung hình đầu tiên với `dalatchill_nofish.png` bằng ảnh chụp màn hình: bố cục và màu phải trùng, khác biệt chỉ nằm ở cá và gợn nước. Ảnh không cá là chuẩn cho vẻ ngoài của hồ, kể cả hình phản chiếu căn nhà đậm hơn và đáy hồ sáng hơn so với ảnh gốc. Không chỉnh nước cho giống ảnh gốc **(quyết định của người viết)**.
- Chụp màn hình từng góc trong 6 góc để kiểm độ nét và lỗi méo ảnh.
- Kiểm thử tự động cho logic cá: không ra khỏi vùng nước, không chồng lên nhau, phản ứng đúng khi có điểm bấm.
- Đo tốc độ khung hình.
- Chủ dự án duyệt cuối: cảm giác thật của cá và nước, và toàn bộ phần âm thanh.

## 10. Vị trí tệp

Dự án chưa dùng git, nên tài liệu này chưa được commit. Thư mục `.superpowers/` chứa bản phác thảo tạm, nên đưa vào `.gitignore` nếu sau này dùng git.

## 11. Đổi hướng ngày 2026-11-12: khu vườn 3D đi lại được

Sau khi xem bản "bức ảnh sống", chủ dự án cho biết nó không đúng nhu cầu: họ muốn khu vườn được dựng lại bằng code để người xem tham quan như thật **(người dùng)**. Mục 3 ("không dựng lại bằng 3D") vì thế không còn hiệu lực.

- Trang chủ `index.html` nay là cảnh 3D (`src3d/`). Bản bức ảnh sống được giữ ở `photo.html` (`src/`).
- Góc nhìn người đi bộ: kéo để nhìn, W A S D hoặc bấm xuống đất để đi, nút tự dạo, bấm vào hồ để gọi cá **(quyết định của người viết)**.
- Cảnh dựng hoàn toàn bằng hình học và họa tiết sinh bằng code, không dùng mô hình hay ảnh ngoài. Hệ quả: phong cách là 3D cách điệu, không đạt độ chân thực của ảnh **(giới hạn đã báo cho chủ dự án)**.
- Dùng lại: bộ âm thanh (`src/audio.js`, đổi lớp theo khu vực đang đứng) và da cá koi (`src/koi-skins.js`).

## 12. Mô hình quét thật (2026-11-12)

Người dùng yêu cầu: "tải mô hình cây cỏ thật để tăng độ chân thực nhất có thể". Các quyết định Claude tự đưa ra:

- Nguồn: Poly Haven, CC0, bản 1k. Danh sách, tác giả và giấy phép ở `CREDITS.md`.
- Thông, dương xỉ, bụi cây, cây thấp, cỏ, hoa, đá hồ, đá tảng, gốc cây, đá lát lối đi: dùng mô hình quét. Nền đất: ba ảnh chụp (cỏ, nền rừng, sỏi) trộn theo đỉnh.
- Cây thông gốc quá nặng (tới 2,7 triệu tam giác), nên 14 cây gần người xem dùng lưới đã tỉa lá kim, các cây còn lại dùng ảnh kết xuất từ chính mô hình đó (hai tấm chéo nhau). Danh sách cây gần được xếp lại khi người xem đi được 1,5 m.
- Cỏ, hoa nhỏ, cỏ dại nằm ở lớp vẽ riêng (`DETAIL_LAYER`) nên không được vẽ lại trong ảnh phản chiếu của hồ, để giữ tốc độ.
- Màu lá được nâng sáng lúc chạy vì nhiều bản quét là cây khô hoặc trong bóng râm.
- Vẫn dựng bằng mã: cẩm tú cầu (không có mô hình CC0 phù hợp; thân bụi là mô hình thật, bông hoa là hình cầu có hoạ tiết), nhà, cầu, cá koi, lá súng, thân dương xỉ thân gỗ.
- Dung lượng tài sản tăng khoảng 45 MB; chấp nhận được khi chạy trên máy, cần nén (Draco, KTX2) nếu đưa lên mạng.
