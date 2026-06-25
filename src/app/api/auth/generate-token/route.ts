// POST /api/auth/generate-token
// Yêu cầu JWT (Authorization: Bearer <jwt>)
// Tạo/thay thế API Token dùng cho Watcher Python.
// Returns: { apiToken: string, hint: string }
import { randomUUID } from "crypto";
import { verifyJwt, extractBearer } from "@/lib/auth";
import { userRepository } from "@/modules/users/infrastructure/user.repository";

export async function POST(request: Request) {
  const raw = extractBearer(request.headers.get("authorization"));
  if (!raw) {
    return Response.json({ error: "Yêu cầu JWT: Authorization: Bearer <token>" }, { status: 401 });
  }

  let claims;
  try {
    claims = await verifyJwt(raw);
  } catch {
    return Response.json({ error: "JWT không hợp lệ hoặc đã hết hạn" }, { status: 401 });
  }

  // Tạo token mới (thay thế token cũ nếu có)
  const apiToken = randomUUID().replace(/-/g, "");
  await userRepository.updateApiToken(claims.userId, apiToken);

  return Response.json({
    apiToken,
    hint: "Lưu token này vào biến môi trường POLYGLOT_API_TOKEN của Watcher Python. Token cũ đã bị vô hiệu hóa.",
  });
}
