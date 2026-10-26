# Bước 04 — Cảnh, hoạt ảnh và phụ đề

Ngày: 2026-10-26. Trạng thái: render mẫu và kiểm tra hình thành công.

- Có cảnh title, image-and-text, bullets, stat, comparison và outro.
- Theme dùng chung, font Noto Sans đóng gói cục bộ; kèm giấy phép font.
- Có fade, slide, zoom, spring, xuất hiện lần lượt và số đếm theo frame.
- Vùng phụ đề nằm bên dưới nội dung chính; chia tối đa ba dòng, mỗi dòng tối đa 52 ký tự.
- Phụ đề chèn vào video và SRT dùng cùng cue theo đoạn audio. Chưa có đồng bộ từng từ.
- Dự án mẫu `examples/intro/project.json` sử dụng cả sáu loại cảnh và SVG minh họa cục bộ.
- Preview và render nhận cùng `prepared.json`; không gọi TTS trong component React.

## Kết quả render đầu tiên

- Video: `out/intro-1793001617277-944f3344/video.mp4`.
- Có đủ sáu cảnh và 11 audio CapCut thật. Thời lượng timeline: 53 giây.
- ffprobe: H.264, 1920 × 1080, 30 fps, audio AAC; container 53,013 giây, 4.696.926 byte. Sai số container/audio mux khoảng 13 ms so với timeline.
- Render và xuất sáu ảnh đại diện: 63.069 ms trên máy hiện tại, concurrency 2.
- Đã xem đủ sáu ảnh: dấu tiếng Việt hiển thị đúng, nội dung mẫu không tràn và phụ đề không che nội dung chính.
- Studio đã build và trả HTTP 200 với props đúng của dự án. Benchmark sau cài đặt sạch được ghi riêng ở bước 06.
- Chưa đánh giá chất lượng giọng bằng nghe trực tiếp; cần người dùng duyệt phát âm/nhịp đọc khi xem video mẫu.
