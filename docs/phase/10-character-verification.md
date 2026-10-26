# Bước 10 — Kiểm chứng hoạt hình nhân vật 2D

Ngày: 2026-10-26. Trạng thái: kiểm chứng kỹ thuật thành công; cần người dùng duyệt phong cách vẽ, nhịp diễn và độ khớp khẩu hình.

## Video mới

- Nguồn: `examples/character/project.json`.
- Đầu ra cuối: `out/character-story-1793003990983-d8435771/video.mp4`.
- Cùng thư mục: `prepared.json`, `captions.srt`, `report.json`, `scene-hello.png`.
- Ảnh kiểm tra trích từ MP4 cuối: `wave.png` ở 4,2 giây; `point.png` ở 7,3 giây; `carry.png` ở 17,6 giây.
- Lượt trước có thêm `pickup.png` ở `out/character-story-1793003801852-9f33f13e/`, đã dùng để kiểm tra lúc chạm và nâng hộp trước khi hoàn thiện bàn tay.

## Kết quả kỹ thuật

| Hạng mục | Bằng chứng |
|---|---|
| TTS thật | 4 đoạn CapCut, tổng 20 HTTP request trong lượt chuẩn bị đầu |
| Khẩu hình thật | Rhubarb 1.14.0 `phonetic`, 135 khoảng miệng từ audio: 38 + 31 + 30 + 36 |
| Dáng miệng | Có A–H/X trên toàn mẫu, có nghỉ; không tạo theo vòng lặp hình sin |
| Timeline | 631 frame / 21,0333 giây |
| Media | ffprobe: H.264, AAC, 1920 × 1080, 30 fps, container 21,035 giây |
| File | 2.773.513 byte |
| Decode | FFmpeg decode toàn bộ MP4 cuối không báo lỗi |
| Lượt tạo đầu | 17,410 giây gồm TTS và phân tích khẩu hình |
| Lượt xuất cuối | Chuẩn bị 0,176 giây, bundle/render/ảnh 23,696 giây, concurrency 2 |
| Cache lượt cuối | 4 audio cache hit + 4 lip-sync cache hit; 0 request TTS, 0 lần phân tích lại |
| TypeScript | `npm run typecheck` qua |
| Test | `npm test`: 18/18 qua |

## Kiểm tra hình và chuyển động

- Đã xem các ảnh wave/point/pickup/carry ở lượt đầu; sau chỉnh tay/chân đã xem lại wave/point/carry trích từ MP4 cuối.
- Vẫy dùng bàn tay mở; chỉ dùng ngón trỏ và ánh mắt hướng về vật thể. Dáng miệng giữa các thời điểm khác nhau.
- Hộp rời bàn và đi theo tay khi nhân vật mang đi; test xác nhận tọa độ điểm cầm trùng đích tay trong đoạn mang.
- Test IK xác nhận độ dài hai đoạn tay cho đích trong tầm với; bước chuẩn bị từ chối pickup quá xa thay vì nối tay dài ra.
- Trong mẫu đầu, kiểm tra mọi frame cho khoảng cách vai–bàn tay lớn nhất khoảng 146,93 đơn vị, nhỏ hơn độ dài hai đoạn tay 164. Các chỉnh sửa sau chỉ đổi hình bàn tay/chân và ánh mắt, không thay quỹ đạo đích tay đó.
- Motion được tính trực tiếp từ frame; test gọi lại cùng frame cho cùng dữ liệu và xác nhận thời gian hành động thay đổi theo độ dài cue audio.
- Nền và phụ đề không che mặt hoặc bàn tay ở các ảnh đã kiểm tra. Ảnh tĩnh không thay thế việc xem liên tục và nghe duyệt video.

## Các test mới

Ngoài hồi quy TTS/cache/Studio/JSON/timeline/SRT:

- ID actor/prop/segment, người nói, cửa sổ thời gian và action tham chiếu sai bị từ chối.
- Hành động chồng kênh và chỉ đồ khi tay phải đang cầm hộp bị từ chối.
- Hai khớp IK, tra cue miệng, cue lỗi/chồng nhau, miệng nghỉ ngoài lời nói.
- Chuyển động random access, nội suy theo audio, hộp theo tay và tầm với.
- Lifecycle npm install/ci bỏ qua prepare; npm run prepare thực sự xử lý dự án trên npm 11.

## Phần chưa kết luận

- Chưa có đánh giá bằng người dùng về mức tự nhiên của bước đi, cử chỉ, cảm xúc và khẩu hình tiếng Việt. Dữ liệu Rhubarb là ước lượng, không phải chứng nhận chính xác từng âm vị.
- Rig mới là một thiết kế nhân vật và một nền phòng; hỗ trợ tối đa ba actor từ cùng rig chưa phải thư viện nhiều thiết kế nhân vật hoặc nhiều góc nhìn.
- Chưa có thả/chuyền đồ, vật lý/va chạm, quay nghiêng, thay trang phục hay diễn xuất tự do. Không gọi đây là hệ hoạt hình hoàn chỉnh.
- Cài đặt Rhubarb tự động mới được kiểm chứng trên Linux x64. Nền tảng khác cần executable phù hợp và `RHUBARB_BIN`.

## Lệnh sử dụng

```bash
npm run setup:lipsync
npm run check
npm run render
```

CLI mặc định dùng mẫu nhân vật. Có thể chạy bộ slide cũ bằng `--project examples/intro/project.json`. Muốn xem trước tương tác thì dùng `npm run dev`; không bắt buộc mở Studio để xuất video.
