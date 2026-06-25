// GET /api/dashboard/recent-sessions?limit=20&after=<ISO-date>
// Auth: JWT
// Dùng cho Live Log Streamer — polling mỗi 5 giây, trả về sessions mới hơn `after`
import { verifyJwt, extractBearer } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const raw = extractBearer(request.headers.get("authorization"));
  if (!raw) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let claims;
  try { claims = await verifyJwt(raw); }
  catch { return Response.json({ error: "JWT không hợp lệ hoặc hết hạn" }, { status: 401 }); }

  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20"), 50);
  const after = url.searchParams.get("after");

  const sessions = await prisma.studySession.findMany({
    where: {
      userId: claims.userId,
      ...(after ? { studiedAt: { gt: new Date(after) } } : {}),
    },
    orderBy: { studiedAt: "desc" },
    take: limit,
    select: {
      id: true,
      batchId: true,
      noteCount: true,
      cardCount: true,
      layer: true,
      durationSec: true,
      studiedAt: true,
      subject: { select: { code: true, name: true, colorHex: true } },
    },
  });

  return Response.json({ sessions, timestamp: new Date().toISOString() });
}
