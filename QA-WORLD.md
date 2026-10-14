# QA nhân vật, cây và không gian — 10/10/2026

## Bản bàn giao

Đã tạo và tích hợp **21 PNG/sprite sheet bằng imagegen tích hợp**: 9 nhân vật, 3 cây, mặt tiền, mái hiên, bảng hiệu, ghế, vỉa hè, mặt bàn, quạt, xe máy và dây cờ. [Ảnh và prompt đầy đủ](public/assets/world/PROMPTS.md). Các ảnh gốc trong Codex vẫn được giữ; file game nằm trong `public/assets/world/`.

Nhân vật dùng đầu/biểu cảm, thân, hai tay và hai chân riêng. Chậu và tán lá tách lớp; rotor quạt độc lập. Những phần này dùng frame và điểm xoay trong `src/rendering/worldManifest.json`, cache texture một lần. Chữ, bubble, vùng nhận ly và trạng thái pha không được gộp vào ảnh. Bộ dụng cụ, kinh tế và save v2 giữ nguyên.

Chủ quán và tám kiểu khách được dùng qua cùng API `person`. Cây/ghế/quạt dùng chung giữa menu, game, cửa hàng và tổng kết. Sáu ghế có nền vỉa hè cao hơn để hàng sau đặt chân trên nền; phần hình hàng trước được nâng nhẹ để không che thanh phin. Hit area của khách không đổi.

Ảnh nguồn mới khoảng **32,7 MiB**, ngoài khoảng 20 MiB bộ dụng cụ. Chưa tối ưu truyền tải qua mạng chậm; kiểm thử tải local. Atlas runtime giới hạn cạnh 1024 px cho nhân vật, 768 px cho vật thể nhỏ, 1536 px cho nền rộng. Ảnh nguồn giữ nguyên. Không xuất bản hosting.

## Kiểm thử đã chạy

| Kiểm tra | Kết quả |
| --- | --- |
| `npm test` | **63/63 PASS**, gồm 60 kiểm thử nền và 3 kiểm thử manifest/frame/đủ bộ phận |
| `npm run build` | PASS, `dist/` đã cập nhật |
| 9 rig nhân vật | PASS: idle, blink, happy, angry; xoay chân khi đi, tư thế ngồi, giơ tay gọi món, giảm chuyển động |
| Bố cục 6 khách | Fixture dùng `CustomerView` thật: sáu vùng nhận ly độc lập, không nhận nhầm tâm ghế khác; đã xem ảnh mưa/lễ hội/mất điện |
| Quạt | Fixture: rotor đứng khi mất điện, quay lại khi có điện |
| 4 phin / 2 trang | PASS: phin khuất vẫn hoàn tất, ID ly riêng, đổi trang hủy kéo an toàn, phục vụ/bỏ ly đúng trạm |
| Resize/DPR giữa kéo | PASS: 16 lượt, giữ ID ly và ca; tọa độ thao tác đúng; sổ tạm dừng đồng hồ |
| 8 vòng Game → sổ → Menu | PASS: listener/timer/tween không tích lũy |
| Cảm ứng mô phỏng | PASS tại 390×844/DPR 2: pha, thả sai, hủy touch, ly thiếu bước, bỏ ly, sữa/khuấy, đánh trứng đứng yên và chuyển động; không cuộn ngoài ý muốn |
| Production đường dẫn con | PASS tại `/phin-goc-pho/`, 1920×1080/DPR 2: cả bốn công thức được pha bằng chuột, **4 Perfect**, reviewer, thử thách, chốt ca 180 giây |
| Ca → cửa hàng → ngày mới → reload | PASS: thu nhập 112.400đ, mua phin thứ ba 50.000đ dù bấm liên tiếp; còn 62.400đ; mở hai trang và reload không nhân đôi thưởng |
| Production đường dẫn gốc | PASS: tải đủ 21 ảnh mới, không lỗi JavaScript |
| Tạm dừng hình ảnh | Hai ảnh canvas cách nhau 600 ms giống hệt trên production sau khi mở pause |
| Mất toàn bộ ảnh mới | Chặn 21 request ảnh world trong context riêng: game vẫn vào menu/ca bằng hình thủ tục dự phòng; không lỗi JavaScript |

Suite production chủ động chỉ phục vụ bốn món, ba khách còn lại bỏ về. Fixture sáu khách là kiểm tra rendering/vùng nhận ly và hiệu ứng, **không phải** một ca tự tay phục vụ đủ sáu khách cùng lúc. Các test tạo dữ liệu trong browser context riêng; không sửa save trình duyệt người chơi.

Các kích thước đã kiểm tra: **360×800, 390×844, 430×932, 480×800, 1440×900**, thêm **1366×768, 1920×1080, 2560×1440**. Sáu ảnh desktop trước/sau dùng DPR 1 và 2 thật của browser context. Backing canvas tại 1920×1080/DPR 2 là **1440×2400**; tại 2560×1440/DPR 2 là **1920×3200**. Texture chữ dùng cùng hệ số render.

