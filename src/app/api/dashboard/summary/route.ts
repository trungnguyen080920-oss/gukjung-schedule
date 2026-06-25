// GET /api/dashboard/summary
// Auth: JWT (Authorization: Bearer <jwt>)
// Returns: { user, subjects: [{subject, progress, recentSessions}], stats }
import { verifyJwt, extractBearer } from "@/lib/auth";
import { getDashboardSummary } from "@/modules/progress/application/get-dashboard-summary.usecase";

export async function GET(request: Request) {
  const raw = extractBearer(request.headers.get("authorization"));
  if (!raw) {
    return Response.json(
      { error: "JWT bắt buộc: Authorization: Bearer <token>" },
      { status: 401 },
    );
  }

  let claims;
  try {
    claims = await verifyJwt(raw);
  } catch {
    return Response.json({ error: "JWT không hợp lệ hoặc đã hết hạn" }, { status: 401 });
  }

  try {
    const data = await getDashboardSummary(claims.userId);
    return Response.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Lỗi không xác định";
    return Response.json({ error: message }, { status: 500 });
  }
}
