# QA — Độ nét desktop và bộ hình mới

Ngày 10/10/2026, macOS, Chromium qua Playwright CLI, Phaser 3.90.0 / Vite 6.4.4. Đây là đợt kiểm tra bổ sung cho [phase 01–08](QA.md). Các thao tác pha/rót/khuấy/đánh trứng/phục vụ chạy bằng chuột hoặc sự kiện cảm ứng; không tua đồng hồ, hoàn thành ly bằng API hay sửa khách giữa ca.

## Kết quả

- **60/60 kiểm thử logic đạt**: giữ 56 kiểm thử cũ, thêm 4 kiểm thử cho hệ số render, giới hạn GPU, ánh xạ con trỏ và camera có offset. Bao gồm DPR nhỏ hơn 1 khi zoom trình duyệt.
- `npm run dev -- --port 5175 --strictPort`, `npm run build`, bản preview tại 4173 và production đường dẫn con tại 4174 chạy được. Cổng 5175 dùng riêng vì máy đang có game khác chiếm địa chỉ 5173.
- Hướng dẫn: phục vụ 3 ly, mở sổ giữa lúc pha, tới tổng kết, không cộng tiền luyện tập.
- Production desktop 1920×1080/DPR 2: pha và phục vụ đủ đen đá, sữa đá, bạc xỉu, cà phê trứng. 4 Perfect; reviewer, thử thách, kết thúc ca 180 giây và reload. Canvas thực **1440×2400**. Không có lỗi JavaScript/console hoặc asset HTTP.
- Sau ca: bấm mua phin liên tiếp chỉ mua một cấp; 112.400đ → 62.400đ, 2 → 3 phin. Ngày 4 dùng hai trang bàn pha; mở sổ món, sổ thống kê, reload giữ tiền/cấp/ngày. Bản production không xuất observer QA.
- Hai phin pha độc lập: phin 1 hoàn thành khi đang thao tác tại phin 3 ở trang khuất. Đổi trang trong lúc kéo bằng con trỏ thứ hai trả đúng ly, không nhân đôi. Phục vụ và bỏ ly ở trang 2 đúng trạm.
- Chờ đủ **6 khách theo lịch thật**, kiểm tra 360×800, 390×844, 430×932, 480×800 và desktop 1440×900. Canvas không cắt điều khiển; đơn hàng không che mắt nhân vật, chủ quán không đè thanh phin. Phục vụ đúng khách ghế 4 bằng phin 3.
- Rót thiếu/thừa, khuấy thiếu vòng bị từ chối, thả sai, ly thiếu bước, hủy kéo, bỏ ly đều đã chạy lại.
- Resize/DPR: **16 lượt thay đổi liên tiếp** trong cùng ca, vừa giữ ly vừa đổi kích thước. Không khởi động lại ca, không đổi ID ly; kéo phin, bỏ ly và mở/đóng sổ hoạt động ở R1/R2/R3/R4. Cả texture chữ lẫn số pixel backing canvas được xác nhận bằng số liệu.

## Pixel thực và ảnh trước/sau

Ảnh trước được chụp từ bản production cũ trước khi build lại; ảnh sau từ bản mới, cùng máy và cùng cảnh hướng dẫn. Ảnh trước được xuất ở kích thước CSS; ảnh sau DPR 2 xuất ở pixel thiết bị (ví dụ viewport 1920×1080 cho PNG 3840×2160). Kích thước canvas trong bảng được đọc trực tiếp trước khi chụp, độc lập với kích thước PNG.

| Viewport desktop | DPR | Canvas trước | Canvas sau | Resolution chữ |
| --- | ---: | --- | --- | ---: |
| 1366×768 | 1 | 480×800 | 480×800 | 1 |
| 1920×1080 | 1 | 480×800 | 960×1600 | 2 |
| 2560×1440 | 1 | 480×800 | 960×1600 | 2 |
| 1366×768 | 2 | 480×800 | 960×1600 | 2 |
| 1920×1080 | 2 | 480×800 | 1440×2400 | 3 |
| 2560×1440 | 2 | 480×800 | 1920×3200 | 4 |

Chữ mẫu rộng 243 đơn vị gameplay có texture rộng lần lượt **243 / 486 / 729 / 972 pixel**. Giữ smoothing cho nét minh họa; không dùng CSS `image-rendering: pixelated`.

[Xem đối chiếu tương tác trước/sau](output/playwright/sharpness-comparison.html), [ảnh trước 1920/DPR 2](output/playwright/sharp-before-1920x1080-dpr2.png), [ảnh sau 1920/DPR 2](output/playwright/sharp-after-1920x1080-dpr2.png), [sáu khách](output/playwright/phase08-six-480.png), [shop Retina](output/playwright/sharp-shop.png), [bốn món trong sổ](output/playwright/sharp-notebook.png).

