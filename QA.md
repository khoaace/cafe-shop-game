# QA — Phin góc phố, phase 01–08

**Bản kho nguyên liệu mới nhất:** xem [QA kho và mua nguyên liệu](QA-INVENTORY.md): save v3, 5 loại nguyên liệu, giao dịch nhập hàng, tiêu hao theo thao tác, đóng ca khi hết hàng, **79/79 test logic** và kiểm tra trình duyệt ở 5 kích thước.

**Bản đồ họa desktop mới:** xem [QA độ nét và hình ảnh](QA-DESKTOP.md): 60/60 kiểm thử, canvas HiDPI, ảnh trước/sau và kiểm tra hồi quy. Phần dưới lưu kết quả bàn giao phase 01–08 trước đợt nâng hình ảnh.

Kiểm tra ngày **10/10/2026** trên macOS, Node **22.22.2**, npm **10.9.7**, Phaser **3.90.0**, Vite **6.4.4**, Chrome/Chromium qua Playwright CLI. Không dùng lệnh hoàn thành pha, tua đồng hồ hoặc sửa khách trong ca.

## Kết quả đã thực hiện

| Hạng mục | Kết quả thực tế |
| --- | --- |
| Cài đặt / chạy | `npm install --ignore-scripts --no-audit --no-fund` thành công; dev/preview chạy, build production thành công |
| Logic | **56/56 đạt**: giữ nguyên 31 kiểm thử nền, thêm 25 kiểm thử tiến trình |
| Hướng dẫn | Pha và phục vụ 3 ly bằng chuột, mở sổ khi đang pha, tới tổng kết; tiền/ngày/tiến trình chính không đổi |
| Save v2 | Fixture v1 chuyển sang v2 giữ ngày, số dư, thống kê và 2 phin; save mới 1 phin/3 ghế; v1 giữ làm dự phòng |
| Phin nhiều trang | Pha bằng phin 1 và 3; phin 1 tiếp tục nhỏ và hoàn thành khi khuất trang; ID ly khác nhau |
| Hủy khi đổi trang | Dùng con trỏ thứ hai bấm trang trong lúc con trỏ đầu kéo ly: thao tác được hủy, đúng ly về đúng trạm, không nhân đôi |
| Bốn phin | Cả bốn có mô hình riêng; thao tác và phục vụ thật bằng phin 3 và 4, thanh P1–P4 cập nhật trạng thái |
| Sáu ghế | Đợi lịch khách thật tới đủ 6 người, chụp đủ 5 kích thước; đã phục vụ riêng đúng khách ở ghế 4, 5, 6 bằng thao tác kéo ly |
| Rót và thao tác sai | Rót thiếu nước ~20% nhận chất lượng thấp; rót thừa >160% rồi bỏ ly; khuấy mới ~2,08 rad bị từ chối; resize giữa kéo giữ đúng ID ly |
| Cảm ứng mô phỏng | Chuỗi đen đá hoàn chỉnh; thả sai, ly thiếu bước, touchcancel, bỏ ly; giữ-rót sữa, khuấy vòng, phới đứng yên không tăng bọt, chuyển động tạo bọt và đổ tô |
| Nhạc / hiệu ứng | Không tạo context của game trước tương tác, tắt riêng hai kênh, pause suspend âm, bật lại sau context bị suspend; lỗi/gián đoạn âm không dừng ca |
| Pause / ẩn tab | Sổ/pause dừng đồng hồ, kiên nhẫn và pha. Handler visibilitychange kiểm tra bằng document.hidden mô phỏng; về tab phải bấm tiếp tục |
| Sự kiện thực tế | Mưa/may mắn hiển thị đúng; mất điện từ elapsed 45–75 giây: quạt dừng, phin vẫn hoàn thành, quạt chạy lại; reload giữ lịch ngày |
| Vòng scene | 8 vòng Menu → Game → Sổ → Pause → Menu: không tăng object/timer/tween/listener, các điều khiển vẫn hoạt động |
| Production gốc | Hoàn thành ca mới 180 giây, mua phin, sang ngày, đặt hai ly và reload |
| Production đường dẫn con | Tại `/phin-goc-pho/`, pha/phục vụ đủ bốn món, reviewer, thử thách và chốt ca; reload giữ tiền/ngày |
| Console / asset | Hai ca production: **0 lỗi JavaScript/console, 0 HTTP asset lỗi**. Build không xuất `__PHIN_QA__` |

