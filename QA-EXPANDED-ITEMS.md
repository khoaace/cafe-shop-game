# Item của 7 tab pha chế — 15/10/2026

Đã thêm 28 sprite PNG alpha bằng built-in imagegen cho Muối, Dừa, Tắc, Đào, Vải, Cacao và Matcha. Giữ nguyên byte ảnh và frame của cả 14 sprite hiện có. Giữ bố cục, nhãn, định lượng và save.

- [Ảnh tổng hợp 7 tab](output/playwright/expanded-trays-review.jpg)
- [Các trạng thái nguyên liệu và dụng cụ](output/playwright/expanded-states-review.jpg)
- [Thao tác cảm ứng mô phỏng](output/playwright/expanded-touch-review.jpg)
- [Bộ 28 sprite](output/imagegen/new-items-contact.jpg)
- [Prompt đầy đủ](public/assets/items/PROMPTS-EXPANSION.md)

## Tích hợp

Asset được lưu trong `public/assets/items/`, nạp qua manifest item hiện tại và tạo GPU texture một lần, cạnh dài tối đa 512 px. Các lớp sprite được tái sử dụng trong `ItemSurface`; phần chất lỏng, bọt và hiệu ứng tiếp tục nhận dữ liệu từ model. Vỏ ca/cối trong suốt nằm trước chất lỏng; thớt, trái cây, hộp bột và tô được cập nhật theo trạng thái. Dùng chung hình cho item trên khay, item khi kéo, trái cây trên thớt/khu vắt và đào/vải đang rơi.

Khi kiểm tra thao tác thật, phát hiện nhánh sả không vào được đường xử lý `place` vì metadata chỉ cho phép trái cây. Bổ sung cờ `placeable` cho sả và cho router nhận cờ này; staging không trừ kho trước thao tác đập/lăn. Có kiểm tra hồi quy cho thả và hủy đặt sả.

## Kết quả

- `npm test`: **171/171 PASS**, bao gồm kiểm tra hồi quy đặt/hủy đặt sả.
- `npm run build`: **PASS**.
- 42 frame nằm trong kích thước PNG thật; 14 ảnh và frame cũ giữ nguyên so với Git HEAD.
- Desktop 480×800, DPR 2: chụp đủ 7 tab; thao tác thật đánh kem đến Perfect, lắp/xay máy, cắt/vắt tắc, cắt cam, đập sả, múc bột và đánh matcha chữ W. Hủy kéo bột hoàn lại nguyên liệu.
- Sau 4 vòng đổi đủ 7 tab: **36 sprite trong các lớp item, 253 texture và 604 display object**, giữ nguyên so với trước vòng lặp; một listener cho mỗi sự kiện kéo.
- Resize 360×800, 390×844, 1440×900 rồi về 480×800: chuyển tab được bằng tọa độ canvas đã đổi; ảnh được lưu trong `output/playwright/expanded-resize-*.png`.
- Cảm ứng Chromium mô phỏng 390×844, DPR 2: đủ 7 tab; kéo ly, múc/thả vải, cacao và gắp đào; kiểm tra lượng kho chính xác và hoàn nguyên liệu khi `touchCancel`. Chọn công thức trong sổ bằng chuột để chuẩn bị fixture; thao tác nguyên liệu dùng touch.
- 4 vòng Game → Menu: mỗi vòng Game có 20 sprite item tĩnh sau khi mở đủ 7 tab; Menu trở về **0 sprite item, 82 texture, 81 display object, 0 timer/tween và 0 listener kéo**. Không tăng tài nguyên giữa các vòng.
- Không có lỗi JavaScript trong các suite; suite desktop không có HTTP lỗi.

Chưa kiểm tra điện thoại vật lý. Bộ PNG nguồn mới có tổng dung lượng khoảng 40,2 MiB; giữ nguyên ảnh sinh ra, chưa tối ưu tải mạng.

## Chạy lại

Dev server: `http://localhost:5173`. Dùng Playwright CLI `run-code --filename` với các script sau; mỗi script tạo browser context riêng và save kiểm thử riêng:

- `scripts/qa-expanded-items.js`
- `scripts/qa-expanded-items-touch.js`
- `scripts/qa-expanded-items-lifecycle.js`

Kết quả chi tiết: [desktop](output/playwright/expanded-items-result.json), [touch](output/playwright/expanded-touch-result.json), [lifecycle](output/playwright/expanded-lifecycle-result.json).
