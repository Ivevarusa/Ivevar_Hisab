import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC = ["/login", "/manifest.webmanifest", "/icon", "/apple-icon"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const token = req.cookies.get("session")?.value;
  if (token) {
    try {
      await jwtVerify(token, new TextEncoder().encode(process.env.AUTH_SECRET));
      return NextResponse.next();
    } catch {}
  }
  return NextResponse.redirect(new URL("/login", req.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|icon-192.png|icon-512.png).*)"],
};
