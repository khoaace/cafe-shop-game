> Báo cáo lịch sử trước phase 04–08. Thiết kế khởi đầu 2 phin đã được thay bằng 1 phin cho save mới; xem QA.md cho bản hiện tại.

# Báo cáo kiểm tra phase 01–03

Kiểm tra ngày **10/10/2026** trên macOS, Node **22.22.2**, npm **10.9.7**, Phaser **3.90.0**, Vite **6.4.4**, Chromium điều khiển bằng Playwright CLI.

## Kết quả

| Hạng mục | Đã xác minh |
| --- | --- |
| Cài đặt và build | `npm install`, `npm run dev`, `npm run build`, `npm run preview` chạy thành công |
| Kiểm thử logic | **31/31** bằng `node:test` |
| Phase 01 | Hoàn thành hướng dẫn 3 khách bằng kéo/rót thật; 3 ly Perfect, 48.000đ luyện tập; tiền quán chính vẫn 0đ |
| Phase 02 | Phục vụ thành công đen đá, sữa đá, bạc xỉu, cà phê trứng bằng chuột; lượng nước/sữa từ thời gian giữ, bọt và khuấy từ chuyển động |
| Hai trạm | Pha hai ly khác ID; phin đầu tiếp tục nhỏ khi thao tác ở phin sau; ly không ghi đè nhau |
| Phase 03 | Chơi hết ca 180 giây: 6 khách, 6 ly Perfect, combo tốt nhất ×6, không mất khách trong ca kiểm tra |
| Kinh tế cuối ca | 97.000đ bán hàng + 24.400đ tip + 10.000đ combo = **131.400đ**; tổng kết và số dư lưu trùng khớp |
| Sang ngày / tải lại | Sang ngày 4, còn 2 trạm, số dư 131.400đ; reload giữ đúng tiến trình, không cộng thưởng lại |
| Cảm ứng | Chromium CDP touch events: kéo ly/phin, xúc bột, giữ nén, rót nước/sữa, đá, khuấy tròn, đánh trứng, đổ bọt, phục vụ |
| Thao tác sai | Thả ngoài trạm không tạo ly; ly thiếu bước không nhận thưởng; touchcancel giải phóng thao tác; kéo ly vào thùng giải phóng trạm |
| Nhận diện cử chỉ | Giữ phới đứng yên không tăng bọt; chuyển động qua lại tăng bọt; khuấy yêu cầu chuyển động góc trong vùng ly |
| Tạm dừng | Mở sổ dừng pha và đồng hồ; pause dừng đồng hồ và kiên nhẫn; trở lại hoạt động sau tiếp tục |
| Ẩn tab | Kiểm tra **handler visibilitychange với document.hidden mô phỏng**; giữ nguyên đồng hồ, trở lại cần bấm tiếp tục |
| Cài đặt / scene | Tắt âm, giảm chuyển động giữ qua reload; vào/ra game 4 lần liên tiếp không kẹt điều khiển |
| Production | Pha và phục vụ một ly Perfect trên `npm run preview`; **0 lỗi console, 0 tài nguyên HTTP lỗi**, không xuất `__PHIN_QA__` |

Ca kiểm tra đủ bốn món dùng **fixture ngày 3 trong localStorage của profile kiểm thử riêng** để mở toàn bộ thực đơn. Sau khi mở ca, các thao tác pha, khách đến và thời gian ca đều chạy thật; không sửa trạng thái ly, cấp tiền hoặc tua đồng hồ game.

Test cảm ứng nâng cao kiểm tra khuấy sữa và đổ bọt trên cùng một ly để xác minh cử chỉ; không dùng ly có nguyên liệu sai đó để tuyên bố đã phục vụ đúng công thức. Bốn công thức hoàn chỉnh đã được kiểm tra bằng chuột và kiểm thử logic; vòng đen đá hoàn chỉnh được kiểm tra cả bằng cảm ứng.

## Bố cục

Đã chụp và kiểm tra biên canvas, tỷ lệ 480:800, không bị cắt hoặc làm trang cuộn:

| Viewport | Canvas hiển thị |
| --- | --- |
| 360×800 | 360×600, căn giữa theo chiều dọc |
| 390×844 | 390×650, căn giữa theo chiều dọc |
| 430×932 | khoảng 430×716,7, căn giữa theo chiều dọc |
| 480×800 | 480×800 |
| 1440×900 | 540×900, căn giữa theo chiều ngang |

Khoảng trống hai bên hoặc trên/dưới là chủ ý để giữ tỷ lệ bàn pha và tọa độ chạm. CSS tính safe-area theo thiết bị.

Ảnh tại [output/playwright](output/playwright):

- [Menu production](output/playwright/production-menu.png)
- [Hai trạm pha](output/playwright/two-stations.png)
- [Sổ công thức](output/playwright/recipe-book.png)
- [Bạc xỉu](output/playwright/bac-xiu.png), [cà phê trứng](output/playwright/egg-coffee.png)
- [Hoàn thành hướng dẫn](output/playwright/tutorial-complete.png), [tổng kết ca](output/playwright/day-complete.png)
- [Bố cục 360px](output/playwright/game-360.png), [cảm ứng 390px](output/playwright/touch-390.png)

## Đối chiếu tài liệu

