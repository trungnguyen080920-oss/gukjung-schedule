// Use-case: tổng hợp toàn bộ dữ liệu tiến độ của user, gom nhóm theo Subject.
// Dùng cho GET /api/dashboard/summary và trang public /share/[shareToken] (Prompt 4).
import { prisma } from "@/lib/prisma";

export async function getDashboardSummary(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });

  const progresses = await prisma.progress.findMany({
    where: { userId },
    include: {
      subject: { include: { category: { select: { name: true, code: true } } } },
    },
    orderBy: { lastStudiedAt: "desc" },
  });

  // 5 phiên gần nhất cho từng môn — 1 query duy nhất thay vì N queries (scalable)
  const subjectIds = progresses.map((p) => p.subjectId);
  const allRecentSessions = subjectIds.length
    ? await prisma.studySession.findMany({
        where: { userId, subjectId: { in: subjectIds } },
        orderBy: { studiedAt: "desc" },
        select: { id: true, batchId: true, noteCount: true, cardCount: true, layer: true, durationSec: true, studiedAt: true, subjectId: true },
      })
    : [];

  // Group in-memory: top-5 per subjectId (sessions already desc-sorted)
  const sessionMap = new Map<string, typeof allRecentSessions>();
  for (const s of allRecentSessions) {
    const arr = sessionMap.get(s.subjectId) ?? [];
    if (arr.length < 5) { arr.push(s); sessionMap.set(s.subjectId, arr); }
  }

  const subjects = progresses.map((p) => ({
    subject: {
      id: p.subject.id,
      code: p.subject.code,
      name: p.subject.name,
      colorHex: p.subject.colorHex,
      description: p.subject.description,
      category: p.subject.category,
    },
    progress: {
      totalNotes: p.totalNotes,
      totalCards: p.totalCards,
      masteredCards: p.masteredCards,
      totalStudySec: p.totalStudySec,
      currentStreak: p.currentStreak,
      longestStreak: p.longestStreak,
      lastStudiedAt: p.lastStudiedAt,
      // Phần trăm hoàn thành: dựa trên masteredCards / totalCards
      completionPct: p.totalCards > 0 ? Math.round((p.masteredCards / p.totalCards) * 100) : 0,
    },
    recentSessions: sessionMap.get(p.subjectId) ?? [],
  }));

  // Thống kê tổng hợp toàn user
  const stats = {
    totalSubjects: subjects.length,
    totalStudySec: subjects.reduce((sum, s) => sum + s.progress.totalStudySec, 0),
    bestStreak: subjects.reduce((max, s) => Math.max(max, s.progress.longestStreak), 0),
    totalCards: subjects.reduce((sum, s) => sum + s.progress.totalCards, 0),
    totalNotes: subjects.reduce((sum, s) => sum + s.progress.totalNotes, 0),
  };

  return { user, subjects, stats };
}

// Phiên bản rút gọn dùng cho trang chia sẻ công khai (Prompt 4)
// Không trả về email hoặc thông tin nhạy cảm.
export async function getPublicDashboardSummary(shareToken: string) {
  const link = await prisma.sharedLink.findUnique({
    where: { shareToken },
    include: { user: { select: { id: true, name: true } } },
  });

  if (!link || !link.isActive) return null;
  if (link.expiresAt && link.expiresAt < new Date()) return null;

  // Cập nhật view count không đồng bộ (fire-and-forget)
  prisma.sharedLink.update({ where: { id: link.id }, data: { viewCount: { increment: 1 } } }).catch(() => {});

  const progresses = await prisma.progress.findMany({
    where: { userId: link.user.id },
    include: { subject: { include: { category: { select: { name: true, code: true } } } } },
    orderBy: { longestStreak: "desc" },
  });

  return {
    owner: link.user.name ?? "Người dùng GUKJUNG",
    subjects: progresses.map((p) => ({
      subject: { code: p.subject.code, name: p.subject.name, colorHex: p.subject.colorHex },
      streak: { current: p.currentStreak, longest: p.longestStreak },
      totalCards: p.totalCards,
      completionPct: p.totalCards > 0 ? Math.round((p.masteredCards / p.totalCards) * 100) : 0,
      lastStudiedAt: p.lastStudiedAt,
    })),
  };
}
