# Phin góc phố — Tiệm Cà Phê Phin Vỉa Hè

Game quản lý quán cà phê Việt Nam bằng **Phaser 3 + JavaScript ES modules + Vite**. Đã triển khai phase 01–08: pha chế bằng thao tác thật, bốn công thức, ca làm 180 giây, nâng cấp quán, sự kiện/VIP, truyện và tiến trình dài hạn. Không có backend, asset trả phí hoặc yêu cầu tài khoản.

Kết quả kiểm tra mới nhất: [kho và mua nguyên liệu](QA-INVENTORY.md), [nhân vật và khung cảnh](QA-WORLD.md), [bộ vật phẩm](QA-ITEMS.md).

## Chạy tại máy

Yêu cầu Node.js **20.19+** (đã chạy với Node 22.22.2).

```sh
npm install
npm run dev
```

Mở địa chỉ Vite in ra, mặc định `http://localhost:5173`. Trên điện thoại cùng Wi-Fi, dùng địa chỉ `Network` Vite hiển thị. Bắt đầu với **Học pha phin · 3 ly** nếu chưa quen thao tác.

```sh
npm test             # kiểm thử logic bằng node:test
npm run build       # tạo dist/
npm run preview     # kiểm tra bản production, mặc định cổng 4173
```

## Độ nét và hình ảnh

Khung gameplay giữ **480×800**, backing canvas tự tăng **1–4 lần** theo kích thước hiển thị, DPR (tối đa 2) và giới hạn WebGL. Camera, chữ và thao tác kéo/rót dùng cùng hệ tọa độ logic. Resize hoặc đổi DPR hủy kéo an toàn, không khởi động lại ca.

Bộ dụng cụ dùng **14 sprite PNG nền trong suốt được tạo bằng imagegen**: kính, nhôm xước, gốm, gỗ và mây đan. Các ảnh nằm trong `public/assets/items/`, tải từ chính game, không gọi dịch vụ tạo ảnh khi chơi. [Prompt và nguồn tạo](public/assets/items/PROMPTS.md).

Nhân vật và khung cảnh dùng thêm **21 ảnh/sprite sheet imagegen** trong `public/assets/world/`: chủ quán, 8 kiểu khách, 3 cây cùng mặt tiền, mái hiên, bảng hiệu, ghế, vỉa hè, bàn, quạt, xe máy và dây cờ. [Bộ prompt](public/assets/world/PROMPTS.md). Đầu, thân, tay, chân và các biểu cảm là frame riêng; chậu và tán lá tách lớp. `person()` giữ hợp đồng cũ, không thay ID khách hoặc vùng phục vụ. Chữ và các lớp đồ uống theo trạng thái vẫn được render riêng.

`worldAssets.js` chuẩn bị texture một lần, dùng frame/kích thước/điểm xoay từ `worldManifest.json`; resize không tạo atlas mới. Ảnh nguồn được giữ nguyên, bản texture runtime giới hạn cạnh 768–1536 px theo loại. Khi tải ảnh thất bại, hình thủ tục cũ dùng làm dự phòng. Mưa, quạt, cây và nhân vật cập nhật theo đồng hồ hình ảnh của ca và cùng dừng khi mở sổ/tạm dừng. Chế độ giảm chuyển động giữ biểu cảm và tín hiệu gameplay.

Mã vẽ chia thành `rendering/primitives.js`, `tools.js`, `characters.js`, `scenery.js`; `art.js` giữ API dùng chung. `itemAssets.js` nạp bộ sprite và tạo texture tối đa 512 px một lần; ảnh nguồn được giữ nguyên, texture không tạo lại khi resize. `CupArt.js` tách ảnh ly/phin khỏi lớp cà phê, sữa, bọt, đá và lõi nén để hiển thị đúng trạng thái thật. Khay, lúc kéo, bàn pha, sổ và cửa hàng dùng chung bộ hình. `ResolutionManager.js` quản lý camera/texture chữ và `resolution.js` chứa phép tính thuần có kiểm thử. Graphics tĩnh chỉ dựng một lần, ly cập nhật khi trạng thái/thành phần hoặc frame hiệu ứng đổi.

