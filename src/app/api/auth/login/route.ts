// POST /api/auth/login
// Body: { email: string, password: string }
// Returns: { token: string, user: {...} }
import { compare } from "bcryptjs";
import { signJwt, extractBearer } from "@/lib/auth";
import { userRepository } from "@/modules/users/infrastructure/user.repository";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { email?: string; password?: string } | null;

  if (!body?.email || !body?.password) {
    return Response.json({ error: "email và password là bắt buộc" }, { status: 400 });
  }

  const user = await userRepository.findByEmail(body.email);

  // Giữ thời gian phản hồi nhất quán để tránh timing attack
  const dummyHash = "$2a$12$dummyhashtopreventtimingattack0000000000000000000000";
  const valid = user
    ? await compare(body.password, user.passwordHash)
    : (await compare(body.password, dummyHash), false);

  if (!user || !valid) {
    return Response.json({ error: "Email hoặc mật khẩu không đúng" }, { status: 401 });
  }

  const token = await signJwt({ userId: user.id, role: user.role });

  return Response.json({
    token,
    expiresIn: "7d",
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
}

// Chặn các method khác
export async function GET() {
  return Response.json({ error: "Method not allowed" }, { status: 405 });
}
