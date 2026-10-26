# Kế hoạch xây dựng nền tạo video cho AI agent

Ngày lập: 2026-10-26. Trạng thái: bản đầu của giai đoạn 1–4 đã được triển khai và kiểm chứng kỹ thuật; chi tiết và giới hạn ở [docs/phase](phase/README.md). Giai đoạn 5 chưa triển khai.

Cấu trúc thư mục hiện tại: `projects/<name>/input/` giữ nguồn, `output/` giữ bản xuất thành công, `.work/` giữ dữ liệu dựng. Dữ liệu cũ đã chuyển và kiểm chứng ở [bước 12](phase/12-project-folders.md); thao tác theo [quy ước thư mục](project-layout.md).

## 1. Mục tiêu

Cập nhật yêu cầu hiện tại: nền là bộ công cụ mở cho agent. Theo yêu cầu từng video, agent quyết định dùng thuyết trình, nhân vật, motion graphics, cảnh tự viết hoặc phối hợp; đồng thời chọn giọng/ngôn ngữ. Các mẫu slide và nhân vật 2D là ví dụ đã kiểm chứng, không phải khuôn bắt buộc. Kết quả chuyển sang quy trình linh hoạt ở [bước 11](phase/11-flexible-authoring.md).

Xây dựng nền để AI agent tạo video thuyết trình, giới thiệu sản phẩm và giải thích nội dung bằng code. Video có bố cục nhất quán, hiệu ứng, hoạt ảnh, giọng đọc và phụ đề; có thể xem trước, chỉnh sửa rồi xuất MP4.

Agent quyết định kịch bản, cách chia cảnh, nội dung và cách trình bày. Nền cung cấp component dùng lại, công cụ TTS, timeline, phụ đề và công cụ render. Agent có thể viết thêm cảnh React khi bộ cảnh có sẵn chưa đáp ứng.

## 2. Các quyết định đã chốt

| Hạng mục | Lựa chọn |
|---|---|
| Quản lý package và lệnh chạy | npm, lưu `package-lock.json`, dùng `npm ci` để tái lập môi trường |
| Ngôn ngữ | TypeScript |
| Dựng cảnh và hoạt ảnh | React + Remotion |
| TTS đầu tiên | CapCut, tích hợp bằng TypeScript |
| Nơi chạy TTS | Node.js, trước bước render; không gọi TTS trong component React |
| Đầu vào chính | `project.json` cùng tài nguyên hình ảnh, video và âm thanh |
| Đầu ra ban đầu | MP4 1920 × 1080, 30 fps, audio và phụ đề chèn trực tiếp; kèm tệp SRT |
| Phụ đề ban đầu | Theo đoạn đọc ngắn; đồng bộ từng từ ở giai đoạn sau |
| Cách sử dụng đầu tiên | CLI cho agent và Remotion Studio để xem trước |

Không cần Python ở bản đầu. Chưa xây giao diện kéo thả, cơ sở dữ liệu, hàng đợi phân tán, remote TTS hay hệ plugin nhiều provider.

## 3. Giao thức TTS và kiểm chứng

Client CapCut TTS nằm trong `src/tts/capcut.ts`, cùng public key và catalog giọng cục bộ. Khả năng tương thích của giao thức phải được kiểm chứng bằng request thực, không suy ra chỉ từ test giả lập.

Những điểm phải kiểm chứng trước khi xây sâu:

- Request tạo task, polling và tải audio còn hoạt động với một giọng tiếng Việt.
- Cách tạo metadata, SSML và các trường kiểm tra request được dịch vụ chấp nhận.
- Danh mục giọng và resource ID được chọn còn được chấp nhận.
- Batch trả kết quả theo quy tắc nào; chưa mặc định rằng thứ tự luôn được bảo đảm.
- Client hiện tắt yêu cầu timestamps; chưa coi CapCut là nguồn timestamps dùng được.

## 4. Kiến trúc và luồng dữ liệu

```text
Agent → project.json + assets
                  ↓
          Kiểm tra đầu vào
                  ↓
      TTS: cache → CapCut → audio
                  ↓
      Đo audio → timeline + captions
                  ↓
        Dữ liệu dựng đã chuẩn bị
                  ↓
      React / Remotion: xem trước
                  ↓
         MP4 + SRT + báo cáo
```

Tách đầu vào do agent viết khỏi dữ liệu được sinh tự động. `project.json` lưu ý định dựng; dữ liệu đã chuẩn bị lưu đường dẫn audio, thời lượng thực tế, mốc cảnh và phụ đề. Render chỉ đọc các tài nguyên đã chuẩn bị, không phụ thuộc việc TTS trả kết quả trong lúc dựng frame.

### Đầu vào video

Định dạng đầu tiên cần có:

