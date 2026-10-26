# Bước 06 — Nghiệm thu kỹ thuật bản đầu

Ngày: 2026-10-26. Trạng thái: hoàn thành phạm vi kỹ thuật giai đoạn 1–4; chất lượng giọng/nội dung cần được người dùng duyệt.

## Artifact

- Video mẫu sau cài đặt sạch: `out/intro-1793001914515-e5e49a75/video.mp4`.
- SRT, props và báo cáo: cùng thư mục, lần lượt `captions.srt`, `prepared.json`, `report.json`.
- Sáu ảnh đại diện: `scene-opening.png`, `scene-workflow.png`, `scene-features.png`, `scene-numbers.png`, `scene-comparison.png`, `scene-closing.png`.
- Dự án nguồn: `examples/intro/project.json`, tài nguyên minh họa `workflow.svg`.
- Artifact sinh, cache và node_modules được gitignore; font gốc và giấy phép được giữ trong repository.

## Kết quả

| Hạng mục | Kết quả |
|---|---|
| Cài đặt sạch | `npm ci` thành công, không gọi TTS |
| Dependency audit khi cài đặt | 0 vulnerabilities với override Zod 4.6.7 |
| TypeScript | `npm run typecheck` thành công |
| Kiểm thử | 11 test qua, gồm cả kiểm tra với MP3 thật và HTTP giả lập |
| Cloud TTS | Một câu probe và 11 đoạn mẫu tạo bằng CapCut thật |
| Cache thực tế | 11 cache hit, 0 đoạn mới, 0 request TTS trong lượt cuối |
| Render | MP4 H.264/AAC, 1920 × 1080, 30 fps, timeline 1590 frame / 53 giây |
| Kiểm tra media | ffprobe xác nhận stream; FFmpeg decode toàn bộ video cuối không báo lỗi |
| Kiểm tra hình | Đã xem sáu ảnh ở lượt render đầu, không tràn nội dung mẫu hoặc che chữ bằng phụ đề |
| Studio | Build thành công; HTTP 200; HTML chứa props intro và timeline 1590 frame |

Các test xác nhận: schema/ID lỗi, kế thừa giọng dự án, frame rounding/SRT, giới hạn phụ đề, cache key, XML/chữ ký header đối chiếu Python, query retry không tạo lại task, lỗi create/task/payload, deadline/cancel, cache hit/đổi text/đổi thứ tự/cache hỏng và lỗi không sinh placeholder.

## Số đo trên máy hiện tại

Lượt cloud đầu tiên: chuẩn bị 36,101 giây, 11 audio mới, 54 HTTP request tính cả create/query/download. Render và xuất ảnh mất 63,069 giây.

Lượt sau `npm ci`, concurrency render 2:

- Chuẩn bị từ cache: 0,412 giây.
- Bundle/render/xuất ảnh: 76,008 giây.
- Tổng wall time theo GNU time: 76,94 giây.
- Maximum RSS theo GNU time: 1.335.132 KiB, xấp xỉ 1,27 GiB. Đây là chỉ số RSS mà công cụ báo, không phải phép đo tổng RAM đồng thời của toàn bộ process tree.
- Exit status 0; không swap theo số liệu GNU time.

Bằng chứng thô ở `out/render-benchmark.txt`. Lượt này bao gồm tải lại Chrome khoảng 99 MB sau `npm ci`, và Studio đang chạy cùng lúc; không dùng số này như benchmark thuần renderer hay cam kết hiệu năng máy khác.

## Giới hạn còn lại

- Chưa nghe và duyệt phát âm, ngữ điệu, độ tự nhiên của từng đoạn bằng người dùng. Audio có stream và decode thành công không xác nhận chất lượng ngôn ngữ.
- Chưa kiểm chứng mọi thao tác tương tác/phát audio trong Studio; build và HTTP/props đã được kiểm chứng.
- Đã thử chụp Studio bằng Chrome CLI, nhưng lệnh vượt giới hạn 20 giây nên đã dừng; không có ảnh Studio để làm bằng chứng kiểm tra UI. Ảnh sáu cảnh từ renderer đã kiểm tra thành công là bằng chứng riêng.
- Remotion CLI cảnh báo Zod vì phiên bản khuyến nghị 4.5.4 khác bản vá 4.6.7. Giữ override đã kiểm chứng, không hạ phiên bản để che cảnh báo.
- Chưa có phụ đề từng từ, batch TTS, nhạc nền, nhiều tỷ lệ khung hình hoặc UI kéo thả. Giai đoạn 5 vẫn là phạm vi tùy nhu cầu, không được đánh dấu đã triển khai.
- Kiểm tra bố cục mới vẫn cần ảnh/preview; schema giới hạn dữ liệu không thay thế kiểm tra thị giác.

## Sử dụng tiếp

```bash
npm run dev -- --project examples/intro/project.json
npm run render -- --project examples/intro/project.json
```

Tạo nội dung mới theo [hướng dẫn agent](../agent-guide.md). Giữ `public/generated/<run-id>/` tương ứng khi muốn dùng lại props đã chuẩn bị.
