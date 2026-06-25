# Modules (Domain-Driven Design)

Mỗi thư mục con là một **bounded context** (ngữ cảnh nghiệp vụ). Mỗi context chia 3 tầng:

| Tầng | Vai trò | Ví dụ file (sẽ thêm ở Prompt 2+) |
|------|---------|----------------------------------|
| `domain/` | Entity, value object, **interface** repository, quy tắc nghiệp vụ thuần (không phụ thuộc Prisma/Next) | `user.entity.ts`, `user.repository.ts` |
| `application/` | Use-case / service điều phối nghiệp vụ | `sync-anki-log.usecase.ts`, `get-dashboard-summary.usecase.ts` |
| `infrastructure/` | Hiện thực repository bằng Prisma, adapter ngoài | `prisma-user.repository.ts` |

## Các context

- **users** — người dùng, phân quyền (ADMIN/USER), API token cho Watcher.
- **subjects** — danh mục & môn học (thực thể động: thêm môn = thêm bản ghi).
- **progress** — phiên học (StudySession) + tiến độ gộp (Progress) + tính streak.
- **sharing** — link chia sẻ công khai dashboard (SharedLink).

> Bước 1 mới dựng khung thư mục. Logic đầy đủ thêm dần ở Prompt 2 (API), Prompt 3 (UI),
> Prompt 4 (Sharing/Admin). Mọi tầng `infrastructure` dùng chung Prisma client tại
> [`src/lib/prisma.ts`](../lib/prisma.ts).