- Thông tin dự án, theme, kích thước và fps trong phạm vi hỗ trợ.
- Giọng đọc và thiết lập TTS dùng chung, có thể ghi đè theo đoạn khi cần.
- Danh sách cảnh với ID ổn định, loại bố cục và nội dung riêng của bố cục.
- Danh sách đoạn đọc có ID ổn định; mỗi đoạn là một đơn vị audio và phụ đề.
- Đường dẫn tài nguyên cục bộ, khoảng nghỉ và lựa chọn hiệu ứng trong bộ hỗ trợ.

Tiêu đề, bullet trên slide và lời đọc là các trường riêng. Phụ đề mặc định lấy từ văn bản đọc để tránh hiển thị khác lời nói; nếu cho phép ghi đè phải quy định ánh xạ rõ ràng.

Dùng TypeScript để biểu diễn các loại cảnh và kiểm tra dữ liệu JSON ở thời điểm chạy. Báo lỗi kèm ID cảnh/đoạn và trường sai; kiểm tra tài nguyên tồn tại, tham số số hợp lệ và loại cảnh được hỗ trợ trước khi gọi TTS.

### Cấu trúc thư mục dự kiến

```text
docs/                    Kế hoạch và hướng dẫn cho agent
src/
  project.ts             Kiểu dữ liệu và kiểm tra đầu vào
  tts/                   Client CapCut, catalog và cache
  prepare.ts             Chuẩn bị audio, timeline và phụ đề
  video/                 Composition, cảnh, theme và hoạt ảnh
scripts/                 Điểm vào CLI
projects/<name>/input/   JSON, component, brief và tài nguyên nguồn
projects/<name>/output/  Video, SRT, report, previews; latest.json
projects/<name>/.work/   Props, Studio và public riêng của từng lượt dựng
.cache/tts/              Cache audio theo nội dung
```

Đây là cấu trúc định hướng, không tạo sẵn module chưa dùng. Cache, tài nguyên sinh và đầu ra không đưa vào Git. Tài nguyên gốc giữ riêng, tránh bị bước chuẩn bị ghi đè.

## 5. Thiết kế TTS CapCut

### Phần giữ lại

- Đọc catalog, ánh xạ `voice_id` và `resource_id`.
- Tạo metadata thiết bị, escape XML, đóng gói SSML và các trường kiểm tra request.
- Gửi task, polling đến thành công/thất bại, tải audio.
- Cache audio; tái tạo riêng đoạn đổi nội dung hoặc thiết lập.

Đặt chi tiết giao thức trong module CapCut. Phần chuẩn bị video chỉ cần biết đầu vào văn bản/giọng và kết quả audio, thời lượng, trạng thái cùng timestamps nếu có. Chưa cần registry hoặc hệ adapter tổng quát cho nhiều provider.

### Quy tắc xử lý audio và lỗi

- Giữ MP3 gốc nếu đáp ứng luồng dựng; không mặc định chuyển WAV mono 16 kHz.
- Đo thời lượng từ audio, rồi điều chỉnh thời lượng cảnh theo lời đọc.
- Không tự cắt lời hoặc tăng tốc để ép vào thời lượng dự đoán của cảnh.
- Không thay lỗi bằng im lặng rồi đánh dấu thành công. Đoạn lỗi có trạng thái và nguyên nhân riêng; chặn xuất video hoàn chỉnh khi thiếu lời đọc bắt buộc.
- Cache theo hash của văn bản thực sự gửi, giọng, resource ID, tốc độ và các thiết lập ảnh hưởng kết quả, kèm phiên bản chuẩn bị request. File đặt theo hash để tránh ghi đè theo chỉ số đoạn.
- Ghi file tạm rồi đổi tên; chỉ công nhận cache sau khi audio đọc được và có thời lượng dương. File hỏng hoặc thiếu được tạo lại.
- Có timeout từng request và ngân sách tổng cho một lần tổng hợp. Hủy bằng `AbortSignal` cho HTTP và dừng polling; không coi đây là hủy task trên máy chủ.
- Retry lỗi tạm thời có giới hạn và backoff; tránh tạo lại task khi đã có task đang xử lý. Không tự đổi sang giọng/provider khác.
- Bắt đầu với tổng hợp từng đoạn và số tác vụ đồng thời nhỏ. Chỉ thêm batch sau khi kiểm chứng giao thức và đo thấy cần.

Lưu audio cùng metadata đủ để truy lại lỗi và tái sử dụng. Không ghi token hoặc URL tải có thông tin nhạy cảm vào log thông thường. Giữ nguyên file gốc trước các bước chỉnh âm lượng hay tốc độ.

## 6. Timeline, phụ đề và hoạt ảnh

