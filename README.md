# Video Creator

Nền tạo video cho AI agent bằng npm, TypeScript, React và Remotion. Agent chọn hình thức, giọng và ngôn ngữ theo yêu cầu: thuyết trình, hoạt hình, cảnh React tự thiết kế hoặc kết hợp. Các dự án mẫu là ví dụ tham khảo; nền không tự chọn một mẫu hay giọng cố định.

## Giấy phép

Copyright 2026 SeventhS (tuannguyen8531).

Mã nguồn dự án được cấp phép theo [Apache License 2.0](LICENSE). Các thành phần bên thứ ba giữ giấy phép riêng; xem [thông báo và giấy phép thành phần sử dụng lại](THIRD_PARTY_NOTICES.md).

## Bắt đầu

Yêu cầu: Node.js >=22 (đã kiểm chứng 24.14.0), npm, `ffmpeg` và `ffprobe` trên PATH. Linux cần thư viện hệ thống cho Chrome; xem [tài liệu Remotion](https://www.remotion.dev/docs/miscellaneous/linux-dependencies). Font tiếng Việt đã có trong dự án.

```bash
npm ci
npm run browser
npm run check -- --project projects/intro/input/project.json
npm run render -- --project projects/intro/input/project.json
```

Render đầu tiên cần mạng để tạo lời đọc; các lần sau dùng cache nếu nội dung/giọng/thiết lập không đổi. Tích hợp CapCut TTS hiện không yêu cầu API key; khả năng hoạt động phụ thuộc dịch vụ. `npm ci` không gọi TTS.

Lệnh trên chạy thử dự án thuyết trình. Mỗi dự án có `input/` và `output/` riêng; agent chọn cảnh theo nội dung. Có thể truyền `--project intro`, `--project projects/intro` hoặc đường dẫn JSON trong input. Khi bỏ cờ này CLI chỉ tìm `./project.json`, không tự chọn dự án.

| Ví dụ | Nội dung |
|---|---|
| `projects/intro/input/project.json` | Sáu cảnh thuyết trình |
| `projects/character-waving/input/project.json` | Rig nhân vật 2D có hoạt động và khẩu hình |
| `projects/flexible/input/project.json` | Trộn slide, component React tự viết, nhân vật và giọng Anh/Việt |
| `projects/flexible/input/silent.json` | Cảnh tự viết không lời đọc |

Chỉ các cảnh cần khẩu hình mới cần `npm run setup:lipsync`. Chọn giọng theo ngôn ngữ bằng `npm run --silent voices -- --language en-US --json`; khai báo voice/language theo dự án hoặc từng đoạn. Không có voice ngầm định. Có thể dùng audio riêng hoặc cảnh im lặng với `duration`.

```text
projects/
  microservices-intro/
    input/                   project.json, component, brief, tài nguyên gốc
    output/
      latest.json            đường dẫn bản xuất thành công gần nhất
      <run-id>/
        video.mp4
        captions.srt
        report.json
        previews/
    .work/<run-id>/           dữ liệu dựng và snapshot Studio
  intro/
    input/
    output/
  character-waving/
    input/
    output/
```

Chỉ render thành công mới tạo một bản trong output và cập nhật latest; các bản trước được giữ nguyên. `prepare`, `voice`, `dev` và lỗi render ghi dữ liệu/report trong `.work`, không làm output lẫn với file tạm. Cache dùng chung vẫn nằm ở `.cache/` để tái sử dụng audio/khẩu hình giữa các dự án.

```bash
npm run dev -- --project projects/flexible/input/project.json
npm run voices
npm run typecheck
npm test
```

`dev` chuẩn bị dự án rồi mở Remotion Studio. Khi chỉ sửa component React, Studio cập nhật trực tiếp. Khi sửa kịch bản hoặc tài nguyên trong `project.json`, dừng và chạy lại `dev` để cập nhật audio/timeline.

Studio dùng snapshot có thể chỉnh sửa tại `projects/<name>/.work/<run-id>/StudioRoot.tsx`, không truyền `--props`. Save default props lưu snapshot đó. Muốn mở lại, truyền cả entry và public riêng: `npm exec -- remotion studio projects/<name>/.work/<run-id>/studio-entry.tsx --public-dir projects/<name>/.work/<run-id>/public`. Lần `dev` mới và CLI render vẫn lấy kịch bản từ input. Đổi lời đọc cần sửa JSON rồi chuẩn bị lại.

Đặt tài nguyên do người dùng/agent cung cấp trong `input/`. Component dùng `staticFile('assets/...')` thì đặt file ở `input/assets/`; nền copy sang public riêng của lượt dựng. Đường dẫn `image`, `audio`, `font`, `component` trong JSON vẫn tính từ thư mục chứa JSON. Output không cần `.work` để phát MP4; muốn mở lại snapshot Studio thì giữ `.work`.

## Tài liệu

- [Hướng dẫn dành cho agent](docs/agent-guide.md)
- [Nhân vật 2D, hành động và khớp miệng](docs/character-animation.md)
- [Viết cảnh React riêng và phối hợp các phong cách](docs/custom-scenes.md)
- [Quy ước thư mục dự án](docs/project-layout.md)
- [Kế hoạch và phạm vi](docs/implementation-plan.md)
- [Tiến độ, bằng chứng và giới hạn từng bước](docs/phase/README.md)
- [Nguồn và giấy phép thành phần sử dụng lại](THIRD_PARTY_NOTICES.md)

## Giới hạn bản đầu

Pipeline hiện xuất 1080p/30 fps, có TTS tuần tự và phụ đề theo đoạn. Các layout và rig có sẵn là thư viện ban đầu; `layout: custom` nhận component React cục bộ để thiết kế nhân vật, vật thể, bố cục và chuyển động khác mà không sửa schema lõi. Rig mẫu có một thiết kế và năm loại hành động; năng lực mới cần artwork/code tương ứng. Chưa có timestamps phụ đề từng từ, batch TTS, nhạc nền hay trình kéo thả. Lỗi TTS/khẩu hình chặn xuất video, không bị thay bằng kết quả giả.

`setup:lipsync` tải Rhubarb 1.14.0 chính thức (~87 MB), tự động hỗ trợ Linux x64 và cần `unzip`. Máy khác cài bản phù hợp từ upstream và đặt `RHUBARB_BIN`. Rhubarb chạy từ Node.js, không cần Python. Bộ slide và cảnh không lời đọc không cần công cụ này.

Zod được khóa đúng 4.5.4 theo Remotion 4.0.538, không dùng override. Phiên bản này còn advisory về tiêu thụ bộ nhớ; CLI giới hạn JSON dự án ở 1 MiB trước khi parse để hạn chế đầu vào quá lớn. Giới hạn này không vá Zod hoặc các đường nhập dữ liệu nội bộ của Studio. Xem kết quả kiểm chứng và giới hạn ở [bước 07](docs/phase/07-zod-compatibility.md).
