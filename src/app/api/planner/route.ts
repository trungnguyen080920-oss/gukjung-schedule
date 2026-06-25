// CRUD cho PlannerTask — Daily Planner checklist
// GET  /api/planner?date=YYYY-MM-DD   → tasks của ngày
// POST /api/planner                   → tạo task mới
// PATCH /api/planner?id=xxx           → toggle/update task
// DELETE /api/planner?id=xxx          → xoá task
import { verifyJwt, extractBearer } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function auth(req: Request) {
  const raw = extractBearer(req.headers.get("authorization"));
  if (!raw) return null;
  try { return await verifyJwt(raw); } catch { return null; }
}

export async function GET(req: Request) {
  const claims = await auth(req);
  if (!claims) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const date = new URL(req.url).searchParams.get("date") ?? todayStr();
  const tasks = await prisma.plannerTask.findMany({
    where: { userId: claims.userId, date },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  const total     = tasks.length;
  const completed = tasks.filter((t) => t.isCompleted).length;
  return Response.json({ tasks, meta: { total, completed, pct: total ? Math.round((completed / total) * 100) : 0 } });
}

export async function POST(req: Request) {
  const claims = await auth(req);
  if (!claims) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null) as {
    title?: string; category?: string; date?: string;
    subjectCode?: string; priority?: number; estimatedMin?: number;
  } | null;
  if (!body?.title?.trim()) return Response.json({ error: "title là bắt buộc" }, { status: 400 });

  const date = body.date ?? todayStr();
  // sortOrder = count hiện tại + 1
  const count = await prisma.plannerTask.count({ where: { userId: claims.userId, date } });
  const task = await prisma.plannerTask.create({
    data: {
      userId: claims.userId,
      date,
      title: body.title.trim(),
      category: body.category ?? "study",
      subjectCode: body.subjectCode ?? null,
      priority: body.priority ?? 1,
      estimatedMin: body.estimatedMin ?? null,
      sortOrder: count,
    },
  });
  return Response.json({ task }, { status: 201 });
}

export async function PATCH(req: Request) {
  const claims = await auth(req);
  if (!claims) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return Response.json({ error: "id là bắt buộc" }, { status: 400 });

  const body = await req.json().catch(() => null) as Partial<{
    isCompleted: boolean; title: string; category: string; priority: number; estimatedMin: number;
  }> | null;

  // Kiểm tra task thuộc user này
  const existing = await prisma.plannerTask.findFirst({ where: { id, userId: claims.userId } });
  if (!existing) return Response.json({ error: "Không tìm thấy task" }, { status: 404 });

  const task = await prisma.plannerTask.update({ where: { id }, data: body ?? {} });
  return Response.json({ task });
}

export async function DELETE(req: Request) {
  const claims = await auth(req);
  if (!claims) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return Response.json({ error: "id là bắt buộc" }, { status: 400 });

  const existing = await prisma.plannerTask.findFirst({ where: { id, userId: claims.userId } });
  if (!existing) return Response.json({ error: "Không tìm thấy task" }, { status: 404 });

  await prisma.plannerTask.delete({ where: { id } });
  return new Response(null, { status: 204 });
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
