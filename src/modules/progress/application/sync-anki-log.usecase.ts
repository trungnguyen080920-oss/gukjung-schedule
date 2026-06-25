// Use-case: nhận log đồng bộ từ Watcher/Anki, ghi StudySession, cộng dồn Progress.
// Chống trùng lặp qua batchId: nếu batch đã xử lý → trả về {skipped:true} ngay.
import { prisma } from "@/lib/prisma";
import type { Progress } from "@prisma/client";

export interface SyncAnkiLogInput {
  batchId?: string; // undefined = không kiểm tra idempotency
  subjectCode: string; // mã môn: "BCT", "TOEIC", "HSK"...
  noteCount: number;
  cardCount?: number;
  layer?: string; // tầng: "Vocab", "Cloze", "Blurting"...
  durationSec?: number;
  userId: string; // từ API token lookup (không nhận từ body)
}

export type SyncResult =
  | { skipped: true; sessionId: string }
  | { skipped: false; session: { id: string; batchId: string | null; studiedAt: Date }; progress: Progress };

export async function syncAnkiLog(input: SyncAnkiLogInput): Promise<SyncResult> {
  const { batchId, subjectCode, noteCount, cardCount = 0, layer, durationSec = 0, userId } = input;

  // ── Lớp 1: pre-check trước transaction (fast-path) ──────────────────────
  if (batchId) {
    const existing = await prisma.studySession.findUnique({ where: { batchId } });
    if (existing) return { skipped: true, sessionId: existing.id };
  }

  // ── Tìm môn học ──────────────────────────────────────────────────────────
  const subject = await prisma.subject.findUnique({ where: { code: subjectCode } });
  if (!subject) throw new Error(`Môn học không tồn tại: "${subjectCode}"`);

  const now = new Date();

  // ── Transaction: tạo session + upsert progress ───────────────────────────
  // Lớp 2: DB unique constraint trên batchId ngăn race condition nếu 2 request cùng lúc.
  const result = await prisma.$transaction(async (tx) => {
    const session = await tx.studySession.create({
      data: { userId, subjectId: subject.id, batchId, noteCount, cardCount, layer, durationSec, studiedAt: now },
      select: { id: true, batchId: true, studiedAt: true },
    });

    // Đọc progress hiện tại để tính streak
    const existingProgress = await tx.progress.findUnique({
      where: { userId_subjectId: { userId, subjectId: subject.id } },
    });

    const { currentStreak, longestStreak } = computeStreak(existingProgress, now);

    const progress = await tx.progress.upsert({
      where: { userId_subjectId: { userId, subjectId: subject.id } },
      create: {
        userId,
        subjectId: subject.id,
        totalNotes: noteCount,
        totalCards: cardCount,
        masteredCards: 0,
        totalStudySec: durationSec,
        currentStreak,
        longestStreak,
        lastStudiedAt: now,
      },
      update: {
        totalNotes: { increment: noteCount },
        totalCards: { increment: cardCount },
        totalStudySec: { increment: durationSec },
        currentStreak,
        longestStreak,
        lastStudiedAt: now,
      },
    });

    return { session, progress };
  });

  return { skipped: false, ...result };
}

// ── Streak calculator ─────────────────────────────────────────────────────────
// Rules:
//   lastStudiedAt == today      → maintain (đã học hôm nay rồi, không tăng)
//   lastStudiedAt == yesterday  → +1 (chuỗi liên tục)
//   lastStudiedAt < yesterday   → reset về 1 (bị gián đoạn)
//   chưa có progress            → start 1
function computeStreak(
  existing: Pick<Progress, "currentStreak" | "longestStreak" | "lastStudiedAt"> | null,
  now: Date,
): { currentStreak: number; longestStreak: number } {
  if (!existing || !existing.lastStudiedAt) {
    return { currentStreak: 1, longestStreak: Math.max(1, existing?.longestStreak ?? 1) };
  }

  const todayStart = startOfDay(now);
  const yesterdayStart = new Date(todayStart.getTime() - 86_400_000);
  const lastDay = startOfDay(existing.lastStudiedAt);

  let currentStreak: number;
  if (lastDay.getTime() >= todayStart.getTime()) {
    currentStreak = existing.currentStreak; // đã học hôm nay
  } else if (lastDay.getTime() >= yesterdayStart.getTime()) {
    currentStreak = existing.currentStreak + 1; // học hôm qua → nối tiếp
  } else {
    currentStreak = 1; // bị gián đoạn → reset
  }

  return { currentStreak, longestStreak: Math.max(existing.longestStreak, currentStreak) };
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}