Fixture nâng cấp/ngày/sự kiện chỉ được đặt **trước ca**, trong profile kiểm thử riêng. Lịch khách, thời gian pha, nén, rót, chuyển động khuấy/đánh trứng và đồng hồ ca sau đó đều chạy thật. Kiểm thử không phải chứng minh người chơi đã kiếm đủ tiền để mua mọi nâng cấp từ ngày 1; giao dịch từng giá/cấp được kiểm tra riêng bằng logic và thao tác shop.

## Hai ca production đã chơi

**Ca ngày 1, save mới, một phin:** 6 khách, 6 Perfect, combo ×6, 0 bỏ về. Bán hàng 81.000đ + tip 20.400đ + combo 10.000đ + thử thách 5.000đ = **116.400đ**. Mở 3 huy hiệu đầu tiên/giờ cao điểm/quán 5 sao. Bấm mua phin hai lần liên tiếp: chỉ trừ **25.000đ**, còn **91.400đ**, 2 phin. Sang ngày 2, đặt hai ly và reload: tiền, nâng cấp và lịch ngày giữ đúng, ly giữa ca không khôi phục.

**Ca ngày 3, fixture reviewer seed 15, production subpath:** phục vụ đủ đen đá/sữa đá/bạc xỉu/trứng, mỗi món một Perfect. Bán 70.000đ + tip 19.400đ + combo 3.000đ + reviewer 10.000đ + thử thách 10.000đ = **112.400đ**. Save sang ngày 4, mastery mỗi món 1; Lan và Minh mở chương 1. Chủ động để 3 khách sau không được phục vụ nhằm kiểm tra đóng ca/khách bỏ về. Đây không phải ca không mất khách. Reload không cộng lại phần thưởng.

Sau khi sửa thông báo thưởng reviewer để không hiện nhầm “combo ×2”, tắt AudioContext mặc định không dùng của Phaser và thêm thoại giới thiệu sự kiện, đã build lại và chạy smoke production pha/phục vụ một Perfect, không có console error/asset lỗi.

Ảnh: [tổng kết ngày 1](output/playwright/phase08-day-one-summary.png), [shop sau mua phin](output/playwright/phase08-shop.png), [ngày tiếp theo](output/playwright/phase08-next-day.png), [tổng kết reviewer](output/playwright/phase08-reviewer-summary.png).

## Bố cục và hiệu năng quan sát

| Viewport | Canvas | Tình huống |
| --- | --- | --- |
| 360×800 | 360×600, y=100 | 4 phin / 6 khách |
| 390×844 | 390×650, y=97 | 4 phin / 6 khách, cảm ứng mô phỏng riêng |
| 430×932 | 430×716,66, y=107 | 4 phin / 6 khách |
| 480×800 | 480×800 | 4 phin / 6 khách |
| 1440×900 | 540×900, x=450 | 4 phin / 6 khách |

Các biên canvas nằm trong viewport, tỷ lệ 0,6; không cuộn trang khi thao tác cảm ứng. Dùng ResizeObserver cập nhật kích thước parent ngay, tránh canvas giữ kích thước trước khi resize.

Mẫu **120 khoảng requestAnimationFrame** khi ca đang chạy, 4 phin đã mua và 6 khách đang chờ: median **13,3ms**, p95 **14,3ms**, max **14,4ms** trên máy kiểm thử. Các phin đang trống trong mẫu này; pha khuất trang được kiểm tra riêng. Đây là khoảng giữa các frame ở trình duyệt desktop, **không phải thời gian CPU/GPU của riêng render, không phải benchmark smartphone**.

