# Cảnh React tự viết và cách chọn hình thức video

Nền cung cấp audio, cache, timeline, phụ đề và render. Agent chọn cách trình bày theo yêu cầu từng video; các ví dụ không phải khuôn bắt buộc. Có thể dùng layout có sẵn, viết component mới, hoặc trộn cả hai trong cùng `scenes`.

## Quy trình chọn

1. Xác định nội dung, đối tượng xem, mục tiêu, ngôn ngữ và nhịp kể từ yêu cầu.
2. Chọn cách thể hiện cho từng ý: chữ/số liệu, diễn xuất nhân vật, sơ đồ chuyển động, vật thể hoặc cảnh riêng.
3. Chọn giọng phù hợp từ catalog; cho phép nhiều giọng/ngôn ngữ theo đoạn hoặc audio cục bộ. Cảnh không lời đọc chỉ cần duration.
4. Tạo dự án riêng tại `projects/<ten-video>/input/`, giữ JSON, module và tài nguyên bên trong. Không thay đổi mẫu gốc để biến mẫu thành dự án người dùng; output do nền publish riêng.
5. Viết TSX khi ý tưởng vượt khả năng component hiện có. Không giả lập tính năng mới bằng một tên layout/action mà renderer chưa hiểu.

`projects/flexible/input/project.json` là ví dụ trộn slide, cảnh Orbit viết bằng React và nhân vật, với tiếng Anh/tiếng Việt. `projects/flexible/input/silent.json` là cảnh không giọng nói. Không có lựa chọn mặc định giữa các ví dụ.

## Dữ liệu cảnh custom

```json
{
  "id": "orbit",
  "layout": "custom",
  "title": "Một ý tưởng mới",
  "component": "./Orbit.tsx",
  "props": {"color": "#8b83ff"},
  "duration": 3,
  "captions": false
}
```

- `component`: module TSX/JSX cục bộ, đường dẫn tính từ JSON, có default export React component.
- `props`: dữ liệu JSON cho cảnh; agent tự định nghĩa ý nghĩa của dữ liệu trong component, không cần sửa schema lõi.
- `narration`: thêm khi cần lời đọc; bỏ được nếu có `duration` rõ ràng.
- `duration`: giây. Cảnh không lời đọc dùng đúng thời lượng này; cảnh có lời đọc giữ ít nhất thời lượng này, không cắt audio để ép vào khung.
- `captions`: mặc định true, nền vẽ phụ đề theo cue; đặt false khi component tự trình bày phụ đề hoặc cảnh không cần hiển thị.
- `lipSync`: mặc định false; bật khi component có người nói cần dữ liệu `mouthCues`. Không tự bật chỉ vì có vật thể/nhân vật trong hình.

Module TSX là code do agent/người dùng viết trong workspace, được bundle như code dự án. Nội dung `props` chỉ là dữ liệu, không phải chuỗi mã để eval. Nền kiểm tra file tồn tại trước cloud; lỗi import/export hoặc code sẽ được compiler/render báo.

## Hợp đồng component

```tsx
import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import type {CustomSceneProps} from '../../../src/video/Presentation';

export default function MovingObject({scene, durationInFrames}: CustomSceneProps) {
  const frame = useCurrentFrame();
  const x = interpolate(frame, [0, Math.max(1, durationInFrames - 1)], [200, 1600], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const color = typeof scene.props.color === 'string' ? scene.props.color : '#8b83ff';
  return <AbsoluteFill style={{background: '#10152b'}}>
    <svg viewBox="0 0 1920 1080" width="1920" height="1080">
      <circle cx={x} cy={500} r={80} fill={color}/>
    </svg>
  </AbsoluteFill>;
}
```

Điều chỉnh đường dẫn type import theo vị trí module. `useCurrentFrame()` tính từ đầu cảnh; `durationInFrames` là độ dài cảnh đã chuẩn bị. `video` chứa toàn bộ cue/timeline. Với cue toàn cục, trừ `video.scenes.find(s => s.scene.id === scene.id).from` để lấy mốc cục bộ.

Audio đã được nền phát theo cue, không phát thêm cùng file trong component. Nếu `lipSync` được bật, đọc `video.cues` của cảnh để điều khiển miệng từ dữ liệu phân tích. Dùng frame để điều khiển hình, không dùng đồng hồ thực, random không cố định hoặc gọi API trong render.

Component có thể vẽ SVG/HTML/canvas, dùng asset hoặc thư viện phù hợp đã cài. Mỗi loại rig, background, vật thể hoặc chuyển động cần được dựng bằng code/asset thật; custom không tự tạo ra chúng. Không cần sửa `Presentation.tsx` cho từng component mới.

## Tài nguyên và font

- Component dùng `staticFile('assets/...')` thì đặt tài nguyên trong `input/assets/`. Nền copy assets sang public riêng dưới .work của lượt dựng; không đoán các chuỗi đường dẫn tùy ý trong props để copy file.
- Project có thể đặt `font: "./fonts/MyFont.woff2"`; nền copy font sang generated và áp dụng cho video. Chọn font có glyph phù hợp cho hệ chữ muốn dùng.
- Font đi kèm đã dùng cho Latin/tiếng Việt. Các ngôn ngữ/hệ chữ khác cần kiểm tra font và ngắt dòng; không suy từ catalog TTS rằng chữ chắc chắn hiển thị đúng.
- Scene tùy chỉnh có thể tự khai báo thêm font, layer hoặc phong cách riêng.

## Chạy và kiểm chứng

```bash
npm run --silent voices -- --language en-US --json
npm run check -- --project projects/my-video/input/project.json
npm run render -- --project projects/my-video/input/project.json
```

CLI nhận tên dự án, thư mục hoặc file input JSON; không tự chọn ví dụ. Studio là tùy chọn. CLI/Studio dùng cùng entry và public riêng trong projects/<name>/.work/<run-id>. Save default props lưu snapshot, không ghi ngược input hoặc tạo lại audio. CLI render publish kết quả hoàn chỉnh ra output/<run-id>, latest.json trỏ tới bản mới nhất. Xem [quy ước thư mục](project-layout.md).

Kiểm tra loại hình phù hợp với nội dung, bố cục, chuyển động, phát âm và nhịp kể. Không chỉ kiểm tra video có xuất được hay không. Catalog hiện chỉ phục vụ CapCut; nếu dịch vụ khác phù hợp hơn thì tạo audio bên ngoài và khai báo `audio`, hoặc triển khai tích hợp thật trước khi hứa dùng provider đó.
