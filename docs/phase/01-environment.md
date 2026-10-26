# Bước 01 — Môi trường và khởi tạo

Ngày: 2026-10-26. Trạng thái: hoàn thành kiểm chứng môi trường, cài đặt sạch và render.

- Đã đối chiếu kế hoạch, giao thức CapCut TTS, hồ sơ thiết bị, cách ký request và catalog giọng.
- Client TTS giữ giấy phép Apache 2.0, copyright 2026 Hacht và thông báo thay đổi.
- Máy có Node.js 24.14.0, npm 11.19.0, FFmpeg/ffprobe và Noto Sans hỗ trợ tiếng Việt.
- npm registry trả phiên bản Remotion 4.0.538. Chọn khóa đồng nhất phiên bản các package Remotion.
- Đã cài package, tải Chrome Headless Shell 157.0.8080.0 bằng Remotion. `ldd` không báo thiếu thư viện.
- CapCut thật đã thành công ở bước 02; render MP4 sáu cảnh đã thành công ở bước 04.
- Phát hiện Zod 4.5.4 mà Remotion đề nghị có advisory về bộ nhớ. Đã dùng Zod 4.6.7 và npm override cho cả dependency gián tiếp; `npm install`/`npm ci` báo 0 vulnerabilities.
- Remotion CLI còn cảnh báo phiên bản Zod vì đề nghị 4.5.4. Không hạ xuống bản có advisory; đã kiểm chứng typecheck, schema, test, Studio build/HTTP và render với override. Cần kiểm chứng lại khi nâng cấp.
- `npm ci --cache /tmp/video-creator-npm-cache` thành công với lockfile, không tự gọi TTS. Sau cài lại, typecheck và 11 test tiếp tục qua.
- Các lệnh npm trong repo dùng `node --import tsx` thay vì CLI `tsx`, tránh yêu cầu IPC socket không cần thiết trong môi trường hạn chế.
- `npm ci` xóa Chrome tải trong node_modules; `npm run browser` hoặc lần render tiếp theo tải lại. Không cần cài Chrome hệ thống riêng.
- Có cảnh báo install-script esbuild từ npm; các lệnh TypeScript và bundle thực tế đã chạy được trong môi trường này. Không tự cho phép toàn bộ install script.

## Bước kế tiếp

Môi trường bản đầu đã đủ. Các bước nâng cấp dependency phải giữ kiểm tra schema, TTS giả lập, Studio và render mẫu.
