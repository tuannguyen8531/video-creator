# Hướng dẫn tạo video cho AI agent

## Quy trình

Chọn cách kể theo yêu cầu người dùng. Có thể dùng thuyết trình, nhân vật 2D, motion graphics hoặc phối hợp; các ví dụ không quyết định phong cách cho dự án mới. Xem [cảnh tùy chỉnh](custom-scenes.md) để viết hình ảnh/chuyển động riêng, [nhân vật](character-animation.md) để dùng rig mẫu.

1. Từ yêu cầu/ngữ cảnh, chọn phong cách theo từng cảnh, ngôn ngữ, giọng, nhân vật/tài nguyên và nhịp kể. Không mặc định thuyết trình, nhân vật Mai hoặc tiếng Việt.
2. Tạo `projects/<ten-video>/input/`, viết `project.json` và đặt brief, component, tài nguyên bên trong. Nền tạo output riêng; tham khảo dự án mẫu khi phù hợp, không ghi đè input/output của dự án khác.
3. Viết storyboard; chia lời đọc thành câu/ý hoàn chỉnh. Cảnh không lời đọc dùng `duration`. Trộn layout tùy ý và viết TSX riêng khi layout có sẵn không diễn đạt được ý tưởng.
4. Chạy `npm run check -- --project <file>` trước khi gọi cloud.
5. Chạy `npm run prepare -- --project <file>`, đọc report và xử lý mọi lỗi.
6. Chạy `npm run dev -- --project <file>` để xem trước, hoặc `npm run render -- --project <file>` để xuất MP4 và ảnh từng cảnh.
7. Kiểm tra ảnh, SRT, report, video và audio. Khi sửa lời đọc, chạy lại prepare/render; cache tái sử dụng phần không đổi.

Chạy các lệnh từ thư mục gốc repository. Đường dẫn `image` và `audio` trong JSON tính từ thư mục chứa JSON. Tài nguyên được sao chép sang thư mục sinh riêng; không chỉnh `prepared.json` bằng tay.

Truyền `--project <ten-video>`, thư mục dự án hoặc JSON trong input; CLI không tự chọn ví dụ. Với ngôn ngữ mới, lọc catalog bằng `npm run --silent voices -- --language <tag> --json`. Voice/language có thể ghi đè theo từng đoạn, kể cả khi các đoạn đó ở cùng một cảnh. Xem [quy ước thư mục](project-layout.md).

## Dự án tối thiểu

```json
{
  "id": "product-intro",
  "title": "Sản phẩm của tôi",
  "language": "vi-VN",
  "voice": "capcut:BV421_vivn_streaming",
  "scenes": [
    {
      "id": "opening",
      "layout": "title",
      "title": "Một cách làm việc mới",
      "subtitle": "Giới thiệu lợi ích chính của sản phẩm.",
      "effect": "spring",
      "narration": [
        {"id": "intro", "text": "Xin chào. Hôm nay chúng ta cùng khám phá một cách làm việc mới."}
      ]
    }
  ]
}
```

## Các trường dùng chung

| Trường | Quy tắc |
|---|---|
| `id` | 1–64 ký tự chữ Latin, số, `_`, `-`; ID cảnh không trùng trong dự án, ID đoạn không trùng trong cảnh |
| `title` của dự án | Tối đa 120 ký tự, hiển thị ở header |
| `width`, `height`, `fps` | width/height là số chẵn 240–3840; mặc định 1920 × 1080; fps = 30 |
| `voice` | Không có mặc định; chọn từ `npm run voices`, hoặc chỉ định từng đoạn / dùng audio cục bộ |
| `language` | Tag như `vi-VN`, `en-US`; đoạn có thể ghi đè. Nếu bỏ, lấy ngôn ngữ catalog của giọng đã chọn |
| `font` | Font TTF/OTF/WOFF/WOFF2 cục bộ, đường dẫn tính từ JSON; dùng font có đủ glyph cho ngôn ngữ cần hiển thị |
| `speed` | 0.5–2.0, mặc định 1.0; gửi lên CapCut với hai chữ số thập phân |
| `theme` | `background`, `accent`, `foreground` dạng `#RRGGBB` |
| `scenes` | 1–100 cảnh |

Mọi cảnh có `id`, `layout`, `title` tối đa 90 ký tự, `narration` tối đa 30 đoạn. Không có lời đọc thì phải có `duration` (giây), không cần voice/language. Với cảnh có audio, `duration` là thời lượng tối thiểu để giữ hình, không cắt lời đọc. `eyebrow` là nhãn ngắn tối đa 40 ký tự. `effect` nhận `fade`, `slide`, `zoom`, `spring` cho bộ slide.

## Sáu loại cảnh

