// POST   /api/health/meal  → thêm 1 MealEntry, recompute calIn + proteinG trên HealthLog
// DELETE /api/health/meal?id=xxx → xoá MealEntry, recompute calIn + proteinG
import { verifyJwt, extractBearer } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function auth(req: Request) {
  const raw = extractBearer(req.headers.get("authorization"));
  if (!raw) return null;
  try { return await verifyJwt(raw); } catch { return null; }
}

function todayStr() { return new Date().toISOString().slice(0, 10); }

async function recomputeNutrition(healthLogId: string) {
  const agg = await prisma.mealEntry.aggregate({
    where: { healthLogId },
    _sum: { calories: true, proteinG: true },
  });
  await prisma.healthLog.update({
    where: { id: healthLogId },
    data: {
      calIn:    agg._sum.calories ?? 0,
      proteinG: agg._sum.proteinG ?? 0,
    },
  });
}

export async function POST(req: Request) {
  const claims = await auth(req);
  if (!claims) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null) as {
    name: string; calories: number; proteinG?: number;
    carbsG?: number; fatG?: number; timeEaten?: string;
    notes?: string; date?: string;
  } | null;

  if (!body?.name) return Response.json({ error: "Thiếu name" }, { status: 400 });

  const date = body.date ?? todayStr();

  const log = await prisma.healthLog.upsert({
    where: { userId_date: { userId: claims.userId, date } },
    create: { userId: claims.userId, date },
    update: {},
  });

  const entry = await prisma.mealEntry.create({
    data: {
      healthLogId: log.id,
      name:        body.name,
      calories:    body.calories   ?? 0,
      proteinG:    body.proteinG   ?? 0,
      carbsG:      body.carbsG     ?? 0,
      fatG:        body.fatG       ?? 0,
      timeEaten:   body.timeEaten,
      notes:       body.notes,
    },
  });

  await recomputeNutrition(log.id);

  return Response.json(entry, { status: 201 });
}

export async function DELETE(req: Request) {
  const claims = await auth(req);
  if (!claims) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return Response.json({ error: "Thiếu id" }, { status: 400 });

  const entry = await prisma.mealEntry.findUnique({
    where: { id },
    include: { healthLog: { select: { userId: true } } },
  });
  if (!entry) return Response.json({ error: "Không tìm thấy" }, { status: 404 });
  if (entry.healthLog.userId !== claims.userId)
    return Response.json({ error: "Forbidden" }, { status: 403 });

  await prisma.mealEntry.delete({ where: { id } });
  await recomputeNutrition(entry.healthLogId);

  return Response.json({ ok: true });
}
