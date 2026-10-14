# Chuẩn bị hosting

Bản giao **chưa được xuất bản**, chưa tạo tài khoản/dự án hosting. Mọi hướng dẫn dưới đây để chủ dự án chủ động triển khai sau khi xem bản preview.

## Build và kiểm tra

```sh
npm ci
npm test
npm run build
npm run preview
```

Upload **nội dung `dist/`**, không upload `node_modules`, thư mục source hoặc các fixture QA. Không cần backend, secret hoặc rewrite SPA. `vite.config.js` dùng `base: './'`: asset tương đối, dùng được ở `/` hoặc `/phin-goc-pho/`. Dùng URL kết thúc bằng `/` cho thư mục con.

Kiểm tra subpath tại máy:

```sh
node scripts/preview-subpath.js
# http://127.0.0.1:4174/phin-goc-pho/
```

Server nhỏ này chỉ dùng cho QA tại máy, trả 404 thật cho file thiếu. `npm run preview` cũng chỉ là công cụ xem build tại máy, không phải production server.

## Cloudflare Pages

Trong Pages, kết nối repository của bạn hoặc dùng Direct Upload với thư mục `dist` đã build. Với Git integration, chọn root của dự án, build command `npm run build`, output `dist`, Node 22. Không cần preset framework hoặc Pages Functions cho game này. Chỉ bấm triển khai khi bạn muốn đưa site lên mạng. Tham khảo [cấu hình build Pages](https://developers.cloudflare.com/pages/configuration/build-configuration/).

## Netlify

Import repository hoặc upload `dist` bằng giao diện Netlify. Dự án đã có `netlify.toml` khai báo command `npm run build`, publish `dist`, Node 22. Không cần plugin runtime cho game tĩnh này. Nếu dùng Git integration, lưu ý các lần push vào nhánh production có thể tự triển khai. Xem [Vite trên Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/vite/).

## GitHub Pages

Kết nối repository của bạn, chọn **Settings → Pages → Source: GitHub Actions**. Copy [workflow mẫu](deploy/github-pages.yml.example) sang `.github/workflows/pages.yml`; mẫu chỉ chạy thủ công bằng `workflow_dispatch`, chưa kích hoạt trong dự án này. Workflow chạy `npm ci`, kiểm thử, build và upload `dist`, sau đó deploy Pages. Cần quyền `pages: write`, `id-token: write` và environment `github-pages`.

Giữ base tương đối hiện tại cho game không có URL route. Nếu sau này thêm routing hoặc đường dẫn asset tuyệt đối, cấu hình lại base cho tên repository theo [hướng dẫn chính thức của Vite](https://vite.dev/guide/static-deploy.html#github-pages). Các phiên bản Actions trong mẫu được lấy từ tài liệu này tại thời điểm bàn giao; kiểm tra lại khi kích hoạt workflow về sau.

## Dữ liệu khi đổi địa chỉ

Save thuộc origin của trình duyệt. Localhost, tên miền preview và tên miền chính thức có vùng localStorage riêng; đổi hosting không tự chuyển save giữa chúng. Không dùng fixture trong `scripts/qa-*` trên profile đang có tiến trình muốn giữ.

Sau deploy, tự xác nhận menu, pha một ly, tạm dừng, shop, reload, HTTPS và Network không có asset 404 trên URL thực. Phần này chưa thể xác minh khi chưa xuất bản.
