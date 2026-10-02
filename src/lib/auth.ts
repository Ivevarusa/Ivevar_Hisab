import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@prisma/client";
import { authSecret } from "./env";

const COOKIE = "session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export type SessionUser = { id: string; name: string; role: Role };

function secret() {
  const s = authSecret();
  if (!s || s.length < 32) throw new Error("AUTH_SECRET (or SUPABASE_JWT_SECRET) must be set, 32+ characters");
  return new TextEncoder().encode(s);
}

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({ name: user.name, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE,
    path: "/",
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export async function getSession(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return { id: payload.sub as string, name: payload.name as string, role: payload.role as Role };
  } catch {
    return null;
  }
}

/** Returns the signed-in user, or redirects to login. With roles, redirects home if the role is not allowed. */
export async function requireUser(roles?: Role[]): Promise<SessionUser> {
  const user = await getSession();
  if (!user) redirect("/login");
  if (roles && !roles.includes(user.role)) redirect("/");
  return user;
}