Đây là các layout tiện dụng, không phải danh sách phong cách đóng. Có thêm `character` và `custom`; ví dụ `projects/flexible/input/project.json` phối hợp cả ba cách dựng trong cùng video.

| `layout` | Trường bổ sung |
|---|---|
| `title` | `subtitle` tùy chọn, tối đa 180 ký tự |
| `image-and-text` | `image` là ảnh cục bộ, `body` tối đa 320 ký tự |
| `bullets` | `bullets`: 1–5 ý, mỗi ý tối đa 100 ký tự; nên ngắn trong một dòng |
| `stat` | `value` là số hữu hạn từ -1e9 đến 1e9, `suffix` tối đa 16 ký tự, `label` tối đa 120 ký tự; số đếm hiển thị làm tròn số nguyên |
| `comparison` | `left` và `right`, mỗi bên có `title` tối đa 40 ký tự, `items` gồm 1–4 ý, mỗi ý tối đa 80 ký tự |
| `outro` | `subtitle` tùy chọn và `cta` tối đa 80 ký tự |

Schema từ chối trường lạ. Giới hạn ký tự không bảo đảm mọi tổ hợp nội dung sẽ đẹp: tránh tiêu đề dài kèm nhiều dòng bullet; xem ảnh/preview trước khi công nhận video.

CLI giới hạn toàn bộ JSON dự án ở 1 MiB trước khi parse. Giữ hình/audio trong file riêng, không nhúng base64 vào JSON.

## Lời đọc và audio

Một đoạn có `id`, `text` (tối đa 240 ký tự), tùy chọn `voice`, `language`, `speed`, `pauseAfter` (0–5 giây, mặc định 0.25). Không có voice mặc định: đoạn dùng TTS phải chọn giọng trực tiếp hoặc kế thừa giọng dự án. Chọn ngôn ngữ khác thì chọn giọng phù hợp; nền báo lỗi khi metadata catalog không khớp, không tự dịch hoặc đổi giọng thay người dùng.

Ngôn ngữ thực được gửi qua SSML/header và tham gia khóa cache. Tag ngôn ngữ không tự biến một giọng thành giọng đa ngôn ngữ hoặc thay vùng giọng. Catalog là dữ liệu cục bộ, không bảo đảm mọi giọng còn hoạt động; cần kiểm chứng giọng mới khi dùng thật. Font Noto Sans đi kèm hỗ trợ Latin/tiếng Việt; các hệ chữ khác cần font phù hợp qua `font` hoặc font do component tự khai báo.

Nếu muốn dùng lời đọc đã có, khai báo `audio` là đường dẫn MP3/WAV cục bộ. `text` phải khớp lời nói trong file. Đoạn đó không gọi CapCut; đây là nguồn audio do người dùng chọn, không phải fallback khi cloud lỗi. CLI kiểm tra audio có stream và thời lượng dương, tối đa 10 phút/đoạn.

Phụ đề tự tách theo câu và chia câu dài thành trang ngắn (32 ký tự khi khung dọc, 52 khi ngang/vuông), chỉ hiện một trang mỗi thời điểm. Mốc trong cùng đoạn audio được ước lượng theo độ dài chữ, không phải nhận dạng lời nói. Muốn khớp ranh giới câu chính xác, viết mỗi câu thành một narration riêng. Audio và action vẫn dùng cue đoạn gốc. Tên sản phẩm, số và chữ viết tắt cần được soạn theo cách đọc mong muốn; nền không có bộ chuẩn hóa phát âm riêng.

## Timeline và cache

- Mỗi cảnh có 0,5 giây đệm đầu và cuối. Độ dài audio làm tròn lên frame; khoảng nghỉ làm tròn về frame gần nhất.
- Chuyển cảnh fade nằm trong đệm, không chồng lấn lời đọc; nội dung xuất hiện theo frame trong cảnh.
- Cache theo nội dung/giọng/resource/ngôn ngữ/tốc độ/phiên bản giao thức, không theo vị trí cảnh. Đổi thứ tự hoặc chỉ sửa hình không tạo lại lời đọc. Giao thức v2 gửi language thực thay en-US cố định nên không dùng lại cache v1; cache cũ vẫn được giữ nguyên.
- Mỗi lượt chuẩn bị tạo `projects/<name>/.work/<run-id>/`, gồm public riêng; cache chung nằm ở `.cache/tts/`. Chỉ publish render hoàn chỉnh vào output/<run-id>, cập nhật output/latest.json; không ghi đè bản trước.
- TTS chạy tuần tự ở bản đầu. `--concurrency 2` điều khiển worker render, không phải request TTS.
- Không sửa file cache trực tiếp. Muốn làm mới một đoạn với cùng đầu vào, xác định hash bằng `cacheKey` trong `src/prepare.ts`, xóa đúng cặp MP3/JSON rồi chạy lại. Không xóa toàn bộ cache trừ khi chủ động muốn tổng hợp lại tất cả.

