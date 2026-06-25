// POST   /api/health/workout  → thêm 1 WorkoutEntry, recompute calBurned trên HealthLog
// DELETE /api/health/workout?id=xxx → xoá WorkoutEntry, recompute calBurned
import { verifyJwt, extractBearer } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function auth(req: Request) {
  const raw = extractBearer(req.headers.get("authorization"));
  if (!raw) return null;
  try { return await verifyJwt(raw); } catch { return null; }
}

function todayStr() { return new Date().toISOString().slice(0, 10); }

async function recomputeCalBurned(healthLogId: string) {
  const agg = await prisma.workoutEntry.aggregate({
    where: { healthLogId },
    _sum: { calBurned: true },
  });
  await prisma.healthLog.update({
    where: { id: healthLogId },
    data: { calBurned: agg._sum.calBurned ?? 0 },
  });
}

export async function POST(req: Request) {
  const claims = await auth(req);
  if (!claims) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null) as {
    name: string; durationMin: number; calBurned: number;
    muscleGroups?: string[]; notes?: string; date?: string;
  } | null;

  if (!body?.name) return Response.json({ error: "Thiếu name" }, { status: 400 });

  const date = body.date ?? todayStr();

  // upsert HealthLog cho ngày đó
  const log = await prisma.healthLog.upsert({
    where: { userId_date: { userId: claims.userId, date } },
    create: { userId: claims.userId, date },
    update: {},
  });

  const entry = await prisma.workoutEntry.create({
    data: {
      healthLogId:  log.id,
      name:         body.name,
      durationMin:  body.durationMin ?? 0,
      calBurned:    body.calBurned   ?? 0,
      muscleGroups: JSON.stringify(body.muscleGroups ?? []),
      notes:        body.notes,
    },
  });

  await recomputeCalBurned(log.id);

  // Trả về entry + parsed muscleGroups
  return Response.json({ ...entry, muscleGroups: JSON.parse(entry.muscleGroups) }, { status: 201 });
}

export async function DELETE(req: Request) {
  const claims = await auth(req);
  if (!claims) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return Response.json({ error: "Thiếu id" }, { status: 400 });

  // Kiểm tra ownership qua healthLog → user
  const entry = await prisma.workoutEntry.findUnique({
    where: { id },
    include: { healthLog: { select: { userId: true } } },
  });
  if (!entry) return Response.json({ error: "Không tìm thấy" }, { status: 404 });
  if (entry.healthLog.userId !== claims.userId)
    return Response.json({ error: "Forbidden" }, { status: 403 });

  await prisma.workoutEntry.delete({ where: { id } });
  await recomputeCalBurned(entry.healthLogId);

  return Response.json({ ok: true });
}
