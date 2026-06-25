// GET /api/dashboard/activity?days=365
// Auth: JWT
// Returns: { [date: "YYYY-MM-DD"]: { total: number, bySubject: Record<subjectCode, number> } }
// Dùng cho Activity Heatmap — có thể lọc theo subject qua ?subjectCode=BCT
import { verifyJwt, extractBearer } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const raw = extractBearer(request.headers.get("authorization"));
  if (!raw) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let claims;
  try { claims = await verifyJwt(raw); }
  catch { return Response.json({ error: "JWT không hợp lệ hoặc hết hạn" }, { status: 401 }); }

  const url = new URL(request.url);
  const days = Math.min(parseInt(url.searchParams.get("days") ?? "365"), 730);
  const subjectFilter = url.searchParams.get("subjectCode") ?? undefined;

  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  // Nếu filter theo môn, tìm subjectId tương ứng
  let subjectId: string | undefined;
  if (subjectFilter) {
    const sub = await prisma.subject.findUnique({ where: { code: subjectFilter }, select: { id: true } });
    subjectId = sub?.id;
  }

  const sessions = await prisma.studySession.findMany({
    where: {
      userId: claims.userId,
      studiedAt: { gte: since },
      ...(subjectId ? { subjectId } : {}),
    },
    select: {
      studiedAt: true,
      noteCount: true,
      subject: { select: { code: true } },
    },
    orderBy: { studiedAt: "asc" },
  });

  // Gom nhóm theo ngày (UTC date string)
  const activity: Record<string, { total: number; bySubject: Record<string, number> }> = {};
  for (const s of sessions) {
    const date = s.studiedAt.toISOString().slice(0, 10); // "YYYY-MM-DD"
    if (!activity[date]) activity[date] = { total: 0, bySubject: {} };
    activity[date].total += s.noteCount;
    const code = s.subject.code;
    activity[date].bySubject[code] = (activity[date].bySubject[code] ?? 0) + s.noteCount;
  }

  return Response.json({ activity, since: since.toISOString(), days });
}
