# Quy ước thư mục input và output

```text
projects/<name>/
  input/
    project.json             định nghĩa video
    brief.md                 yêu cầu/storyboard nếu cần
    Scene.tsx                component tự viết, có thể có nhiều file/thư mục
    assets/                  ảnh, audio, video, font do user/agent cung cấp
  output/
    latest.json              trỏ tới bản render thành công mới nhất
    <run-id>/
      video.mp4
      captions.srt
      report.json
      previews/              ảnh các cảnh để duyệt
  .work/<run-id>/
    prepared.json            audio/timeline/cue đã chuẩn bị
    StudioRoot.tsx
    studio-entry.tsx
    public/                  tài nguyên riêng để preview/render
    report.json              tiến độ/lỗi, kể cả khi render chưa thành công
```

Input là nguồn gốc: người dùng và agent thêm/sửa tại đây. Nền không đổi hoặc ghi đè các file nguồn khi prepare/render. Tên dự án là tên thư mục, độc lập với id trong JSON.

Output là kết quả cuối: mỗi lần xuất thành công có thư mục riêng. Đường dẫn trong `latest.json` tính từ thư mục output, ví dụ `video: "<run-id>/video.mp4"`. Bản trước vẫn được giữ. Nếu render lỗi, latest giữ bản thành công trước; report lỗi ở .work của lần đó.

File props, audio tạm và Studio root nằm trong .work, không trộn với kết quả để bàn giao. MP4 cuối phát độc lập với .work. Giữ .work nếu muốn mở lại snapshot Studio; xóa dữ liệu này sẽ cần chuẩn bị lại khi muốn tiếp tục chỉnh snapshot.

Cache dùng chung ở `.cache/tts`, `.cache/lipsync`, `.cache/tools` của repository; dùng chung theo nội dung để các dự án không phải tạo lại cùng audio/khẩu hình hoặc tải công cụ. Toàn bộ `projects/` được gitignore, bao gồm input, output và .work. Đây là dữ liệu làm việc cục bộ; không tự force-add hoặc đổi quy tắc để đưa dữ liệu người dùng vào Git.

## Lệnh sử dụng

Chạy từ gốc repository; ba lệnh sau chọn cùng input:

```bash
npm run check -- --project intro
npm run check -- --project projects/intro
npm run check -- --project projects/intro/input/project.json
```

```bash
npm run prepare -- --project microservices-intro
npm run render -- --project microservices-intro
npm run dev -- --project character-waving
```

Tên dự án có thể khác biệt hoàn toàn: `microservices-intro`, `intro`, `character-waving`, `flexible`, v.v. Agent chọn hoặc tạo dự án theo brief, không tự áp mẫu cố định.

Biến thể JSON có thể nằm trong cùng input, ví dụ `projects/flexible/input/silent.json`. Chúng chia sẻ không gian output/.work của dự án, nhưng mỗi lượt có run-id riêng. Đường dẫn tương đối trong JSON tính từ thư mục chứa JSON, kể cả khi JSON nằm sâu trong input.

Vẫn nhận file JSON tường minh nằm ngoài cấu trúc chuẩn để tương thích; khi đó output/.work nằm cạnh file JSON nếu không có ancestor input. Khuyến nghị dự án mới dùng đúng projects/<name>/input. Khi không có --project, chỉ tìm ./project.json, không tự chọn một dự án.

## Tài nguyên

- `image`, `audio`, `font`, `component`: đường dẫn tính từ thư mục chứa JSON.
- Component dùng `staticFile('assets/logo.svg')`: đặt logo tại `input/assets/logo.svg`. Cả cây assets được copy sang public riêng cho mỗi lượt, không lẫn giữa các dự án.
- Font core được chuẩn bị tự động. Generated audio/image/font dùng theo hash trong public của lượt dựng; không ghi thêm vào public/generated chung ở gốc.
- Component nằm trực tiếp trong input có thể import type từ `../../../src/video/Presentation`; điều chỉnh nếu đặt sâu hơn. Không đổi đường dẫn tài nguyên khi chỉ đổi cách chọn --project từ tên sang file.

## Mở lại Studio đã lưu

```bash
npm exec -- remotion studio projects/<name>/.work/<run-id>/studio-entry.tsx --public-dir projects/<name>/.work/<run-id>/public
```

Save default props lưu snapshot trong .work. Muốn thay đổi sản phẩm lâu dài, cập nhật input rồi chạy lại pipeline. Studio render thủ công cần chọn đích xuất; chỉ luồng `npm run render` thực hiện publish hoàn chỉnh và cập nhật latest.json.

## Dữ liệu cũ

Nguồn trước đây ở examples và projects/<name> được chuyển vào input. Các lượt trong out được tách sang output/.work đúng dự án; MP4 đã so checksum trước/sau. Probe/benchmark không gắn dự án giữ tại `.cache/legacy-artifacts`. Manifest chuyển đổi ở `.cache/legacy-artifacts/migration.json`.

Các đường dẫn out/public/generated trong docs/phase bước 01–11 là ghi chép lịch sử. Dùng cấu trúc này và bước 12 cho thao tác hiện tại.