[Ảnh đối chiếu trước/sau](output/playwright/sharpness-comparison.html) · [QA desktop / Retina](QA-DESKTOP.md). Hiện **181/181 kiểm thử logic đạt** (`npm test`).

Nếu cổng mặc định đang dùng: `npm run dev -- --port 5175 --strictPort`, rồi mở `http://localhost:5175`. Lưu ý localStorage tách theo cổng; save ở cổng cũ vẫn còn nguyên.

## Cách chơi

1. **Chọn gợi ý công thức:** chạm đơn của khách, hoặc chạm tên món trên từng trạm để mở sổ và chọn món cho trạm đó. Gợi ý không tự thêm nguyên liệu; ly được kiểm tra bằng thành phần thực tế khi phục vụ.
2. **Chuẩn bị phin:** ở ngăn `PHA PHIN`, kéo ly lên trạm, kéo phin lên ly. Kéo **muỗng qua hũ bột rồi đến phin**. Gợi ý bạc xỉu xúc nửa muỗng; các món khác một muỗng. Kéo lõi nén đến phin và giữ khoảng 0,65 giây.
3. **Rót nước:** kéo ấm vào trạm và giữ. Thả ở vạch xanh: 100% cho đen đá/sữa đá/trứng, 50% cho bạc xỉu. Nước tiếp tục tăng khi giữ tay; thả tay bắt đầu pha khoảng 8 giây.
4. **Thêm nguyên liệu:** mở ngăn `SỮA & ĐÁ`. Kéo bình sữa đến ly và giữ để rót; thả để dừng. Kéo đá vào ly để thêm 3 viên. Sữa có thể thêm trước hoặc trong lúc pha.
5. **Khuấy:** khi phin nhỏ xong, kéo muỗng khuấy vào ly, di chuyển vòng tròn quanh tâm ly khoảng 1½ vòng. Sữa đá và bạc xỉu cần khuấy; đen đá và cà phê trứng không cần. Thêm sữa sau khi khuấy thì cần khuấy lại.
6. **Đánh trứng:** trong ngăn `BỌT TRỨNG`, kéo phới vào tô và di chuyển qua lại hoặc vòng tròn. Giữ yên không tạo bọt. Khi thanh tiến độ đầy, thả phới rồi kéo tô đến ly.
7. **Phục vụ:** kéo ly đến đúng khách. Thiếu bước thì ly trở về bàn với lời nhắc. Thêm nhầm nguyên liệu thì kéo ly đến **thùng ở cạnh phải bàn pha** để làm lại.

Tiến trình mới có một phin. Mua thêm phin ở cửa hàng sau ca; có thể thao tác ở phin khác trong lúc phin đầu nhỏ giọt. Thanh P1–P4 cho chuyển giữa hai trang; mọi phin tiếp tục chạy dù đang khuất. Đổi trang hủy thao tác kéo an toàn, giữ ly ở trạm gốc. Giữ mỗi lần một thao tác, cả chuột và cảm ứng đều dùng cùng cơ chế. Kéo ly sang trạm trống để đổi chỗ nếu cần.

### Thực đơn

| Món | Giá | Định lượng mục tiêu |
| --- | ---: | --- |
| Cà phê đen đá | 12.000đ | 1 bột, nước 100%, 3 đá |
| Cà phê sữa đá | 15.000đ | 1 bột, nước 100%, 1 sữa đặc, 3 đá, khuấy |
| Bạc xỉu | 18.000đ | ½ bột, nước 50%, 1 sữa đặc, 2 sữa tươi, 3 đá, khuấy |
| Cà phê trứng | 25.000đ | 1 bột, nước 100%, 1 bọt trứng, không đá |

Lượng sữa tính bằng **phần trong game**, không phải ml. Sai lệch định lượng hạ chất lượng thay vì làm hỏng ngay một công thức hợp lệ. Thành phần không thuộc món hoặc thiếu thành phần thiết yếu sẽ bị từ chối.

### Ca làm và độ khó

