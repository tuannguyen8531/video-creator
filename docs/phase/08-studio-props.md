# Bước 08 — Sửa props và lưu mặc định trong Studio

Ngày: 2026-10-26. Trạng thái: đã sửa và kiểm chứng lưu/render snapshot.

## Nguyên nhân hai cảnh báo

- `npm run dev` truyền `--props=prepared.json`. Remotion ưu tiên input props này hơn dữ liệu chỉnh trong tab Default props.
- Root cũ viết `defaultProps={{video}}`, trong đó `video` là biến. Bộ phân tích source của Studio không trích xuất được giá trị biến này để lưu.

Tham khảo: [passing props](https://www.remotion.dev/docs/passing-props) và [cannot save default props](https://www.remotion.dev/docs/troubleshooting/cannot-save-default-props).

## Thay đổi

- `dev` tạo `StudioRoot.tsx` và `studio-entry.tsx` trong thư mục đầu ra riêng của lượt chuẩn bị.
- Composition có ID string literal và toàn bộ `defaultProps` là object literal trực tiếp để Studio trích xuất và lưu được.
- Khởi động Studio bằng entry mới, không truyền `--props`. Không tắt hoặc lọc cảnh báo.
- CLI render tiếp tục dùng props đã chuẩn bị từ `project.json`.

## Hành vi lưu

Save default props lưu vào `out/<run-id>/StudioRoot.tsx`. Render từ Studio dùng thay đổi hiện tại của snapshot này. Lệnh `npm run dev` mới tạo snapshot mới từ `project.json`; không ghi ngược chỉnh sửa vào kịch bản, audio, SRT hoặc cache.

Muốn mở lại snapshot đã lưu, chạy `npm exec -- remotion studio out/<run-id>/studio-entry.tsx` và giữ thư mục `public/generated/<run-id>/` tương ứng. Sửa lời đọc phải sửa `project.json` rồi chuẩn bị lại để audio/cue khớp nhau.

## Kiểm chứng

- TypeScript qua; 13/13 test qua. Test mới dùng chính `CodemodsInternals.computeCanUpdateDefaultPropsFromContent` và `setCompositionDefaultProps` của Remotion để kiểm tra trích xuất, sửa và trích xuất lại props.
- `npm run dev -- --project examples/intro/project.json`: Studio build thành công; 11 cache hit, không gọi lại TTS.
- HTML Studio có `window.remotion_inputProps` rỗng `{}`, nên không có CLI props ghi đè editor.
- POST `/api/update-default-props` cùng Origin trả HTTP 200 và `success: true`; `symbolicatedStack: null` vẫn tìm đúng StudioRoot nhờ quy ước `studio-entry`/`StudioRoot`.
- Đã xác nhận file snapshot chứa title sau chỉnh sửa; `examples/intro/project.json` không thay đổi.
- Request thử thiếu Origin bị chặn đúng như thiết kế của Studio. Không tắt bảo vệ này; lời gọi kiểm chứng sau dùng Origin cùng localhost như trình duyệt.
- Bundle snapshot đã lưu, `selectComposition` không truyền inputProps: nhận title mới và timeline 1590 frame; render 30 frame có audio thành công.
- Bằng chứng: `out/intro-1793002557330-7cc3a643/studio-verification.json`, `StudioRoot.tsx` và `studio-smoke.mp4`.

Đã kiểm chứng cơ chế lưu thực tế qua API và render, chưa mô phỏng click mọi control trên giao diện trình duyệt. Muốn áp dụng thay đổi, dừng Studio cũ rồi chạy lại `npm run dev -- --project ...`.