## Đọc kết quả

`report.json` lưu trạng thái lượt chạy, từng đoạn, cache hit, số audio mới/cục bộ, số HTTP request TTS (bao gồm polling/download), thời gian chuẩn bị và thời gian render khi thành công.

Trạng thái `rendered` xác nhận pipeline đã hoàn tất; không thay thế việc duyệt nội dung và nghe giọng. Nếu trạng thái là `failed` hoặc `render-failed`, đọc lỗi, sửa nguyên nhân và chạy lại. Không dùng đầu ra chưa hoàn thành như video hoàn chỉnh.

SRT và phụ đề trong video dùng cùng cue. `prepared.json` là props cho Remotion và chứa đường dẫn tài nguyên của lượt chạy; cần giữ thư mục generated tương ứng nếu muốn mở lại.

`dev` mở snapshot Studio tại `.work/<run-id>/StudioRoot.tsx` của dự án, với default props chỉnh sửa/lưu được. Save không ghi vào input/project.json, audio hay SRT. CLI render và lần dev mới chuẩn bị lại từ input. Muốn tiếp tục snapshot, chạy Remotion với `.work/<run-id>/studio-entry.tsx` và `--public-dir` trỏ tới `.work/<run-id>/public`; xem project-layout.md. Đổi lời đọc cần sửa input rồi chuẩn bị lại. Chỉ CLI render mới publish và cập nhật output/latest.json; render thủ công từ Studio cần chọn đích xuất rõ ràng.

## Thêm cảnh bằng code

Ưu tiên `layout: "custom"` với component TSX và `props` riêng: không cần sửa union hay renderer lõi cho mỗi ý tưởng mới. Xem [hợp đồng component](custom-scenes.md). Các bước dưới đây dùng khi muốn bổ sung một layout thư viện có schema chuyên biệt.

1. Bổ sung loại cảnh cùng các trường và giới hạn trong discriminated union ở `src/project.ts`.
2. Thêm nhánh dựng tương ứng trong `src/video/Presentation.tsx`, dùng theme và vùng nội dung hiện có.
3. Dùng `useCurrentFrame`, `interpolate`, `spring` và `Sequence`; không dùng thời gian hệ thống hoặc random không cố định cho hình ảnh.
4. Không gọi API trong component. Mọi tài nguyên cần sẵn trước render.
5. Chạy `npm run typecheck`, `npm test`, rồi render mẫu có cảnh mới và kiểm tra ảnh.

## Chẩn đoán

| Hiện tượng | Kiểm tra |
|---|---|
| `ffprobe`/`ffmpeg` không tìm thấy | Cài FFmpeg và bảo đảm cả hai executable nằm trên PATH |
| Không khởi động Chrome | `npm run browser`, kiểm tra thư viện Linux theo tài liệu Remotion |
| Giọng không hợp lệ | Catalog cục bộ, resource ID, lỗi CapCut; không tự đổi provider |
| Timeout | Mạng, trạng thái dịch vụ; create không tự retry vì có thể đã tạo task |
| Phụ đề quá dài | Tách `narration` thành các đoạn ngắn hơn |
| JSON thay đổi nhưng Studio vẫn cũ | Dừng rồi chạy lại `npm run dev -- --project ...` |
| Render tốn RAM | Thử `--concurrency 1`, giảm số lớp/hiệu ứng trong cảnh |
| Cảnh báo Zod từ Remotion | Bản hiện tại khóa 4.5.4, không override; chạy `npm ci` để đồng bộ lockfile. Advisory bộ nhớ vẫn còn, xem bước 07 trong docs/phase |

Chưa xây dựng batch TTS, timestamps từng từ, nhạc nền hay giao diện kéo thả. Đây là phần mở rộng sau khi có nhu cầu thực tế.

## Kích thước điện thoại

Đặt `"width": 1080, "height": 1920` ở cấp dự án trong input/project.json để xuất 9:16. Có thể dùng 1080 × 1350 (4:5), 1080 × 1080 (1:1), hoặc mặc định 1920 × 1080 (16:9).

Các cảnh mẫu giữ canvas 1920 × 1080 và thu vừa, căn giữa, có khoảng nền trống khi đổi tỷ lệ; không tự cắt hình hay tự dàn lại. Muốn video dọc tận dụng toàn khung, dùng custom component lấy width/height từ `useVideoConfig()` để bố trí theo khung thực. Phụ đề của nền được đặt theo khung xuất, độc lập với canvas cảnh mẫu. Chừa vùng đáy cho phụ đề khi thiết kế cảnh riêng.
