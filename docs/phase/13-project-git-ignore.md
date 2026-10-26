# Bước 13 — Giữ toàn bộ dữ liệu dự án ngoài Git

Ngày: 2026-10-26. Trạng thái: đã sửa và kiểm tra.

Ở bước 12 đã tự đổi quy tắc projects/ thành chỉ bỏ qua output/.work, khiến input xuất hiện dưới dạng untracked. Người dùng không yêu cầu đưa input vào Git; đây là suy diễn sai về phạm vi tổ chức thư mục.

- Khôi phục `/projects/` trong .gitignore, bỏ qua toàn bộ input/output/.work.
- Sửa AGENTS và tài liệu để không tự force-add hoặc đổi chính sách Git của dữ liệu làm việc.
- Kiểm tra trước sửa: `git ls-files -- projects` rỗng, projects chỉ ở trạng thái untracked. Chưa có file input nào được stage/track/commit trong bước này.
- Không chạy git add/rm/reset/restore; không thay đổi index hoặc xóa dữ liệu.

Kiểm chứng bằng `git check-ignore` trên input JSON, component, output và .work; `git status --short -- projects` không còn báo untracked.