Trong 8 lần chuyển scene, Game có 49 object, 1 listener cho mỗi pointerdown/move/up/upoutside và 10 listener resize tổng hệ thống. Trở về Menu luôn 24 object, 0 timer/tween, 0 listener thao tác của Game, 9 listener resize nền của hệ thống. Không có tăng dần qua mẫu; chưa phải soak test nhiều giờ hoặc phân tích heap dài hạn.

Hiệu ứng hạt giới hạn 32 object tái sử dụng; một đợt tối đa 12 hạt. Mưa dùng 36 phần tử cố định; môi trường cập nhật tối đa khoảng 30 Hz, giảm chuyển động 2 Hz. Hình nền tĩnh không vẽ lại; trạm cache nền và ly khi trạng thái không đổi. Âm có giới hạn nguồn đồng thời và dọn khi pause.

Ảnh [mất điện vẫn pha](output/playwright/phase08-outage-brew.png), [ba phin](output/playwright/phase08-three-phins.png), [sổ truyện](output/playwright/phase08-stories-final.png).

Ảnh [360](output/playwright/phase08-six-360.png), [390](output/playwright/phase08-six-390.png), [430](output/playwright/phase08-six-430.png), [480](output/playwright/phase08-six-480.png), [desktop](output/playwright/phase08-six-1440.png).

## Đối chiếu từng phase

| Phase | Mã / hệ thống | Kiểm chứng |
| --- | --- | --- |
| 01 | Drink, BrewingStation, TutorialScene, DragController | 3 ly hướng dẫn thật; trạng thái, giữ-rót, pha tự động và chống nhận thưởng lặp |
| 02 | 4 công thức, GestureTracker, lớp chất lỏng, Overlay | Bốn món trên production; chuột/cảm ứng; giữ yên phới và khuấy thiếu bị chặn |
| 03 | DaySession, Customer, HUD, Summary | Hai ca đủ 180 giây; cao điểm, ngừng nhận khách, chốt ca và reload |
| 04 | Environment, art, AudioManager, cache StationView, pool hạt | Đi/ngồi/gọi món/chớp mắt/vui/giận; môi trường, rót/phin/đá/khuấy; điều khiển âm và giảm chuyển động |
| 05 | upgrades, StationManager, layout, ShopScene | Mọi giá/cấp/quyền lợi có test; double-click mua thật; 1/2/3/4 phin; đủ ghế 4–6 phục vụ đúng ID |
| 06 | dayPlan, VIPS, STORIES, review theo tình huống | 3.000 seed kiểm tra điều kiện/xác suất; reviewer và creator thật; mưa/may mắn/mất điện quan sát trong game; chương truyện lưu; quyền lợi sự kiện có unit test |
| 07 | progression, challenge, NotebookScene, mastery | Thử thách trả cuối ca một lần; 6 thành tựu đúng điều kiện; các mốc 5/15/30; thống kê, truyện và cài đặt trong sổ |
| 08 | tests, scripts/qa-phase08-*, README, HOSTING | Build/preview gốc và subpath, hồi quy, ảnh, frame sample, vòng scene và hướng dẫn hosting |

## Kiểm thử logic

`tests/game.test.js`: 31 kiểm thử nền **không sửa kỳ vọng**. API DaySession cũ không truyền cấu hình vẫn giữ hành vi tương thích; GameScene luôn truyền nâng cấp thực từ save, nên save mới có 1 phin.

`tests/progression.test.js`: 25 kiểm thử mới gồm chuyển v1, migration ghi thất bại, phục hồi bản dự phòng, chuẩn hóa dữ liệu, giá/cấp/số dư và mua trong ca, chống double purchase, lưu không khả dụng, seed/plan qua reload, lọc sự kiện và thử thách khả thi, phin khuất, sáu ghế, độ khó, mưa/lễ hội/may mắn, tip premium/VIP, quạt/mất điện, decor, reviewer một lần, lịch truyện, thưởng thử thách/chốt ngày một lần, điều kiện no-loss, cả 6 huy hiệu, mastery, review và cách ly hướng dẫn.

