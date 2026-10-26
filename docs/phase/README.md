# Tiến độ triển khai

Các file ghi kết quả theo bước; cập nhật trạng thái ngay khi có bằng chứng mới, không đánh đồng code đã viết với chức năng đã kiểm chứng.

| Bước | Ghi chép |
|---|---|
| 01 — npm, TypeScript, Chrome và dependency | [01-environment.md](01-environment.md) |
| 02 — CapCut TTS một đoạn và kiểm chứng cloud | [02-capcut-tts.md](02-capcut-tts.md) |
| 03 — Schema, audio, cache và timeline | [03-project-and-preparation.md](03-project-and-preparation.md) |
| 04 — Sáu cảnh, hoạt ảnh, phụ đề và MP4 | [04-scenes-and-captions.md](04-scenes-and-captions.md) |
| 05 — CLI và hướng dẫn agent | [05-agent-cli.md](05-agent-cli.md) |
| 06 — Nghiệm thu, số đo và giới hạn | [06-verification.md](06-verification.md) |
| 07 — Sửa xung đột Zod sau phản hồi sử dụng | [07-zod-compatibility.md](07-zod-compatibility.md) |
| 08 — Props và lưu mặc định trong Studio | [08-studio-props.md](08-studio-props.md) |
| 09 — Hoạt hình nhân vật 2D theo định hướng mới | [09-character-animation.md](09-character-animation.md) |
| 10 — Video nhân vật, khẩu hình, cache và kiểm chứng | [10-character-verification.md](10-character-verification.md) |
| 11 — Tự chọn hình thức, giọng/ngôn ngữ và cảnh React riêng | [11-flexible-authoring.md](11-flexible-authoring.md) |
| 12 — Input/output riêng từng dự án, chuyển dữ liệu và kiểm chứng | [12-project-folders.md](12-project-folders.md) |
| 13 — Bỏ qua toàn bộ projects trong Git theo phản hồi | [13-project-git-ignore.md](13-project-git-ignore.md) |

Phạm vi bản đầu tương ứng giai đoạn 1–4 trong [kế hoạch](../implementation-plan.md). Giai đoạn 5 là nâng cấp theo nhu cầu và chưa thuộc nghiệm thu bản đầu.

Bản đầu đã render video mẫu 53 giây bằng CapCut thật; TypeScript và 11 test qua. Mọi chi tiết artifact, số đo, bằng chứng và phần chưa kiểm chứng được ghi ở bước 06.

Cấu hình dependency hiện tại được cập nhật ở bước 07; kết quả audit/override trong các bước cũ là lịch sử tại thời điểm kiểm chứng.

Sau khi duyệt mẫu slide, người dùng đã yêu cầu mẫu nhân vật 2D có diễn xuất. Mẫu khoảng 21 giây đã xuất với CapCut và khẩu hình Rhubarb thật, 18 test qua tại thời điểm đó; dữ liệu và giới hạn ở bước 09–10.

Yêu cầu hiện tại ở bước 11: agent chọn hình thức theo từng brief; không có ví dụ/giọng mặc định. CLI dùng dự án được chọn, hỗ trợ phối hợp cảnh và module React riêng. Ghi chép các bước trước là lịch sử, không thay thế chính sách tác nghiệp hiện tại.

Cấu trúc hiện tại theo bước 12: `projects/<name>/input`, `output`, `.work`. Đầu ra và source cũ đã được chuyển theo dự án; dùng output/latest.json để tìm bản hoàn chỉnh gần nhất. Các đường dẫn out/examples/public/generated trong bước trước là lịch sử, xem [quy ước hiện tại](../project-layout.md).
