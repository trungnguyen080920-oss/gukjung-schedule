import { SignJWT, jwtVerify, type JWTPayload } from "jose";

export interface JwtClaims extends JWTPayload {
  userId: string;
  role: string;
}

function getSecret(): Uint8Array {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET is not set in environment variables");
  return new TextEncoder().encode(s);
}

export async function signJwt(claims: { userId: string; role: string }): Promise<string> {
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verifyJwt(token: string): Promise<JwtClaims> {
  const { payload } = await jwtVerify(token, getSecret());
  return payload as JwtClaims;
}

// Trích token từ header "Authorization: Bearer <token>"
export function extractBearer(authHeader: string | null): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  return token.length > 0 ? token : null;
}