**Chưa thử trên điện thoại vật lý.** Các thao tác touch là mô phỏng Chromium. Không suy ra hiệu năng thiết bị chưa thử.

## Hiệu năng và bộ nhớ

Mỗi mẫu gồm 120 khoảng `requestAnimationFrame` trong đầu ca, cùng máy, cùng viewport và cấu hình 4 phin/6 ghế. Đây là khoảng cách frame quan sát được, không phải thời gian GPU; seed/ngày sự kiện không khóa cố định giữa các context nên không phải benchmark xác định tuyệt đối.

| Desktop / DPR | Trước median / p95 (ms) | Sau median / p95 (ms) |
| --- | --- | --- |
| 1366×768 / 1 | 13,3 / 14,1 | 13,3 / 14,8 |
| 1920×1080 / 1 | 13,3 / 14,0 | 13,3 / 14,5 |
| 2560×1440 / 1 | 13,3 / 14,0 | 16,7 / 18,5 |
| 1366×768 / 2 | 13,3 / 14,1 | 13,3 / 15,1 |
| 1920×1080 / 2 | 13,3 / 14,1 | 13,3 / 15,2 |
| 2560×1440 / 2 | 13,3 / 14,1 | 16,7 / 18,6 |

Chi tiết tăng thêm có chi phí render, rõ hơn ở viewport lớn nhất. Sau 16 lượt resize, khi trở lại cùng cảnh tutorial, texture giữ **71**, Text giữ **36**, object cấp scene giữ **40**. Sau 8 lần chuyển scene, Menu giữ **22 object / 0 timer / 0 tween**, listener kéo bằng 0, resize listener bằng 9; Game giữ một listener cho mỗi sự kiện kéo, resize listener bằng 10. Texture tăng thêm 21 tương ứng 21 atlas world, không tăng theo số lần resize.

Object cấp scene không bao gồm child sâu trong Container; việc nhóm nền vào Container làm số object cấp scene thấp hơn trước, **không có nghĩa tổng số sprite giảm**.

## Ảnh và log

- [9 nhân vật lắp từ các bộ phận](output/playwright/world-character-gallery.png).
- [Sáu khách / lễ hội](output/playwright/world-six-seats-festival.png), [mưa](output/playwright/world-six-seats-rain.png), [mất điện](output/playwright/world-six-seats-power.png).
- [Menu production](output/playwright/world-production-root-menu.png), [cửa hàng](output/playwright/world-shop-production.png), [tổng kết ca](output/playwright/world-reviewer-summary.png).
- [Đen đá](output/playwright/world-production-recipe-0.png), [sữa đá](output/playwright/world-production-recipe-1.png), [bạc xỉu](output/playwright/world-production-recipe-2.png), [cà phê trứng](output/playwright/world-production-recipe-3.png).
- [1366 DPR1 trước](output/playwright/world-before-1366x768-dpr1.png) / [sau](output/playwright/world-after-1366x768-dpr1.png); [DPR2 trước](output/playwright/world-before-1366x768-dpr2.png) / [sau](output/playwright/world-after-1366x768-dpr2.png).
- [1920 DPR1 trước](output/playwright/world-before-1920x1080-dpr1.png) / [sau](output/playwright/world-after-1920x1080-dpr1.png); [DPR2 trước](output/playwright/world-before-1920x1080-dpr2.png) / [sau](output/playwright/world-after-1920x1080-dpr2.png).
- [2560 DPR1 trước](output/playwright/world-before-2560x1440-dpr1.png) / [sau](output/playwright/world-after-2560x1440-dpr1.png); [DPR2 trước](output/playwright/world-before-2560x1440-dpr2.png) / [sau](output/playwright/world-after-2560x1440-dpr2.png).
- [Kết quả production](output/playwright/world-production-result.json), [touch](output/playwright/world-touch-result.json), [resize/lifecycle](output/playwright/world-review-result.json), [rig/fixture](output/playwright/world-gallery-result.json), [fallback/pause](output/playwright/world-smoke-result.json), [frame trước](output/playwright/world-before-result.json), [frame sau](output/playwright/world-after-result.json).

## Chạy lại

Dev local: `http://localhost:5175`. Preview: `http://localhost:4173`. Preview đường dẫn con: `http://127.0.0.1:4174/phin-goc-pho/` qua `scripts/preview-subpath.js`.

Các file `scripts/qa-world-{review,touch,production,gallery,smoke,compare}.js` dùng Playwright CLI `run-code`. Suite đợi menu sẵn sàng sau tải ảnh thay vì giả định tải xong trong 500 ms. `qa-world-gallery.js` dựng một scene thử nghiệm bằng module thật trong context riêng; không thêm shortcut vào bản production. `qa-world-compare.js` dùng biến `phase` để đặt tên ảnh before/after.

Một lượt kiểm thử production bị đóng phiên browser giữa chừng; đã chạy lại trọn vẹn trong phiên sạch và kết quả PASS được lưu ở trên. Chỉnh cuối cùng chỉ căn bubble/nền cho sáu ghế, đã build và chụp lại fixture sau chỉnh.
