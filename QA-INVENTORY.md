# QA — Kho và mua nguyên liệu

Kiểm tra ngày **11/10/2026** trên macOS, Node **22.22.2**, Phaser **3.90.0** và Vite **6.4.4**.

## Kết quả

| Hạng mục | Kết quả thực tế |
| --- | --- |
| Logic | **79/79 đạt** bằng `npm test`: giữ 68 test có sẵn và thêm 11 test kho/migration/giao dịch/tiêu hao |
| Build | `npm run build` thành công; bundle dùng đường dẫn tương đối như trước |
| Migration | Fixture v2 chuyển sang v3, giữ ngày/tiền/nâng cấp và tạo kho khởi đầu; khóa v2 vẫn còn làm bản dự phòng |
| Mua hàng | Tab nguyên liệu hiển thị 5 loại; double-click chỉ mua một gói; số dư, tồn kho và chi nhập hàng lưu cùng lần ghi |
| Thao tác thật | Kéo ly, đặt phin, xúc bột rồi thả vào phin mới trừ 1 bột; kéo đá trừ 1 phần; bỏ ly không hoàn lại |
| Sữa và trứng | Rót thực tế trừ 0,464 phần sữa; phới đứng yên không trừ trứng, chuyển động hợp lệ đầu tiên mới trừ 1 quả |
| Checkpoint | Trong ca, snapshot giảm bột/đá nhưng localStorage chưa giảm; reload khôi phục đúng kho đầu ngày |
| Hết hàng | Kho bằng 0 đóng ca sớm, chuyển sang tổng kết “Hết nguyên liệu”, sang ngày kế và không tự cộng khách bỏ về |
| Cảm ứng mô phỏng | Hai suite CDP đạt: pha/phục vụ/bỏ ly/touchcancel và rót sữa/khuấy/đánh trứng; tutorial giữ kho chính nguyên vẹn |
| Production | Đường dẫn gốc và `/phin-goc-pho/` tải thành công; 0 lỗi console, asset kiểm tra trả HTTP 200 |
| Console | Kịch bản QA mới hoàn tất với **0 lỗi console/page** |

Các bài test logic còn kiểm tra định mức bốn món, bạc xỉu dùng 0,5 bột, rót sữa lẻ, trứng/đá, nhập nhanh nguyên tử, thiếu tiền, stale tap, tutorial vô hạn, lọc món còn hàng, ly đã có nguyên liệu và chống chốt ngày trùng.

## Bố cục đã kiểm tra

Tab nguyên liệu được chụp và thao tác tại 360×800, 390×844, 430×932, 480×800 và desktop 1440×900. Canvas giữ tỷ lệ 480×800, không che nút nhập nhanh hoặc hai nút điều hướng.

- [360×800](output/playwright/inventory-shop-360x800.png)
- [390×844](output/playwright/inventory-shop-390x844.png)
- [430×932](output/playwright/inventory-shop-430x932.png)
- [480×800](output/playwright/inventory-shop-480x800.png)
- [Desktop 1440×900](output/playwright/inventory-shop-1440x900.png)
- [Số tồn trên khay](output/playwright/inventory-game-stock-badge.png)
- [Tổng kết hết nguyên liệu](output/playwright/inventory-stockout-summary.png)

Chạy lại kiểm tra trình duyệt khi dev server ở cổng 5175:

```sh
npx --package @playwright/cli playwright-cli -s=inventory-qa open http://127.0.0.1:5175 --headed
npx --package @playwright/cli playwright-cli -s=inventory-qa run-code "$(cat scripts/qa-inventory.js)"
```

## Giới hạn

Chuột và cảm ứng CDP được kiểm tra trong Chromium. Chưa chạy trên điện thoại vật lý, Safari/iOS hoặc Firefox; chưa đánh giá cân bằng kinh tế bằng nhiều ngày chơi liên tục và chưa xuất bản hosting.
