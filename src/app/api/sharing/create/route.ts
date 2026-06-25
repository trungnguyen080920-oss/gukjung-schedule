// POST /api/sharing/create
// Auth: JWT
// Body: { expiresInDays?: number }  — null = không hết hạn
// Returns: { shareToken, shareUrl, expiresAt? }
import { randomBytes } from "crypto";
import { verifyJwt, extractBearer } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const raw = extractBearer(request.headers.get("authorization"));
  if (!raw) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let claims;
  try { claims = await verifyJwt(raw); }
  catch { return Response.json({ error: "JWT không hợp lệ" }, { status: 401 }); }

  const body = await request.json().catch(() => ({})) as { expiresInDays?: number };
  const expiresAt = body.expiresInDays
    ? new Date(Date.now() + body.expiresInDays * 86_400_000)
    : null;

  // Vô hiệu hoá link cũ (mỗi user giữ 1 link active, đơn giản hơn nhiều link)
  await prisma.sharedLink.updateMany({
    where: { userId: claims.userId, isActive: true },
    data: { isActive: false },
  });

  const shareToken = randomBytes(16).toString("hex"); // 32 ký tự hex
  const link = await prisma.sharedLink.create({
    data: { userId: claims.userId, shareToken, isActive: true, ...(expiresAt ? { expiresAt } : {}) },
  });

  const origin = new URL(request.url).origin;
  return Response.json({
    shareToken: link.shareToken,
    shareUrl: `${origin}/share/${link.shareToken}`,
    expiresAt: link.expiresAt,
  });
}

// DELETE /api/sharing/create — thu hồi tất cả link
export async function DELETE(request: Request) {
  const raw = extractBearer(request.headers.get("authorization"));
  if (!raw) return Response.json({ error: "Unauthorized" }, { status: 401 });
  let claims;
  try { claims = await verifyJwt(raw); }
  catch { return Response.json({ error: "JWT không hợp lệ" }, { status: 401 }); }

  await prisma.sharedLink.updateMany({ where: { userId: claims.userId }, data: { isActive: false } });
  return Response.json({ ok: true, message: "Đã thu hồi tất cả link chia sẻ" });
}
