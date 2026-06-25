// POST /api/admin/subjects — thêm môn học mới (không cần sửa code)
// DELETE /api/admin/subjects — xoá/ẩn môn học
// Auth: JWT (role ADMIN)
import { verifyJwt, extractBearer } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin(request: Request) {
  const raw = extractBearer(request.headers.get("authorization"));
  if (!raw) return null;
  try {
    const claims = await verifyJwt(raw);
    if (claims.role !== "ADMIN") return null;
    return claims;
  } catch { return null; }
}

export async function GET(request: Request) {
  const claims = await requireAdmin(request);
  if (!claims) return Response.json({ error: "Chỉ ADMIN mới truy cập được" }, { status: 403 });

  const subjects = await prisma.subject.findMany({
    include: { category: { select: { name: true, code: true } } },
    orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
  });
  const categories = await prisma.subjectCategory.findMany({ orderBy: { name: "asc" } });
  return Response.json({ subjects, categories });
}

export async function POST(request: Request) {
  const claims = await requireAdmin(request);
  if (!claims) return Response.json({ error: "Chỉ ADMIN mới truy cập được" }, { status: 403 });

  const body = await request.json().catch(() => null) as {
    name?: string; code?: string; categoryCode?: string;
    colorHex?: string; description?: string;
  } | null;

  if (!body?.name || !body.code || !body.categoryCode) {
    return Response.json({ error: "name, code và categoryCode là bắt buộc" }, { status: 400 });
  }

  const category = await prisma.subjectCategory.findUnique({ where: { code: body.categoryCode } });
  if (!category) return Response.json({ error: `Category "${body.categoryCode}" không tồn tại` }, { status: 400 });

  const existing = await prisma.subject.findUnique({ where: { code: body.code.toUpperCase() } });
  if (existing) return Response.json({ error: `Code "${body.code}" đã tồn tại` }, { status: 409 });

  const subject = await prisma.subject.create({
    data: {
      name: body.name,
      code: body.code.toUpperCase(),
      categoryId: category.id,
      colorHex: body.colorHex ?? null,
      description: body.description ?? null,
    },
    include: { category: { select: { name: true } } },
  });

  return Response.json({ subject }, { status: 201 });
}

export async function PATCH(request: Request) {
  const claims = await requireAdmin(request);
  if (!claims) return Response.json({ error: "Chỉ ADMIN mới truy cập được" }, { status: 403 });

  const body = await request.json().catch(() => null) as {
    code?: string; isActive?: boolean;
  } | null;
  if (!body?.code) return Response.json({ error: "code là bắt buộc" }, { status: 400 });

  const subject = await prisma.subject.update({
    where: { code: body.code.toUpperCase() },
    data: { isActive: body.isActive ?? false },
  });
  return Response.json({ subject });
}
