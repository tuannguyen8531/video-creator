# 14 — Phụ đề ngắn và kích thước tùy chọn

- Bỏ khóa 1920 × 1080; width/height nhận số nguyên chẵn 240–3840, mặc định vẫn 1920 × 1080, fps 30.
- Tách câu bằng Intl.Segmenter rồi chia phần quá dài: tối đa 32 ký tự khung dọc, 52 ngang/vuông. Chỉ hiện một phần tại một thời điểm; SRT dùng cùng timeline phụ đề.
- Giữ cue audio/action/khẩu hình nguyên vẹn. Gom lớp phụ đề dùng chung cho slide, character, custom; custom captions:false vẫn tắt lớp này.
- Cảnh mẫu thu vừa canvas 1920 × 1080 và căn giữa. Custom nhận khung thực để tự dàn bố cục.

Đã chạy: typecheck; 24/24 tests; render MP4 thật bằng audio tone cục bộ ở projects/caption-phone-check, không gọi cloud. ffprobe xác nhận 1080 × 1920. Đã xem preview: câu thứ hai hiện riêng ở đáy, không che tiêu đề; cảnh ngang nằm giữa khung dọc với khoảng nền trống. Artifact: đọc projects/caption-phone-check/output/latest.json.

Giới hạn: mốc chia trong audio là ước lượng tỷ lệ chữ, chưa có forced alignment; muốn khớp câu dùng một narration mỗi câu. Kiểm tra tone không xác nhận phát âm hay độ khớp lời nói. Chưa duyệt mỹ thuật mọi layout ở mọi tỷ lệ; cảnh mẫu không tự chuyển sang thiết kế dọc. Custom cần chừa vùng phụ đề và tự đáp ứng width/height. Giới hạn ký tự không thay cho đo glyph mọi font/ngôn ngữ.
