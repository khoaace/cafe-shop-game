# QA bộ vật phẩm mới — 10/10/2026

## Thay đổi

Tạo 14 sprite PNG alpha bằng **built-in imagegen**, lưu trực tiếp trong [public/assets/items](public/assets/items/). [Prompt đầy đủ](public/assets/items/PROMPTS.md).

Ly, phin rỗng, muỗng (dùng chung cho khuấy), hũ bột, lõi nén, ấm nước, lon sữa đặc, lon cao cấp, bình sữa tươi, đá, tô trứng, phới, thùng bỏ ly và coaster dùng cùng phong cách có chất liệu. Khay, ảnh kéo, bàn pha, menu, sổ và shop cùng dùng bộ này. Mỗi texture được chuẩn bị một lần, cạnh dài tối đa 512 px; ảnh nguồn PNG được giữ nguyên. Không thay gameplay, kinh tế hoặc schema save v2.

Ly trên trạm chỉ hiện khi model có ly. Bột, lõi nén, cà phê, sữa, bọt và đá là các lớp riêng theo trạng thái thực; ảnh phin nguồn luôn rỗng. Màn hình tải có thanh tiến độ. Tổng ảnh nguồn khoảng 20 MiB; chưa tối ưu tải qua mạng chậm.

## Kết quả thực tế

- `npm test`: **60/60 PASS**. `npm run build`: PASS.
- Chuột, DPR 2: kéo ly, phin rỗng, xúc bột, nén/rót, ủ, thêm đá, phục vụ Perfect; bỏ ly trả trạm về trống. Không có lỗi JavaScript.
- Cảm ứng **mô phỏng** Chromium, 390×844/DPR 2: kéo sai, hủy touch, từ chối ly thiếu bước, pha/đá/phục vụ, bỏ ly, rót sữa, khuấy vòng, giữ phới đứng yên không tăng tiến độ, đánh trứng và chuyển bọt. Không cuộn trang ngoài ý muốn. [Kết quả](output/playwright/items-touch-result.json).
- Bốn phin: phin khuất hoàn thành độc lập; đổi trang khi đang kéo hủy an toàn, không nhân đôi ly; phục vụ và bỏ ly đúng trạm. Tạm dừng dừng đồng hồ.
- 16 lượt resize/DPR trong cùng ca, qua 360×800, 390×844, 430×932, 480×800, 1366×768, 1440×900, 1920×1080 và 2560×1440: giữ ID ly, hủy kéo, hit area đúng, sổ dừng đồng hồ. Canvas và texture chữ đổi theo R1–R4. Hai lần trở về 480×800: **50 texture / 36 Text**, không tăng sau resize.
- 8 vòng Game → sổ → Menu: menu giữ **25 object cấp scene, 0 timer, 0 tween**, listener đầu vào bằng 0; Game giữ một listener cho mỗi sự kiện kéo. Con số object này là `scene.children.length`, không tính sâu từng child trong Container. [Kết quả trang/resize/lifecycle](output/playwright/items-review-result.json).
- Production tại `/phin-goc-pho/`, 1920×1080/DPR 2, canvas thật **1440×2400**: tự tay pha và phục vụ bốn công thức, **4 Perfect**, reviewer, thử thách; đợi ca thật 180 giây, chốt và reload. Kịch bản chỉ phục vụ bốn món, ba khách còn lại được tính bỏ về. Tiền không cộng lặp.
- Production đường dẫn gốc `http://localhost:4173`: tải đủ 14 ảnh, không lỗi JavaScript/HTTP; [ảnh](output/playwright/items-production-root.png).
- Sau ca production: bấm mua phin liên tiếp chỉ trừ đúng 50.000đ cho phin thứ ba, mở ngày mới, thao tác hai trang, mở sổ/notebook và reload giữ nâng cấp. Không có lỗi console/JavaScript hoặc HTTP ảnh. [Kết quả production](output/playwright/items-production-result.json).

Khoảng cách frame đo trên máy kiểm tra hiện tại, mẫu 119 khoảng rAF ở cảnh bốn phin: median **13,3 ms**, p95 **14,3 ms**. Đây không phải thời gian GPU và không phải benchmark so sánh trước/sau ở cùng tần số màn hình. Không suy ra hiệu năng điện thoại vật lý. **Chưa thử trên điện thoại thật.**

## Ảnh đã kiểm tra

- [Phin chưa có bột](output/playwright/state-art-phin-empty.png), [sau khi xúc bột](output/playwright/state-art-phin-grounds.png), [ly sẵn sàng](output/playwright/state-art-ready.png).
- [Khay pha phin](output/playwright/items-tray-brew.png), [sữa và đá](output/playwright/items-tray-milk.png), [trứng và phới](output/playwright/items-tray-egg.png).
- [Menu](output/playwright/items-menu.png), [cửa hàng](output/playwright/items-shop.png), [công thức trứng](output/playwright/items-book-3.png).
- [Bốn phin](output/playwright/items-four-phins.png), [production đen đá](output/playwright/items-production-recipe-0.png), [sữa đá](output/playwright/items-production-recipe-1.png), [bạc xỉu](output/playwright/items-production-recipe-2.png), [cà phê trứng](output/playwright/items-production-recipe-3.png).

## Chạy lại

Dev đang ở `http://localhost:5175`; preview đường dẫn con ở `http://127.0.0.1:4174/phin-goc-pho/`. Các script dùng Playwright CLI `run-code`:

- `scripts/qa-state-art.js`: chuột, trạng thái ly/phin/bột.
- `scripts/qa-sharpness-touch-suite.js`: hai chuỗi cảm ứng mô phỏng.
- `scripts/qa-items-review.js`: bốn phin, resize, lifecycle và chụp các khay/sổ/shop.
- `scripts/qa-items-production.js`: ca production thật và vòng shop/ngày mới/reload.

Các suite tạo context riêng và save kiểm thử, không sửa save đang chơi của người dùng. Chưa xuất bản hosting.
