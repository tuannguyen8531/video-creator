# Bước 05 — CLI và hướng dẫn cho agent

Ngày: 2026-10-26. Trạng thái: CLI và hướng dẫn đã hoàn thành; Studio build/HTTP thành công.

- `npm run check -- --project ...`: kiểm tra schema, tài nguyên, giọng và phụ đề trước cloud.
- `npm run voices`: liệt kê catalog cục bộ, không xác nhận giọng còn được cloud hỗ trợ.
- `npm run voice -- --project ...`: tạo/cache audio và ghi dữ liệu chuẩn bị.
- `npm run prepare -- --project ...`: chuẩn bị audio, timeline, SRT và props.
- `npm run dev -- --project ...`: chuẩn bị dự án rồi mở Studio với đúng props.
- `npm run render -- --project ...`: chuẩn bị, bundle, xuất MP4 và ảnh từng cảnh; cập nhật report.
- `--concurrency 1..8`: số worker render, mặc định 2; không điều khiển TTS.

CLI trả exit code khác 0 khi lỗi; không công nhận video thiếu lời đọc. Có xử lý SIGINT/SIGTERM cho TTS/render và chuyển tín hiệu dừng tới Studio.

## Lưu ý npm lifecycle

Tên `prepare` cũng là lifecycle của npm. Đã thêm guard để `npm install`/`npm ci` chỉ cài dependency và không tự gọi TTS. Người dùng phải gọi `npm run prepare` một cách tường minh.

## Kết quả

- `check` xác nhận dự án mẫu hợp lệ, sáu cảnh.
- `render` đã tạo video, SRT, report và sáu ảnh đại diện với CapCut thật.
- `dev` khởi động Studio tại cổng 3000, bundle thành công, HTTP 200. HTML chứa `remotion_inputProps` của dự án intro và timeline 1590 frame, không phải props mặc định welcome.
- Đã kiểm chứng `npm ci` không gọi TTS; sau cài đặt sạch, typecheck và 11 test qua.
- Có [README](../../README.md) và [hướng dẫn agent](../agent-guide.md): schema, bộ cảnh, audio cục bộ, cache, CLI, thêm cảnh và chẩn đoán.
- Đã tạo dự án sáu cảnh từ kịch bản, chuẩn bị audio thật và render trọn luồng bằng CLI. Kiểm tra tương tác nghe/phát trong Studio vẫn cần người dùng thực hiện; chưa coi HTTP 200 là kiểm chứng mọi thao tác UI.
