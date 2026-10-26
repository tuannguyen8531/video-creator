# Bước 11 — Agent tự chọn hình thức, giọng và ngôn ngữ

Ngày: 2026-10-26. Trạng thái: đã triển khai, kiểm chứng và cập nhật hướng dẫn.

## Yêu cầu

Theo yêu cầu từng user, agent có thể chọn thuyết trình, nhân vật, hình thức khác hoặc phối hợp; tự chọn giọng/ngôn ngữ phù hợp. Các mẫu trước là ví dụ, không phải định hướng bắt buộc cho mọi video.

## Thay đổi thực tế

- Bỏ mặc định CLI trỏ tới mẫu nhân vật. Chỉ dùng `--project <file>` hoặc `./project.json`; thiếu dự án thì báo rõ, không tự render demo.
- Bỏ giọng tiếng Việt mặc định trong schema. Từng đoạn TTS cần voice tường minh hoặc kế thừa lựa chọn của dự án. Audio cục bộ/cảnh không lời đọc không bắt khai báo voice.
- Có `language` ở mức dự án và đoạn; nếu không ghi thì lấy từ catalog của voice đã chọn, không mặc định tiếng Việt.
- Kiểm tra ngôn ngữ cơ sở của voice theo metadata catalog; không tự dịch hay đổi giọng khi không khớp.
- SSML `xml:lang` và header `lan` lấy ngôn ngữ thực của đoạn, thay các giá trị hardcode trước. Giữ metadata vùng thiết bị riêng với lựa chọn giọng/ngôn ngữ.
- Cache v2 chứa ngôn ngữ và request version; không dùng lại cache v1 vì payload đã đổi. Giữ cache cũ, không xóa audio người dùng.
- `voices --language <tag> --json` cho agent lọc catalog mà không cần UI.
- Cảnh `custom` nhập component React TSX/JSX cục bộ với `props` tự định nghĩa. Entry sinh import module bằng đường dẫn, không phải eval chuỗi JSON.
- Trộn cảnh custom, slide và nhân vật trong cùng timeline. CLI/Studio dùng cùng renderer sinh từ project, không sửa lõi mỗi lần có hình ảnh mới.
- Cảnh không lời đọc có duration tường minh; không gọi TTS/khẩu hình. Với audio, duration là thời gian giữ hình tối thiểu.
- Có tùy chọn font dự án để dùng font phù hợp hệ chữ; custom có thể tự bố trí/font/caption riêng.
- Thêm `AGENTS.md`, sửa README và hướng dẫn để agent đọc brief rồi tự chọn cách kể, không tự áp mẫu/nhân vật/giọng.

## Ví dụ chạy thật

`examples/flexible/project.json` đã render thành công:

1. Cảnh thuyết trình, `en-US`, giọng `capcut:en_us_006`.
2. Component `Orbit.tsx` viết riêng, `vi-VN`, giọng `capcut:BV421_vivn_streaming`.
3. Nhân vật 2D có khẩu hình, `vi-VN`, cùng giọng Việt được chọn tường minh.

Artifact: `out/flexible-story-1793004991324-68ea338c/video.mp4`, cùng SRT/report/props và ba ảnh cảnh.

- Timeline 15,1333 giây, 3 đoạn audio mới, 14 HTTP request TTS, 1 lần phân tích khẩu hình.
- Chuẩn bị 10,222 giây; bundle/render/ảnh 23,094 giây.
- Đã xem ba ảnh: layout khác nhau, component custom thực sự được dùng, phụ đề Anh/Việt hiện đúng trong các ảnh mẫu.

`examples/flexible/silent.json` đã render thành công:

- Artifact `out/silent-motion-1793005221432-43e3d8f5/video.mp4`.
- 1 giây, không voice/language, 0 request TTS, 0 lần phân tích khẩu hình, SRT rỗng.

## Kiểm chứng

- `npm run typecheck`: qua, bao gồm component ở `examples/` và các dự án ở `projects/`.
- `npm test`: 21/21 qua. Có kiểm tra không tự chọn project/voice, kế thừa/ghi đè language, ngôn ngữ không khớp voice, cache key theo ngôn ngữ, cảnh trộn/custom import, font được copy đúng, cảnh không lời đọc và thời gian giữ hình tối thiểu không trì hoãn/cắt audio.
- Các test cũ về TTS, hủy/timeout, cache hỏng, IK, đạo cụ bám tay, props Studio và lifecycle npm vẫn qua.
- Video trộn: ffprobe xác nhận H.264/AAC, 1920 × 1080, 30 fps, container 15,147 giây, 1.777.400 byte. FFmpeg decode toàn bộ không báo lỗi. Container dài hơn timeline khoảng 14 ms do mux audio.
- Video không lời đọc: ffprobe xác nhận chỉ có stream H.264, thời lượng 1 giây, không sinh audio im lặng.
- Chạy prepare lại cho video trộn: 3 audio cache hit, 1 lip-sync cache hit, 0 HTTP request, 0 lần phân tích lại; 0,118 giây. Báo cáo ở `out/flexible-story-1793005566051-d1f63c7e/report.json`.
- `npm run --silent voices -- --language en-US --json` trả danh mục giọng có tag ngôn ngữ để agent lựa chọn; không gọi cloud chỉ để liệt kê.
- Studio source với custom imports vẫn có defaultProps object literal trích xuất/lưu được qua codemod test. Bước này chưa chạy lại mọi thao tác UI Studio.
- Có `AGENTS.md`, README và `docs/custom-scenes.md`/`docs/agent-guide.md` cập nhật. Lựa chọn mẫu nhân vật mặc định và nhận định hướng 2D bắt buộc ở các ghi chép cũ đã được thay thế bằng chính sách theo brief.

## Giới hạn

Custom mở đường cho agent viết code/asset mới, không tự sinh được mọi nhân vật/động tác chỉ từ tên. Core vẫn giới hạn đầu ra 1080p/30 fps và dữ liệu/timeline hợp lệ. Các giới hạn kỹ thuật không phải phong cách nghệ thuật bắt buộc.

Đã gọi thật hai giọng Anh/Việt nêu trên; chưa xác nhận mọi voice trong catalog còn hoạt động hoặc mọi hệ chữ hiển thị đúng. Noto Sans đi kèm không thay thế font cho tất cả ngôn ngữ. Provider tích hợp hiện là CapCut; có thể dùng audio cục bộ từ nguồn khác, không giả định đã có backend TTS khác.
