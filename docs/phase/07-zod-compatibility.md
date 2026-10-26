# Bước 07 — Sửa xung đột phiên bản Zod

Ngày: 2026-10-26. Trạng thái: đã sửa xung đột và kiểm chứng; advisory dependency vẫn còn như ghi dưới đây.

## Nguyên nhân

Ở bước 01/06, dự án override Zod lên 4.6.7 để tránh advisory của bản 4.5.4. Remotion 4.0.538 kiểm tra phiên bản Zod bằng so sánh chính xác nên CLI vẫn báo `Version mismatch`, dù render trước đó đã thành công.

Đã kiểm tra npm registry và [tài liệu Remotion](https://www.remotion.dev/docs/zod-types/): bản mới nhất hiện vẫn là 4.0.538 và yêu cầu Zod 4.5.4. Chưa có bản Remotion mới hơn để nâng đồng bộ và giải quyết cả hai vấn đề.

## Thay đổi

- Khóa dependency trực tiếp Zod ở `4.5.4`, bỏ override toàn cục và cập nhật lockfile.
- Không sửa node_modules, không đổi metadata package, không che cảnh báo qua log level.
- CLI đọc JSON theo stream và từ chối file vượt 1 MiB trước khi JSON/Zod parse; giữ tài nguyên ngoài JSON.
- Thêm test giới hạn kích thước; giữ nguyên các test schema, kế thừa giọng, cache và TTS.
- Cập nhật README/hướng dẫn agent theo cấu hình mới. Các bước 01/06 là kết quả lịch sử của cấu hình cũ, không còn đại diện cho dependency hiện tại.

## Đánh đổi còn lại

Zod 4.5.4 còn thuộc phạm vi [advisory về tiêu thụ bộ nhớ](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5); bản vá là 4.6.6 trở lên. Việc khớp phiên bản Remotion không sửa advisory đó. Giới hạn JSON chỉ áp dụng đường CLI của dự án, không vá Zod hay bảo đảm mọi đường nhập liệu của Studio được bảo vệ.

Khi Remotion hỗ trợ bản Zod đã vá, nâng các package Remotion đồng nhất và Zod lên bản được hỗ trợ; chạy lại versions, typecheck, test và render.

## Kiểm chứng

- `npm exec -- remotion versions`: exit 0, Zod 4.5.4, các package Remotion đồng nhất 4.0.538; thông báo `All packages have the correct version.`
- `npm run browser`: thành công, không còn `Version mismatch`.
- `npm run typecheck`: thành công.
- `npm test`: 12/12 test qua, gồm test giới hạn JSON mới và hồi quy kế thừa giọng.
- Bundle + render 30 frame có audio từ dự án đã chuẩn bị: thành công, `out/zod-compatibility/video.mp4`. Không gọi lại TTS và không render lại toàn bộ mẫu khi chỉ cần kiểm chứng dependency.
- `npm install`: còn 10 mục high trong audit phát sinh từ Zod và các dependency phụ thuộc nó; không báo 0 vulnerabilities cho cấu hình hiện tại.