- Hướng dẫn: 1 trạm, 3 khách thành công, không giới hạn thời gian/kiên nhẫn; tiền luyện tập tách khỏi quán chính.
- Game chính mới: 1 phin, 3 ghế; dữ liệu v1 giữ 2 phin. Nâng cấp tối đa 4 phin, 6 ghế. Một ngày 06:00–10:00 tương đương khoảng 180 giây hoạt động.
- Cao điểm: 07:00–08:30. Ngày 1–2 khách đến cách 30 giây thường, 24 giây cao điểm, nhưng không vượt số chỗ hoặc giới hạn khách đang chờ.
- Ngày 1: đen đá và sữa đá. Ngày 2 thêm bạc xỉu. Ngày 3 thêm trứng. Sổ luôn có đủ bốn món.
- Đơn chờ tối đa = nhỏ nhất của số ghế, hai lần số phin, và mức ngày: 2 / 3 / 4 / 6 cho ngày 1–2 / 3–5 / 6–9 / 10+. Nhịp thường/cao điểm lần lượt 30/24, 28/23, 26/21, 24/19 giây. Kiên nhẫn khách thường 75–100 giây, VIP ít nhất 100 giây.
- Ngừng nhận khách mới lúc 09:30. Đến 10:00, khách chưa phục vụ tính là bỏ về, mỗi khách đúng một lần.
- Tip: Perfect 25%, Good 12%, Acceptable 3%, làm tròn 100đ. Combo 3/5/10 thưởng lần lượt 3.000/7.000/15.000đ. Sai đơn hoặc khách bỏ về ngắt combo.
- **Mục tiêu 3 ★ mỗi ngày:** phục vụ đủ số khách, đạt doanh thu mục tiêu và không để ai bỏ về (theo `expectedOrders` của ngày). Tiến độ hiện ngay trên HUD, sao được bật hiệu ứng ở màn tổng kết và cộng dồn vào sổ (Tổng sao / số ngày 3 ★).
- **Nhanh tay ⚡:** phục vụ khi khách còn ≥ 70% kiên nhẫn được thưởng thêm 10% giá món (tính vào thưởng, không áp dụng khi học pha). Vạch 70% và biểu tượng ⚡ hiện trên thanh kiên nhẫn; khách sắp bỏ về có dấu “!” rung.
- Huy hiệu mới: **Ba sao rực rỡ** (một ngày 3 ★) và **Tay pha thần tốc** (5 ly Nhanh tay trong ngày).
- Danh tiếng dùng trung bình tích lũy với giá trị khởi đầu 4 sao/5 lượt, tránh mất cả sao chỉ sau một lỗi.

## Quán lớn lên qua từng ngày

Mở **Cửa hàng** từ menu hoặc tổng kết; chỉ mua ngoài ca. Một lần mua kiểm tra cấp/số dư, trừ tiền, áp dụng và ghi save cùng lúc. Bấm lại trên giao dịch cũ không trừ tiền thêm.

Cửa hàng có tab **Nguyên liệu**. Save mới và save được chuyển đổi nhận kho khởi đầu gồm 10 muỗng bột, 6 phần sữa đặc, 6 phần sữa tươi, 4 quả trứng và 12 phần đá. Nước miễn phí; ly, phin và dụng cụ được tái sử dụng.

| Nguyên liệu | Gói nhập | Giá |
| --- | ---: | ---: |
| Bột cà phê | 10 muỗng | 20.000đ |
| Sữa đặc | 8 phần | 12.000đ |
| Sữa tươi | 10 phần | 15.000đ |
| Trứng | 6 quả | 15.000đ |
| Đá | 12 phần, mỗi phần 3 viên | 6.000đ |

Nút **Nhập đủ ca tới** dự báo số đơn theo lịch ngày và cộng một lượt món làm phần dự phòng. Giao dịch chỉ chạy nếu đủ tiền cho toàn bộ danh sách. Số tồn hiện ngay trên dụng cụ trong khay. Bột bị trừ khi đổ vào phin, sữa theo lượng rót, đá theo mỗi lần kéo và trứng khi phới bắt đầu chuyển động hợp lệ. Bỏ ly không hoàn nguyên liệu.