## Frame time và vòng đời

Mỗi cấu hình desktop lấy 90 mẫu `requestAnimationFrame` sau khi cảnh ổn định. Trước và sau: median **16,7 ms**, p95 **16,7–16,8 ms** ở cả sáu cấu hình. Đây là khoảng cách giữa frame trên Chromium/máy này ở nhịp 60 Hz, không phải thời gian GPU riêng và không suy ra hiệu năng điện thoại.

- Sau 16 lượt resize, số texture và Text đang được theo dõi giữ **36/36** ở cảnh hướng dẫn một khách; không thêm atlas/texture theo từng kích thước cửa sổ. Graphics giữ command buffer tĩnh, được raster hóa trực tiếp ở kích thước canvas mới.
- 8 vòng Menu → Game → Sổ → Pause → Menu: Game **43** object cấp display-list (save một phin), Menu **24**; Menu giữ 24 như kết quả nền trước. Đây không phải tổng đệ quy mọi child trong container.
- Menu không còn timer/tween; các listener pointer ở Game **1/1/1/1**, Menu **0/0/0/0**. Listener scale giữ **10/9** qua tám vòng. Không có mức tăng dần.
- Kiểm tra phát hiện DPR có thể đổi mà không phát `resize`/media query; đã bổ sung một phép so sánh DPR mỗi `prestep`, chỉ cập nhật khi giá trị thay đổi. Không tạo timer riêng.

## Giới hạn xác minh

Cảm ứng là **mô phỏng CDP** ở 390×844/DPR 2, canvas 960×1600, trong browser context cố định DPR: kéo/rót sữa, khuấy vòng, phới đứng yên không tạo bọt, di chuyển tạo bọt, chuyển tô, touchcancel, thả sai và không cuộn trang. Không dùng kết quả này để tuyên bố đã thử trên điện thoại thật. Chưa xác minh chuyển giữa hai màn hình vật lý có DPR khác nhau hoặc hiệu năng GPU thấp; DPR và kích thước được thay đổi qua trình duyệt kiểm thử.

Không đổi schema save v2, công thức, giá, thưởng hoặc logic pha. localStorage vẫn theo origin của trình duyệt; đổi cổng local tạo một origin khác, không xóa dữ liệu ở cổng cũ. Chưa xuất bản hosting.

## Tái chạy và bằng chứng

- `npm test`, `npm run build`.
- `scripts/qa-sharpness-retina-captures.js`: 6 cấu hình desktop, pixel thực, ảnh native và frame interval; context cố định DPR để thao tác screenshot không thay đổi mật độ.
- `scripts/qa-sharpness-resize.js`: resize/DPR trong ca, hủy kéo, con trỏ logic, overlay, cache.
- `scripts/qa-sharpness-production-suite.js`: bốn món → chốt ca → shop → ngày tiếp theo → reload, trong cùng context DPR 2; gồm hai script production/shop.
- `scripts/qa-sharpness-touch-suite.js`: cả hai chuỗi cảm ứng trong context DPR 2.
- Báo cáo máy đọc: [sharp-results.json](output/playwright/sharp-results.json). Log build/test: [build](output/playwright/sharp-build.txt), [unit](output/playwright/sharp-unit.txt).

Các fixture nâng cấp/ngày chỉ ghi trong profile Playwright riêng trước ca. Không sửa dữ liệu trình duyệt chơi của người dùng.

## Sửa hiển thị trạng thái ly/phin (10/10/2026)

- Trạm chưa có ly chỉ vẽ đế lót; bỏ ly hoặc phục vụ xong trả về hình trạm trống.
- Phin chưa xúc bột hiển thị nhôm và lỗ lọc; màu bột chỉ xuất hiện sau `addGrounds`. Cache hình ly theo dõi cả lượng bột để cập nhật ngay, kể cả khi state vẫn là `PHIN`.
- Đáy ly nằm giữa đế lót; vân đế nằm trong đường ellipse; đĩa phin đặt sát miệng ly. Điểm cuối dòng nước điều chỉnh theo vị trí phin mới.
- `npm test`: 60/60; build thành công. `scripts/qa-state-art.js` chạy chuỗi kéo ly → phin rỗng → xúc bột → bỏ ly → pha lại → phục vụ Perfect ở DPR 2, không lỗi JavaScript. So sánh pixel vùng trạm trống trước/sau bỏ ly giống nhau; pixel lòng phin đổi từ nhôm sang nâu sau khi thêm bột.
- Ảnh: [trạm trống](output/playwright/state-art-empty.png), [phin rỗng](output/playwright/state-art-phin-empty.png), [đã có bột](output/playwright/state-art-phin-grounds.png). [Kết quả thao tác](output/playwright/state-art-results.txt).