## Chạy lại

```sh
npm test
npm run build
npm run dev
# terminal riêng
npm run preview
# terminal riêng nếu kiểm tra subpath
node scripts/preview-subpath.js
```

Kịch bản là hàm Playwright CLI `run-code`, không chạy trực tiếp bằng Node. Dùng profile QA riêng: một số script xóa/đặt fixture localStorage của profile đó.

```sh
npx --package @playwright/cli playwright-cli -s=phin-qa open http://127.0.0.1:5173 --headed
npx --package @playwright/cli playwright-cli -s=phin-qa run-code "$(cat scripts/qa-tutorial.js)"
npx --package @playwright/cli playwright-cli -s=phin-qa run-code "$(cat scripts/qa-phase08-pages.js)"
npx --package @playwright/cli playwright-cli -s=phin-qa run-code "$(cat scripts/qa-phase08-six-seats.js)"
```

`pages` → `six-seats` chạy nối tiếp cùng profile, không sửa source/HMR giữa chừng. Các script mới khác tự thiết lập phiên: `extra-seats`, `invalid`, `events`, `audio`, `lifecycle-counts`, `production-day`, `production-recipes`. `production-day`/`production-recipes` chạy hơn 3 phút để đợi ca thật; không có tua thời gian. `qa-touch.js` và `qa-touch-advanced.js` dùng Chromium CDP touch events tại 390×844. Chuỗi phase 01–03 cũ và số liệu lịch sử ở [báo cáo trước](QA-PHASE01-03.md).

## Giới hạn xác minh

- **Chưa dùng điện thoại vật lý, Safari/iOS hoặc Firefox.** Cảm ứng là mô phỏng CDP; safe-area có cấu hình nhưng chưa đo notch thật. Không cam kết FPS trên thiết bị chưa thử.
- Trình duyệt tự động giữ tab visible; kiểm tra tab ẩn dùng `document.hidden` và sự kiện mô phỏng, không đại diện cho hành vi khóa màn hình hệ điều hành.
- Audio kiểm tra trạng thái WebAudio và khả năng phục hồi; chưa đánh giá chất lượng nghe qua loa điện thoại hoặc Bluetooth bị ngắt.
- Truyện ba chương và ngưỡng dài hạn được kiểm thử logic bằng nhiều ngày; chưa chơi thủ công liền 7+ ngày hoặc kiếm 500.000đ từ save mới trong một phiên QA.
- V1 không có lịch sử từng món/tip/thưởng/chi: không dựng dữ liệu giả. Tổng thu nhập lịch sử chỉ lấy doanh thu đã biết làm mốc, các bộ đếm thiếu bắt đầu 0.
- Chưa xuất bản công khai. Kiểm tra production dưới gốc/subpath diễn ra tại localhost; hướng dẫn [Cloudflare Pages, Netlify, GitHub Pages](HOSTING.md) đã chuẩn bị.

## Bộ vật phẩm mới (10/10/2026)

Đã thay dụng cụ bằng 14 PNG tạo bằng imagegen. Kết quả kiểm thử và ảnh mới nhất ở [QA-ITEMS.md](QA-ITEMS.md); các số liệu/ảnh phía trên giữ làm lịch sử phase 01–08.

## Nhân vật và khung cảnh mới — 10/10/2026

Xem [QA-WORLD.md](QA-WORLD.md): 21 ảnh/sprite sheet imagegen, 9 rig nhân vật, 3 cây, bối cảnh mới; 63/63 test logic, kiểm tra chuột/cảm ứng mô phỏng, production, fallback, resize/lifecycle và ảnh trước/sau. Báo cáo nêu riêng số đo frame time và giới hạn chưa kiểm tra điện thoại vật lý.
