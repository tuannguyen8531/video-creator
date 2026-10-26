# Bước 12 — Input/output riêng cho từng dự án

Ngày: 2026-10-26. Trạng thái: hoàn thành chuyển dữ liệu và kiểm chứng CLI/render/Studio.

## Cấu trúc đã chọn

```text
projects/<ten-du-an>/
  input/                   JSON, brief, component, hình/audio/font gốc
    project.json
    assets/                staticFile('assets/...') trong component
  output/
    latest.json            Trỏ tới lần xuất thành công gần nhất
    <run-id>/              MP4, SRT, report, previews
  .work/<run-id>/           Props, Studio root, audio/assets dựng tạm, log lỗi
```

Cache audio/khẩu hình và công cụ dùng chung vẫn ở `.cache/` của repository để không tổng hợp/tải lại khi tái sử dụng giữa các dự án. Cập nhật theo phản hồi người dùng: toàn bộ projects/ (input/output/.work) được bỏ qua bởi Git. Không chỉnh git index hay commit trong bước này.

## Đã thực hiện

- Chuyển 14 file nguồn vào input, gồm dự án có sẵn `microservices-intro` và các ví dụ `intro`, `character-waving`, `flexible`. Giữ cả `test.json` của dự án người dùng; không sửa nội dung kịch bản để phù hợp mẫu khác.
- Rebase import TSX do thay độ sâu thư mục; các đường dẫn tương đối trong JSON giữ ý nghĩa theo thư mục JSON.
- Chuyển 18 lượt chuẩn bị/render cũ: dữ liệu dựng vào .work; chỉ lượt có video hoàn chỉnh/trạng thái rendered được đưa ra output.
- MP4 hoàn chỉnh được so SHA-256 trước/sau chuyển; script đã chạy thành công không báo thay đổi bytes.
- Audio/assets cũ chuyển vào public riêng của lượt dựng; props và snapshot Studio được rebase để tiếp tục dùng được, giữ các chỉnh sửa props đã lưu.
- Ba nhóm artifact không gắn rõ dự án (probe, benchmark, zod smoke test) giữ trong `.cache/legacy-artifacts/`.
- Manifest chuyển đổi: `.cache/legacy-artifacts/migration.json`. Script `scripts/migrate-project-layout.ts` không ghi đè input/output đích; chạy lại sau thành công không chuyển lại dữ liệu, chỉ kiểm tra/sửa import legacy khi cần và giữ manifest gốc.
- Không còn tạo lượt mới ở root out hoặc public/generated. Mỗi lượt dùng public riêng dưới .work; core fonts và input/assets được copy tới đó.
- CLI nhận tên dự án, thư mục hoặc đường dẫn JSON. Không tự chọn một dự án mặc định.
- Chỉ publish output sau khi MP4/ảnh hoàn tất, qua thư mục staging và rename. Lỗi chuẩn bị/render giữ report trong .work, không đổi latest thành công hoặc ghi đè video cũ.

## Kết quả kiểm chứng

- `npm run typecheck` và 23/23 test qua. Các test mới kiểm tra selector tên/thư mục/file, biến thể JSON trong input, cách ly workspace giữa dự án, chỉ publish artifact cuối, giữ latest/video trước khi lỗi, không ghi đè bản cũ và không để file tạm trong output.
- Test chuẩn bị xác nhận input không bị đổi, font/input assets được copy sang public riêng và prepare chưa tạo output. Lỗi TTS giữ report trong .work, không sinh prepared/video giả.
- `check --project intro`, `character-waving`, `flexible`, `microservices-intro`: tất cả hợp lệ.
- Migration giữ 18 lượt dựng, trong đó có 8 MP4 hoàn chỉnh đã so SHA-256 trước/sau. 14 source file được chuyển; các source TSX chỉ thay import do độ sâu thư mục mới. Nội dung test.json có sẵn của người dùng vẫn được giữ.
- Render mới: `projects/flexible/output/flexible-story-1793007980647-8cdab786/video.mp4`. H.264/AAC, 1920 × 1080, container 15,147 giây; FFmpeg decode toàn bộ không báo lỗi.
- Lượt này dùng 3 audio cache hit và 1 lip-sync cache hit, 0 HTTP request TTS; chuẩn bị 0,119 giây và render/ảnh 23,509 giây. `output/latest.json` trỏ đúng run mới; các bản trước còn nguyên.
- Khi thử snapshot Microservices cũ, phát hiện entry import sibling StudioRoot còn trỏ về out. Đã sửa mapper để rebase cả các thư mục run, sửa 6 import snapshot đã chuyển, giữ props Studio đã lưu. Kiểm tra 39 relative import trên source/snapshot: không còn đích thiếu.
- Snapshot Microservices mới nhất đã bundle/select composition thành công (2398 frame) và render thử 30 frame có audio. Artifact kiểm chứng ở `.cache/layout-verification/microservices.mp4`.
- Studio dùng entry/public trong `.work/silent-motion-1793008021070-ac29823b` của flexible đã build thành công, HTTP 200. Lấy font qua remotion_staticBase và so bytes với font core: trùng. Kiểm tra HTTP dùng đúng staticBase, không giả định endpoint /fonts.
- Studio thử nghiệm đã dừng sau khi kiểm chứng. Chưa lặp mọi thao tác UI, nhưng cơ chế entry/defaultProps giữ nguyên từ bước 08, và tài nguyên theo public-dir mới đã kiểm chứng thực tế.
- Có [quy ước thư mục](../project-layout.md), README, AGENTS và hướng dẫn agent/custom/character cập nhật đường dẫn mới. Các đường dẫn cũ ở bước 01–11 là lịch sử.