### Timeline

- Audio là căn cứ tính thời lượng; cảnh dài bằng tổng đoạn đọc, khoảng nghỉ và khoảng đệm cần thiết cho hoạt ảnh.
- Tính mốc bằng frame nguyên ở fps của dự án; quy định thống nhất cách làm tròn để tránh lệch tích lũy.
- Quy định rõ phần chồng lấn của chuyển cảnh và không để lời đọc hai cảnh vô tình chồng nhau.
- Lưu timeline sau chuẩn bị để preview và render dùng cùng dữ liệu.

### Phụ đề

Bản đầu hiển thị theo đoạn đọc ngắn dựa trên khoảng audio của đoạn đó. Đây là đồng bộ theo đoạn, không phải timestamps từng từ; khoảng lặng bên trong audio vẫn nằm trong khoảng phụ đề. Kiểm tra độ dài và chia dòng để tránh tràn vùng hiển thị.

Sinh SRT và phụ đề chèn vào video từ cùng một tập cue. Dành vùng phụ đề riêng trong bố cục để không che nội dung chính.

Khi cần tô sáng từng từ, thử nghiệm khả năng trả timestamps của CapCut bằng lời gọi thật. Nếu không đáp ứng, bổ sung forced alignment giữa văn bản đã biết và audio. Không chia đều thời gian theo số từ. Khi thay đổi tốc độ audio phải cập nhật mốc thời gian tương ứng.

### Bộ cảnh và hiệu ứng đầu tiên

- Tiêu đề mở đầu.
- Chữ kèm hình ảnh.
- Danh sách ý xuất hiện lần lượt.
- Số liệu nổi bật có số đếm.
- So sánh hai cột.
- Kết thúc với lời kêu gọi hành động.

Theme dùng chung cho font hỗ trợ tiếng Việt, màu, khoảng cách và vùng an toàn. Hiệu ứng đầu tiên gồm fade, slide, zoom nhẹ, spring và xuất hiện theo thứ tự. Hoạt ảnh tính theo frame Remotion, không dựa vào đồng hồ thực hay dữ liệu ngẫu nhiên không cố định.

Agent có thể thêm component và đăng ký loại cảnh mới bằng thay đổi code. `project.json` không chứa JavaScript tùy ý hoặc mã thực thi.

## 7. Các giai đoạn triển khai

### Giai đoạn 1 — Kiểm chứng TTS và môi trường render

1. Khởi tạo npm + TypeScript + React + Remotion; khóa các package Remotion ở phiên bản tương thích.
2. Chuẩn bị Chrome và kiểm tra thư viện hệ thống cần cho Linux.
3. Triển khai client CapCut một đoạn và catalog giọng tối thiểu bằng TypeScript.
4. Tạo thử một câu tiếng Việt, tải audio, đo thời lượng và thử trường hợp lỗi.
5. Render một cảnh có chữ tiếng Việt cùng audio đó thành MP4.

**Hoàn thành khi:** có một MP4 phát được hình/tiếng, ghi lại môi trường và kết quả gọi CapCut thật. Nếu TTS không hoạt động, ghi rõ lỗi và tách việc sửa tích hợp; vẫn có thể kiểm chứng Remotion bằng audio mẫu, nhưng không đánh dấu TTS đã hoàn thành.

### Giai đoạn 2 — Đầu vào và luồng chuẩn bị

1. Chốt schema `project.json` và tạo dự án mẫu.
2. Thêm cache theo nội dung, lỗi theo đoạn, timeout và retry giới hạn.
3. Chuẩn bị nhiều đoạn với mức song song có giới hạn.
4. Sinh dữ liệu timeline và tài nguyên để preview/render truy cập.

**Hoàn thành khi:** chạy lại không gọi TTS cho đoạn đã cache; sửa một đoạn chỉ tạo lại đoạn đó; thiếu audio bắt buộc làm bước chuẩn bị báo lỗi rõ ràng.

### Giai đoạn 3 — Cảnh, hoạt ảnh và phụ đề

1. Xây bộ cảnh và theme ban đầu.
2. Ghép audio theo timeline, thêm hiệu ứng và chuyển cảnh.
3. Tạo phụ đề theo đoạn, kiểm tra tràn chữ và xuất SRT.
4. Xem trước bằng Remotion Studio với cùng dữ liệu dùng để render.

**Hoàn thành khi:** video mẫu khoảng một phút có nhiều loại cảnh, hoạt ảnh, lời đọc tiếng Việt và phụ đề; nội dung không tràn, chuyển cảnh không cắt lời, preview khớp bản xuất.

### Giai đoạn 4 — Hoàn thiện công cụ cho agent