Khách chỉ gọi món còn khả năng pha. Ly đang làm đã có đủ thành phần vẫn được tính là có thể phục vụ. Khi không còn món nào và không còn khách đang chờ, quán chốt ca sớm với lý do **Hết nguyên liệu**; việc đóng kho không tự tính thêm khách bỏ về.

| Nâng cấp | Giá | Tác dụng |
| --- | --- | --- |
| Phin 2 / 3 / 4 | 25.000 / 50.000 / 85.000đ | Trạm độc lập; từ phin 3 có trang bàn thứ hai |
| Ghế 4 / 5 / 6 | 30.000 / 45.000 / 65.000đ | Hai hàng, mỗi hàng tối đa 3 vị trí; vẫn chịu giới hạn đơn theo ngày/phin |
| Sữa đặc cao cấp | 20.000đ | Tip sữa đá/bạc xỉu ×1,2; nhãn lon xanh |
| Quạt điện | 15.000đ | Hao kiên nhẫn ×0,85 khi có điện |
| Trang trí | 40.000đ | Thêm cây/đèn/biển, +0,1 sao mỗi đơn đúng, tối đa 5 |

Từ ngày 3, xác suất 35% có một sự kiện: mưa (khoảng cách khách ×1,25, tip ×1,2), reviewer (Perfect +10.000đ và một đánh giá 5 sao), mất điện (cần quạt, tắt 07:00 trong 30 giây thực), lễ hội (từ ngày 5, khoảng cách khách ×0,85), may mắn (tip ×1,25). Phin không cần điện. Sự kiện hiện ở đầu màn hình; các quyền lợi tip cộng theo phép nhân rồi làm tròn 100đ.

Tối đa một VIP/ngày. Reviewer là VIP của sự kiện; ngày khác từ ngày 4 có 25% cơ hội gặp ca sĩ khu phố hoặc nhà sáng tạo. VIP có tip ×1,5, ngoại hình và thoại riêng. Chạm khách để đọc trọn câu; hội thoại có nút bỏ qua và không dừng bàn pha.

Chú Ba, Lan và Minh có ba chương truyện. Cần cả ngày tối thiểu 2/4/7 và 1/3/5 ngày phục vụ thành công nhân vật đó. Mỗi người chỉ tính một lần gặp/ngày. Chương có thể hiện trong ca nhưng chỉ lưu khi chốt ca; xem lại trong sổ Chuyện.

Mỗi ngày có một thử thách tùy chọn, thưởng 5.000/10.000/15.000đ theo nhóm ngày. Tiến độ hiện trên HUD, thưởng chỉ nhận ở tổng kết. Thử thách không mất khách chỉ xác nhận khi kết thúc ca. Sáu huy hiệu không tặng tiền thêm. Thành thạo từng món mở ở 5/15/30 ly đúng, có sao/vòng trang trí trên trạm; mọi thao tác vẫn tự tay làm.

## Tạm dừng và lưu

Sổ món, nút tạm dừng hoặc ẩn tab cùng dừng đồng hồ, kiên nhẫn và phin. Khi quay lại tab, bấm tiếp tục. Phím `Esc` mở/đóng tạm dừng hoặc sổ.

Dữ liệu lưu trong `localStorage`, khóa `phin-goc-pho:v3`, phiên bản 3. Game tự chuyển v2 hoặc v1, giữ tiền/ngày/nâng cấp/thống kê/tiến trình; bản v2 và v1 vẫn được giữ làm dự phòng. Save cũ nhận kho khởi đầu, không dựng giả lịch sử nguyên liệu. **Kinh tế và nguyên liệu dùng trong ca chỉ chốt cuối ca**. Tải lại giữa ca bắt đầu lại ngày đó với kho đầu ngày, không cộng tiền hoặc làm mất hàng của ca bị bỏ dở. Mua nâng cấp, nhập hàng và đổi cài đặt được lưu ngay. Sự kiện, VIP và thử thách giữ nguyên qua reload; chốt ngày kiểm tra ID ngày để không cộng tiền hoặc trừ hàng hai lần. Hướng dẫn dùng kho vô hạn riêng và không thay đổi kho chính.

