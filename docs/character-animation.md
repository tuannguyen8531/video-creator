# Hoạt hình nhân vật 2D

## Chạy mẫu

```bash
npm run setup:lipsync
npm run check -- --project projects/character-waving/input/project.json
npm run render -- --project projects/character-waving/input/project.json
```

Đây là ví dụ về rig, không phải mẫu mặc định hoặc phong cách bắt buộc. Studio là tùy chọn: `npm run dev -- --project projects/character-waving/input/project.json`. Có thể trộn cảnh nhân vật với slide và [component tự viết](custom-scenes.md), chọn giọng/ngôn ngữ theo từng đoạn. Mẫu có một nhân vật bước vào cảnh, vẫy tay, chỉ hộp, lại gần và cầm hộp, mang hộp đi và nói theo khẩu hình phân tích từ audio.

## Công cụ khẩu hình

Rhubarb 1.14.0 là executable native, chạy từ Node.js. Script cài đặt tải bản Linux x64 chính thức vào `.cache/tools/`, kiểm tra checksum nếu metadata release cung cấp digest. Cần `unzip` để giải nén; không cài thêm Python.

Windows/macOS hoặc kiến trúc khác: tải bản phù hợp từ [upstream](https://github.com/DanielSWolf/rhubarb-lip-sync/releases), giữ nguyên executable cùng thư mục resource, đặt biến `RHUBARB_BIN` trỏ đến executable. Chưa kiểm chứng các nền tảng này trong dự án.

Audio được đổi sang WAV PCM mono 16 kHz tạm thời cho phân tích, MP3 TTS gốc vẫn được giữ. Nhận dạng dùng `phonetic` dành cho ngôn ngữ không phải tiếng Anh. Các cue A–H/X được kiểm tra thứ tự/thời gian, cache theo bytes audio, phiên bản công cụ và cấu hình nhận dạng. Đây là khớp khẩu hình ước lượng từ âm thanh, không phải đảm bảo phiên âm tiếng Việt chính xác từng âm.

Nếu thiếu công cụ hoặc phân tích thất bại, cảnh nhân vật báo lỗi; không thay bằng chu kỳ mở miệng giả. Cảnh slide không gọi Rhubarb. Report có `lipSyncGenerated` và `lipSyncCacheHits`.

## Cảnh và nhân vật

Thêm cảnh có `layout: "character"`, `setting: "office"`. Các trường `title`, `eyebrow`, `narration` giống cảnh thông thường.

- `actors`: 1–3 nhân vật, mỗi nhân vật có `id`, `name`, `x`, `y`, `scale`, `shirtColor`, `hairColor`, `skinColor`. Hiện dùng cùng một thiết kế SVG có khớp; màu là biến thể, không phải các rig khác nhau.
- `props`: tối đa 12 vật thể, mỗi vật thể có `id`, `kind` (`parcel`, `plant`, `lamp`), `x`, `y`, `scale`.
- Tọa độ theo canvas 1920 × 1080. `(x,y)` nhân vật là vị trí chân; `(x,y)` vật thể là điểm gốc ở đáy.
- Với rig scale 1, nhân vật cao khoảng 460 pixel. Mẫu đặt chân ở y=790, hộp trên bàn ở y=655.
- Mỗi đoạn đọc có thể chỉ định `speakerId`; khi bỏ trống, nhân vật đầu tiên là người nói. Nhân vật khác giữ miệng nghỉ.

Tay/chân dùng hai khớp và đích điều khiển; đầu, mắt, lông mày và miệng là các bộ phận riêng. Hiện có nhịp bước, vung tay, chớp mắt, thở nhẹ, ánh mắt hướng tới vật thể và các dáng bàn tay khác nhau. Render xác định trạng thái trực tiếp từ frame, không cần phát từ đầu cảnh.

## Hành động

Mỗi action có `actorId`, `segmentId`, `kind`, `from`, `to`. `from`/`to` là tỷ lệ 0–1 trong khoảng audio của đoạn tham chiếu, mặc định 0 và 1; `to` phải lớn hơn `from`. Khi audio đổi độ dài, cửa sổ hành động đổi theo.

| Kind | Tham số thêm | Hành vi |
|---|---|---|
| `walk` | `toX` | Đi từ vị trí trước đó đến x mới; tay/chân bước theo quãng đường |
| `wave` | Không | Tay trái nâng lên, mở bàn tay và vẫy rồi về tư thế nghỉ |
| `point` | `propId` | Tay phải đưa về vật thể, duỗi ngón trỏ và nhìn theo rồi về nghỉ |
| `pick-up` | `propId` | Tay phải chạm hộp, nâng lên và giữ khi di chuyển |
| `expression` | `emotion` | Đổi biểu cảm sang `neutral`, `happy`, `curious`, `surprised`; giữ đến lần đổi tiếp theo |

Ví dụ:

```json
{
  "actorId": "mai",
  "segmentId": "greeting",
  "kind": "walk",
  "toX": 800,
  "from": 0,
  "to": 0.55
}
```

Các bước đi không chồng nhau trên cùng nhân vật; mỗi tay có kênh hành động riêng. Có thể vẫy tay trái khi tay phải cầm hộp. Chỉ hộp bằng tay phải phải diễn ra trước lúc cầm; chưa có hành động thả/chuyền. Mỗi hộp chỉ được cầm một lần, một người cầm một hộp. Bước chuẩn bị kiểm tra tầm với tại lúc chạm, yêu cầu đưa nhân vật lại gần thay vì kéo dài tay.

Không có mô phỏng va chạm, trọng lực hoặc rơi đồ. Vật thể được gắn theo tọa độ tay khi mang; đặt cảnh và đường đi cần kiểm tra bằng hình ảnh để tránh xuyên đồ hoặc che nhân vật.

## Tạo chuyển động mới

1. Viết storyboard bằng hành động nhân vật trước, chia thành các đoạn lời đọc phù hợp.
2. Đặt nhân vật/vật thể và thêm action dựa theo segment; dùng ví dụ hiện có để tham chiếu vị trí/tầm với.
3. Chạy check, prepare, xem report/cache và render.
4. Xem các thời điểm bắt đầu/giữa/kết thúc mỗi hành động, kiểm tra bàn tay, chân, hộp và khẩu hình. Một ảnh đại diện đầu cảnh không đủ đánh giá cả hoạt cảnh.
5. Khi thêm action/rig mới, sửa schema ở `src/project.ts`, tính pose ở `src/animation/motion.ts` và vẽ bộ phận trong `src/video/CharacterStage.tsx`. Không gắn thêm tên action nếu chưa có chuyển động tương ứng.

Thiết kế nhân vật và diễn xuất hiện là mẫu đầu để duyệt. Nếu cần quay nghiêng, thay trang phục, diễn xuất nhiều góc hoặc phong cách vẽ khác, cần thêm artwork/rig và bộ chuyển động phù hợp; đổi hiệu ứng toàn khung không giải quyết phần này.
