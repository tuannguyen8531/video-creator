# Bước 03 — Đầu vào, cache và timeline

Ngày: 2026-10-26. Trạng thái: đã kiểm chứng luồng chuẩn bị và cache.

## Đã triển khai

- Schema runtime bằng Zod: sáu loại cảnh, ID ổn định/không trùng, giới hạn nội dung, tốc độ, màu và 1080p/30 fps.
- Kiểm tra toàn bộ tài nguyên, giọng và độ dài phụ đề trước khi gọi cloud.
- Cache MP3 theo hash văn bản đã trim, giọng, resource ID, tốc độ thực gửi và phiên bản giao thức.
- Kiểm tra thời lượng/stream, decode audio mới bằng FFmpeg trước khi lưu cache. Ghi file tạm rồi đổi tên.
- TTS tuần tự ở bản đầu để hạn chế request; không thêm worker pool chưa đo đạc.
- Cho phép audio cục bộ được khai báo rõ trên từng đoạn, không dùng nó làm fallback ngầm.
- Timeline dùng frame nguyên: đệm đầu/cuối cảnh 0,5 giây, làm tròn lên độ dài audio, khoảng nghỉ sau từng đoạn.
- Cảnh nối tiếp, fade đầu/cuối nằm trong đệm; không chồng audio giữa hai cảnh.
- Mỗi lượt chuẩn bị có thư mục riêng và `prepared.json`, `captions.srt`, `report.json`.
- Lỗi audio chặn chuẩn bị/render; báo cáo đánh dấu đoạn thất bại, không tạo silence placeholder.

## Kết quả

- Dự án mẫu cloud: 11 đoạn tạo thành công, 54 HTTP request (gồm create/query/download), thời gian chuẩn bị 36.101 ms.
- Lượt sau: 11 cache hit, 0 HTTP request TTS. Báo cáo: `out/intro-1793001664325-5eb703ba/report.json`.
- Test tích hợp dùng MP3 thật do FFmpeg tạo và HTTP giả lập đã xác nhận: cache hit, đổi thứ tự không tạo lại, đổi text chỉ tạo lại đoạn đổi, cache hỏng được tạo lại.
- Test lỗi dịch vụ xác nhận đoạn có trạng thái `failed`, không có `prepared.json` và không lưu audio im lặng vào cache.
- Mười một test đã qua, gồm protocol, deadline/cancel, schema, captions, timeline và cache. Test giả lập không thay thế kiểm chứng cloud ở bước 02.
- Khi kiểm tra props Studio, phát hiện Zod gán giọng mặc định vào từng đoạn, làm mất kế thừa giọng dự án. Đã sửa schema đoạn để giọng thực sự tùy chọn và thêm test hồi quy.