Nếu dữ liệu hỏng, game trở về dữ liệu mặc định an toàn. Nếu trình duyệt chặn lưu, game tiếp tục trong bộ nhớ và thông báo. Không xóa dữ liệu trình duyệt nếu muốn giữ tiến trình. Menu **Sổ góc phố** có thống kê, huy hiệu, thành thạo, truyện và cài đặt. Tạo tiến trình mới trong thẻ Cài đặt cần bấm xác nhận xóa.

Âm thanh tổng hợp bằng WebAudio, kích hoạt sau lần chạm đầu tiên. Nhạc nền tự tổng hợp và hiệu ứng có hai công tắc riêng; có giảm chuyển động trong tạm dừng và sổ cài đặt. Tạm dừng dừng nguồn âm đang phát; nhạc không chạy tiếp ở nền. Lỗi âm thanh không chặn game.

## Cấu trúc

- `src/logic/`: cấu hình nâng cấp/độ khó, kho nguyên liệu, dự báo nhập hàng, lập lịch ngày có seed, thử thách, thành tựu, truyện và bố trí theo ID.
- `src/config.js`: công thức, màu, nhân vật, định lượng, thời gian, lịch khách và thưởng.
- `src/models/`: trạng thái ly, trạm, khách; điều phối ca, kiểm tra công thức và kinh tế. Không phụ thuộc Phaser.
- `src/systems/`: thao tác con trỏ, nhận diện cử chỉ, lưu dữ liệu và âm thanh.
- `src/rendering/`: minh họa đồ họa, các lớp chất lỏng, nhân vật và trạm pha.
- `src/ui/`, `src/scenes/`: HUD, sổ, tạm dừng, menu, hướng dẫn, chơi chính và tổng kết.
- `tests/`: kiểm thử logic. `scripts/qa-*.js`: kịch bản thao tác trình duyệt dùng Playwright CLI, không dùng API để hoàn thành thao tác pha.
- `output/playwright/`: ảnh kiểm tra; `QA.md`: đối chiếu tiêu chí và kết quả thực tế.

Ở development, `window.__PHIN_QA__.snapshot()` trả về bản sao trạng thái để quan sát kiểm thử. Không có lệnh hoàn thành pha, cấp tiền hoặc tua ca; bản production không xuất API này.

## Build và đưa lên static hosting

Build tạo thư mục `dist/`. Cấu hình `base: './'` dùng đường dẫn tương đối, chạy được cả dưới đường dẫn con. Không cần cấu hình chuyển hướng SPA vì game không dùng route trình duyệt.

- **Cloudflare Pages / Netlify:** build command `npm run build`, output directory `dist`, Node 22.
- **GitHub Pages:** dùng workflow Actions chạy `npm ci`, `npm run build`, upload artifact `dist` rồi deploy Pages. Repo hiện chưa được kết nối GitHub.
- Có thể phục vụ `dist/` bằng bất kỳ static HTTP server nào. Dùng `npm run preview` để kiểm tra trước, không mở `index.html` trực tiếp bằng `file://`.

Tham khảo chính thức: [Phaser input](https://docs.phaser.io/phaser/concepts/input), [Vite static deployment](https://vite.dev/guide/static-deploy.html).

Chưa xuất bản lên hosting. Hướng dẫn chi tiết và workflow mẫu: [HOSTING.md](HOSTING.md). Kết quả kiểm thử, ảnh và giới hạn thiết bị: [QA.md](QA.md).

## Phase 09 — nền tảng đồ uống tương tác

Kiến trúc công thức có cấu trúc, trạng thái riêng cho từng ly/dụng cụ và tám hệ thống cử chỉ dùng lại được: [phase09.md](phase09.md). Bảy món mới chỉ là danh mục dự kiến; chưa mở bán trong giai đoạn này. Công thức đã đăng ký dùng chung luồng gọi món, đánh giá, tiền, tip, thống kê và lưu tiến trình hiện có.

### Phase 10 — Cà phê muối

Đã thêm cà phê muối **22.000đ**, mở từ **ngày 4**: pha phin thật, đong muối, đánh kem bằng vòng tròn và tự nghiêng tô để rót. Xem [hướng dẫn và kiểm thử Phase 10](phase10.md).
