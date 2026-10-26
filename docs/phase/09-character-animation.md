# Bước 09 — Chuyển hướng sang hoạt hình nhân vật 2D

Ngày: 2026-10-26. Trạng thái: đã triển khai mẫu kiểm chứng; chờ người dùng duyệt mỹ thuật/diễn xuất. Kết quả kỹ thuật ở bước 10.

## Yêu cầu đã làm rõ

Video mẫu cũ là slide có hoạt ảnh; người dùng cần nhân vật 2D có khớp, đi lại, diễn xuất, biểu cảm, tương tác vật thể và miệng đồng bộ lời nói. Không coi thêm hiệu ứng chữ hoặc dịch chuyển toàn bộ hình nhân vật là đáp ứng yêu cầu này.

## Phần giữ lại

CLI npm, TypeScript/React/Remotion, CapCut TTS, cache audio, timeline theo frame, phụ đề và MP4/SRT. Các cảnh slide vẫn dùng được nhưng không phải ngôn ngữ hình ảnh chính của mẫu mới.

## Mẫu cần hoàn thành

Một cảnh ngắn có nhân vật vector tách bộ phận, nền có chiều sâu, chân/tay chuyển động, vẫy tay, chỉ đồ vật, cầm vật thể và đổi biểu cảm. Chuyển động miệng lấy từ phân tích audio thực, không gán chu kỳ mở/đóng giả khi có lời đọc.

Agent mô tả diễn viên, vật thể và hành động trong cảnh; hành động tham chiếu đoạn lời đọc với thời gian tương đối, giúp đổi giọng/tốc độ mà không làm lệch toàn cảnh.

## Khớp miệng

Đã kiểm chứng [Rhubarb Lip Sync](https://github.com/DanielSWolf/rhubarb-lip-sync) 1.14.0 trên Linux x64: nhận WAV và xuất các khoảng thời gian miệng A–H/X. Recognizer `phonetic` đã chạy với audio CapCut tiếng Việt thật; chưa cam kết độ chính xác từng âm vị.

Đây là công cụ native chạy từ Node.js, không cần Python. Chỉ cảnh nhân vật mới cần bước này; pipeline slide không tự phát sinh phụ thuộc mới. Dữ liệu miệng phải được cache theo audio thực tế và phiên bản cấu hình phân tích.

## Tiêu chí kiểm chứng

- Rig có đầu, thân, tay/chân và mặt điều khiển riêng; kiểm tra pose ở nhiều thời điểm.
- Chuyển động đi/cầm đồ không chỉ là trượt hình; vật thể gắn với tay trong đoạn cầm.
- Mouth cues xuất từ audio CapCut thật; miệng nghỉ ngoài khoảng nói và khi cue là X.
- Render lại cùng frame cho cùng kết quả, không phụ thuộc phát tuần tự trong trình duyệt.
- Giữ test của pipeline cũ; thêm kiểm tra dữ liệu hành động, nội suy và dữ liệu miệng.
- Xuất mẫu mới để người dùng duyệt phong cách. Chất lượng mỹ thuật/diễn xuất cần duyệt riêng, không suy từ test kỹ thuật.

## Đã triển khai

- Cảnh `character` với actor, prop, action và người nói theo đoạn.
- Rig SVG nguyên bản có khớp tay/chân, bước đi, đầu, mắt/lông mày, khẩu hình và dáng bàn tay.
- Các hành động walk, wave, point, pick-up, expression; cầm hộp đi theo nhân vật và kiểm tra tầm với.
- Nền phòng, đồ vật, chuyển động máy nhẹ và phụ đề theo audio.
- Lệnh `setup:lipsync`, cache khẩu hình theo bytes audio/cấu hình và report cache hit riêng.
- Mẫu `examples/character/project.json` là mặc định CLI mới. Các cảnh slide cũ vẫn hoạt động.
- Sửa thêm nhận diện npm lifecycle: npm 11 dùng `npm_command=run`; lệnh `npm run prepare` tường minh không còn bị bỏ qua. Install/ci vẫn không gọi TTS; có test hồi quy.
- [Hướng dẫn hoạt hình nhân vật](../character-animation.md) mô tả dữ liệu, hành động, giới hạn và cách mở rộng.

Đây là một rig mẫu hướng mặt trước, chưa phải hệ tạo nhân vật/diễn xuất tùy ý hoặc trình rig chuyên dụng. Artwork nhiều góc, quay thân/nghiêng, thả/chuyền đồ, va chạm và các phong cách khác cần công việc bổ sung sau khi duyệt mẫu.