1. Gom lệnh kiểm tra, TTS, chuẩn bị, preview và render qua npm scripts.
2. Thêm báo cáo kết quả chứa đường dẫn đầu ra, thời lượng, cache hit và lỗi theo đoạn.
3. Viết hướng dẫn cách tạo dự án, chọn cảnh, thêm tài nguyên và bổ sung component.
4. Kiểm chứng quy trình từ một yêu cầu nội dung đến MP4 bằng agent.

**Hoàn thành khi:** agent có thể dựa vào tài liệu và ví dụ để tạo video mới, sửa một cảnh rồi xuất lại mà không sửa lõi nền.

### Giai đoạn 5 — Nâng cấp theo nhu cầu thực tế

Ưu tiên sau khi bản đầu hoạt động: phụ đề từng từ, batch TTS, nhạc nền và giảm nhạc khi có lời đọc, biểu đồ nâng cao, thêm tỷ lệ khung hình. Chỉ thêm khi có video thực tế cần; chưa cam kết triển khai trong phạm vi bản đầu.

## 8. Giao diện dòng lệnh dự kiến

Các lệnh dưới đây đã được triển khai cho bản đầu:

```bash
npm ci
npm run check -- --project intro
npm run voice -- --project intro
npm run prepare -- --project intro
npm run dev -- --project intro
npm run render -- --project intro
```

`voice` chuẩn bị/cache audio. `prepare` kiểm tra dự án, bảo đảm audio có sẵn và tạo timeline/captions. `render` gọi bước chuẩn bị trước khi xuất, dùng cache để tránh tổng hợp lại. `dev` mở Studio với dự án đã chuẩn bị; cách chọn dự án phải được ghi rõ trong hướng dẫn triển khai.

## 9. Kiểm chứng và tiêu chí nghiệm thu bản đầu

- Kiểm tra kiểu TypeScript và dữ liệu đầu vào.
- Một nhóm kiểm tra nhỏ cho lỗi giao thức TTS, timeout và cache không nhận file lỗi; dùng dữ liệu giả lập, tách khỏi kiểm chứng dịch vụ thật.
- Kiểm tra timeline/cue không âm, nằm trong thời lượng video và có cách xử lý chuyển cảnh nhất quán.
- Chạy lại sau cache hit; đổi nội dung ở cùng vị trí; đổi thứ tự cảnh; xác nhận audio không bị dùng nhầm.
- Render mẫu 1080p, 30 fps và xem/nghe thực tế: dấu tiếng Việt, phát âm số/tên riêng, mức âm lượng, phụ đề, khoảng nghỉ, chuyển cảnh và đoạn kết.
- Đo thời gian render, RAM cực đại và số request TTS của mẫu trên máy chạy thật; dùng số đo để điều chỉnh concurrency.
- Thử quy trình từ cài đặt sạch với `npm ci`; ghi rõ các phụ thuộc hệ thống ngoài npm.

Bản đầu đạt yêu cầu khi tạo được video mẫu hoàn chỉnh từ `project.json`, sửa được từng đoạn, tận dụng cache đúng, báo lỗi thiếu lời đọc và có hướng dẫn để agent tự tạo video tiếp theo.

## 10. Rủi ro và cách xử lý

| Rủi ro | Cách xử lý |
|---|---|
| CapCut thay đổi giao thức hoặc giọng không còn hợp lệ | Kiểm chứng sớm, cô lập client, trả lỗi rõ ràng; không coi catalog cục bộ là bằng chứng dịch vụ còn hỗ trợ |
| Chưa có timestamps từng từ | Bản đầu dùng cue theo đoạn; kiểm chứng timestamps/forced alignment riêng |
| Câu ngắn tạo ngữ điệu đứt quãng | Nghe mẫu, chia theo câu/ý hoàn chỉnh và giữ thiết lập giọng nhất quán |
| Render tốn RAM hoặc mất nhiều thời gian | Đo bằng mẫu thật, giảm concurrency, tái dùng tài nguyên tĩnh và giới hạn hiệu ứng ban đầu |
| Cache cũ dùng nhầm audio | Hash theo đầu vào thực, file bất biến theo hash và kiểm tra audio trước khi công nhận |
| Nhiều tác vụ cùng ghi tài nguyên | Dùng thư mục đầu ra riêng cho mỗi lượt chạy và ghi file tạm trước khi đổi tên |

## 11. Việc tiếp theo

Bản đầu đã có video mẫu với CapCut thật, sáu cảnh và phụ đề. Tiếp theo là duyệt video thực tế về giọng đọc/nhịp kể, dùng nền để tạo nội dung mới; chỉ chọn hạng mục giai đoạn 5 khi có nhu cầu cụ thể. Xem kết quả kiểm chứng và giới hạn ở [nhật ký triển khai](phase/README.md).