| Tài liệu | Hệ thống bàn giao |
| --- | --- |
| [Phase 01](phase01.md) | Menu, một món tương tác hoàn chỉnh, phin nhỏ 8 giây, phục vụ, thưởng, hướng dẫn 3 khách, reset, trạng thái chuẩn bị tách khỏi animation |
| [Phase 02](phase02.md) | Bốn món, sữa giữ-rót, bọt cần chuyển động, khuấy góc thực, chất lỏng phân lớp và hòa màu theo tiến độ, định lượng/chất lượng, sổ tạm dừng, bỏ ly làm lại |
| [Phase 03](phase03.md) | Ca 06:00–10:00, năm kiểu khách, trạng thái/kiên nhẫn riêng, đa nhiệm hai phin, cao điểm, combo 3/5/10, tip/danh tiếng, nhận xét và tổng kết, sang ngày |

Quyết định theo kế hoạch đã duyệt: hướng dẫn dùng 1 phin; game chính có sẵn 2 phin và 3 ghế. Không thêm cửa hàng nâng cấp của phase 05. Hướng dẫn dùng tiền luyện tập tách biệt; game chính chốt dữ liệu cuối ca.

## Phạm vi kiểm thử logic

`tests/game.test.js` kiểm tra:

- Chặn chuyển trạng thái sai, phin pha theo elapsed time, nén sát ngưỡng số thực.
- Bốn công thức và thứ tự nguyên liệu vô hại; thiếu/thừa/sai nguyên liệu; thêm sữa sau khuấy.
- Trạm độc lập, bỏ ly; chuyển động khuấy/đánh trứng, giữ yên và nhảy tọa độ.
- Tiền thưởng một lần, khách thoát một lần, combo 3/5/10, mất combo khi sai đơn hoặc khách bỏ về.
- Hết kiên nhẫn, giờ cao điểm, ngừng nhận khách, đóng cửa, hướng dẫn ba khách, giới hạn khách/ngày.
- Tổng kết, danh tiếng tích lũy, chốt ca không lặp, reload giữa ca, tách tiền luyện tập.
- Lưu hỏng, phiên bản lạ, trường dữ liệu sai, localStorage bị chặn, lưu cài đặt và reset.

## Những lỗi đã sửa trong quá trình QA

- Khung canvas bị tràn sau resize do kích thước tối thiểu của CSS grid: chuyển sang parent có kích thước giới hạn theo viewport, tăng tần suất kiểm tra resize.
- Vùng chạm container lệch gốc tọa độ: dùng tọa độ phù hợp display origin của Phaser và mở rộng chiều cao vùng chạm nút nhỏ.
- Phin che nhãn trạm, bubble che mặt khách: điều chỉnh kích thước/vị trí.
- Nén đủ 0,65 giây qua nhiều bước có sai số số thực: thêm epsilon ở ngưỡng chuyển trạng thái.
- Phaser gọi `preventDefault()` trên touchcancel không thể hủy: chặn mặc định có kiểm tra `cancelable` cho touchstart/move/end, giữ CSS `touch-action: none`. Kiểm tra lại touchcancel không còn lỗi console và không cuộn trang.
- Bộ quan sát development gọi nhầm API timer: thay bằng số lượng timer chỉ đọc; production không chứa bộ quan sát này.

## Chạy lại kiểm tra trình duyệt

Các file `scripts/qa-*.js` là hàm dành cho lệnh `run-code` của Playwright CLI, không chạy bằng `node` trực tiếp. Dùng **profile kiểm thử riêng** vì kịch bản có đặt fixture localStorage.

```sh
npm run dev
# Ở terminal khác:
npx --package @playwright/cli playwright-cli -s=phin-qa open http://127.0.0.1:5173 --headed
npx --package @playwright/cli playwright-cli -s=phin-qa run-code "$(cat scripts/qa-tutorial.js)"
npx --package @playwright/cli playwright-cli -s=phin-qa run-code "$(cat scripts/qa-two-stations.js)"
npx --package @playwright/cli playwright-cli -s=phin-qa run-code "$(cat scripts/qa-milk-and-egg.js)"
npx --package @playwright/cli playwright-cli -s=phin-qa run-code "$(cat scripts/qa-finish-day.js)"
```

Ba kịch bản `two-stations` → `milk-and-egg` → `finish-day` chạy nối tiếp cùng session. Hai kịch bản đầu tự tạm dừng khi hoàn tất để có thể quan sát mà không làm khách hết kiên nhẫn. Chờ game render sau thao tác chuyển trang sổ trước khi bấm nút tiếp theo.

`qa-touch.js`, `qa-touch-advanced.js`, `qa-layout.js`, `qa-lifecycle.js` tự mở lại trang, có thể chạy độc lập. Với `qa-production.js`, build trước, chạy `npm run preview` ở cổng 4173.

## Giới hạn còn lại

- **Chưa thử trên điện thoại vật lý, Safari/iOS hoặc Firefox.** Cảm ứng hiện xác minh bằng Chromium CDP; safe-area được cấu hình nhưng chưa đo trên thiết bị có notch thật.
- Browser tự động giữ tab ở trạng thái visible dù mở tab khác. Vì vậy kiểm tra ẩn tab dùng sự kiện mô phỏng, không tuyên bố đã kiểm tra hành vi hệ điều hành trên điện thoại.
- Quan sát được khoảng 60–75 FPS ở máy kiểm thử; đây không phải benchmark smartphone. Đã kiểm tra vài lần chuyển scene và cleanup timer/tween, chưa chạy soak test nhiều giờ hoặc profile heap dài hạn.
- Nghệ thuật là minh họa Graphics tạo bằng mã; âm thanh là tín hiệu/không khí đường phố tổng hợp, chưa có soundtrack thu âm. Những nâng cấp mỹ thuật và âm thanh sâu thuộc phase 04.
- Chưa triển khai phase 04–08 và chưa xuất bản lên hosting. Bản này không có nâng cấp quán, VIP, sự kiện ngẫu nhiên, achievement hoặc khôi phục ly đang pha giữa ca.
