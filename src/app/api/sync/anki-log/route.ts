// POST /api/sync/anki-log
// Auth: API Token (Authorization: Bearer <apiToken>)
// Body: { batchId?, subjectCode, noteCount, cardCount?, layer?, durationSec? }
// Returns: { ok: true, skipped?: true } | { ok: true, session, progress }
//
// Idempotent: gửi cùng batchId nhiều lần → chỉ xử lý 1 lần, các lần sau trả skipped.
import { extractBearer } from "@/lib/auth";
import { userRepository } from "@/modules/users/infrastructure/user.repository";
import { syncAnkiLog } from "@/modules/progress/application/sync-anki-log.usecase";

interface SyncBody {
  batchId?: string;
  subjectCode?: string;
  noteCount?: number;
  cardCount?: number;
  layer?: string;
  durationSec?: number;
}

export async function POST(request: Request) {
  // ── Xác thực API Token ──────────────────────────────────────────────────
  const raw = extractBearer(request.headers.get("authorization"));
  if (!raw) {
    return Response.json(
      { error: "API Token bắt buộc: Authorization: Bearer <apiToken>" },
      { status: 401 },
    );
  }

  const user = await userRepository.findByApiToken(raw);
  if (!user) {
    return Response.json({ error: "API Token không hợp lệ" }, { status: 401 });
  }

  // ── Validate body ───────────────────────────────────────────────────────
  const body = await request.json().catch(() => null) as SyncBody | null;
  if (!body?.subjectCode || typeof body.noteCount !== "number") {
    return Response.json(
      { error: "subjectCode (string) và noteCount (number) là bắt buộc" },
      { status: 400 },
    );
  }

  // ── Thực thi use-case ───────────────────────────────────────────────────
  try {
    const result = await syncAnkiLog({
      batchId: body.batchId,
      subjectCode: body.subjectCode,
      noteCount: body.noteCount,
      cardCount: body.cardCount,
      layer: body.layer,
      durationSec: body.durationSec,
      userId: user.id,
    });

    if (result.skipped) {
      return Response.json({
        ok: true,
        skipped: true,
        message: `Batch "${body.batchId}" đã được xử lý trước đó — bỏ qua để tránh trùng số liệu.`,
      });
    }

    return Response.json({ ok: true, session: result.session, progress: result.progress });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Lỗi không xác định";
    return Response.json({ error: message }, { status: 422 });
  }
}
