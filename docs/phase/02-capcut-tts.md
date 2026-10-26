# Bước 02 — Chuyển CapCut TTS sang TypeScript

Ngày: 2026-10-26. Trạng thái: kiểm chứng cloud một đoạn thành công; đang kiểm tra cache và lỗi.

## Đã thực hiện

- Triển khai client một đoạn trong `src/tts/capcut.ts`, dùng Node.js `fetch` và `crypto`.
- Mang catalog giọng và public key cần cho giao thức; kèm Apache 2.0 và ghi nhận nguồn trong `THIRD_PARTY_NOTICES.md`.
- Giữ metadata, SSML, cách tạo trường kiểm tra request, task create/query và MP3 gốc.
- Bổ sung kiểm tra giọng, tốc độ, kết quả một audio, timeout tổng, timeout request và hủy HTTP.
- Không retry tạo task khi phản hồi không rõ; query/download retry tối đa hai lần. Không fallback sang giọng khác hay im lặng.

## Kết quả gọi thật

Câu thử: “Xin chào, đây là video được tạo bằng mã nguồn TypeScript.”

- Giọng: `capcut:BV421_vivn_streaming`, tốc độ 1.0.
- Tạo task → polling → tải MP3 thành công.
- Kích thước: 67.200 byte. Tổng thời gian: 3.298 ms.
- Audio thử: `out/probe/capcut.mp3` (artifact cục bộ, không đưa vào Git).
- Không yêu cầu timestamps; chưa kiểm chứng batch hoặc đồng bộ từng từ.

## Tiếp theo

Đo/decode audio, dựng thử bằng Remotion, kiểm tra cache theo nội dung và các nhánh lỗi bằng test giả lập. Nghe và đánh giá phát âm vẫn cần người sử dụng xác nhận; phản hồi HTTP thành công không phải đánh giá chất lượng giọng.
