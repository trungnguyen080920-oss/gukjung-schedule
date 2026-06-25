// CRUD cho HealthLog — theo dõi sức khoẻ hàng ngày
// GET   /api/health?date=YYYY-MM-DD  → lấy log + workouts + meals (tạo mới nếu chưa có)
// PATCH /api/health?date=YYYY-MM-DD  → cập nhật water / weightKg / notes
import { verifyJwt, extractBearer } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function auth(req: Request) {
  const raw = extractBearer(req.headers.get("authorization"));
  if (!raw) return null;
  try { return await verifyJwt(raw); } catch { return null; }
}

function todayStr() { return new Date().toISOString().slice(0, 10); }

async function getLogWithRelations(userId: string, date: string) {
  const log = await prisma.healthLog.upsert({
    where: { userId_date: { userId, date } },
    create: { userId, date },
    update: {},
    include: {
      workouts: { orderBy: { createdAt: "asc" } },
      meals:    { orderBy: { createdAt: "asc" } },
    },
  });
  return log;
}

export async function GET(req: Request) {
  const claims = await auth(req);
  if (!claims) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const date = new URL(req.url).searchParams.get("date") ?? todayStr();
  const log  = await getLogWithRelations(claims.userId, date);
  return Response.json(log);
}

export async function PATCH(req: Request) {
  const claims = await auth(req);
  if (!claims) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const date = new URL(req.url).searchParams.get("date") ?? todayStr();
  const body = await req.json().catch(() => null) as Partial<{
    waterMl: number; weightKg: number; notes: string;
    addWater: number; // shortcut: cộng thêm ml vào tổng hiện tại
  }> | null;

  if (!body) return Response.json({ error: "Body trống" }, { status: 400 });

  const existing = await prisma.healthLog.upsert({
    where: { userId_date: { userId: claims.userId, date } },
    create: { userId: claims.userId, date },
    update: {},
  });

  const updateData: Record<string, unknown> = {};
  if (body.waterMl  !== undefined) updateData.waterMl  = body.waterMl;
  if (body.weightKg !== undefined) updateData.weightKg = body.weightKg;
  if (body.notes    !== undefined) updateData.notes     = body.notes;
  if (body.addWater !== undefined) updateData.waterMl   = existing.waterMl + body.addWater;

  await prisma.healthLog.update({ where: { id: existing.id }, data: updateData });

  const log = await getLogWithRelations(claims.userId, date);
  return Response.json(log);
}
