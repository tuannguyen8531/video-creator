# Làm video từ yêu cầu người dùng

- Đọc yêu cầu và chọn ngôn ngữ hình ảnh phù hợp: thuyết trình, hoạt hình, motion graphics, cảnh tự viết hoặc kết hợp trong cùng video. Không coi mẫu vừa làm hoặc các dự án mẫu là phong cách bắt buộc.
- Tự quyết định bố cục, nhân vật, vật thể, giọng và ngôn ngữ từ nội dung/ngữ cảnh người dùng. Chỉ hỏi lại khi lựa chọn quan trọng chưa thể suy ra; không bắt người dùng chọn mọi tham số kỹ thuật.
- Mỗi video/dự án có `projects/<ten-video>/input/` và `output/`. Giữ project.json, brief, component và tài nguyên gốc trong input. Dùng `--project <ten-video>` hoặc JSON trong input; không ghi kết quả cuối vào input.
- Toàn bộ projects/ là dữ liệu làm việc cục bộ, được gitignore, gồm input, output và .work. Không tự thay quy tắc này, force-add hoặc đưa dữ liệu dự án vào Git nếu người dùng chưa yêu cầu.
- Để nền quản lý `.work/<run-id>/` (props, Studio, audio/assets tạm) và `output/<run-id>/` (MP4, SRT, report, previews). Đọc `output/latest.json` để tìm bản xuất thành công mới nhất. Không xóa hoặc ghi đè các bản trước nếu người dùng chưa yêu cầu.
- Tài nguyên dùng bằng staticFile('assets/...') đặt trong input/assets; không tạo thư mục tài nguyên theo dự án ở public chung. Cache audio/khẩu hình dùng chung ở .cache; không đưa cache vào output.
- Không tự dùng giọng tiếng Việt hoặc bất kỳ nhân vật mặc định nào cho mọi yêu cầu. Chọn voice từ catalog theo ngôn ngữ, nghe/kiểm chứng mẫu khi cần. Một video có thể có nhiều giọng và nhiều ngôn ngữ; cảnh không lời đọc dùng duration.
- Dùng component có sẵn khi phù hợp. Khi ý tưởng cần hình ảnh/chuyển động khác, viết component React riêng với `layout: custom`; không ép ý tưởng vào bảy kiểu cảnh hoặc năm động tác của rig mẫu.
- Tham khảo `docs/project-layout.md`, `docs/agent-guide.md`, `docs/custom-scenes.md`, `docs/character-animation.md`. Core đảm nhận audio/cache/timeline/captions/render; component tùy chỉnh đảm nhận hình ảnh theo frame.
- Chạy check trước cloud, kiểm tra giọng/ngôn ngữ, rồi render và kiểm tra ảnh/video. Không coi HTTP thành công hoặc test qua là đã duyệt chất lượng mỹ thuật/phát âm.
- Mọi mẫu, bao gồm slide, nhân vật Mai và Orbit, là ví dụ có thể tái sử dụng hoặc thay thế. Giữ kiểm tra dữ liệu và lỗi; thêm code/asset khi cần năng lực mới thay vì khai báo một tính năng chưa được dựng.
- Khi thay đổi nền hoặc quy trình, cập nhật kết quả theo từng bước trong `docs/phase/`. Ghi rõ phần đã chạy thật và phần còn giới hạn.
