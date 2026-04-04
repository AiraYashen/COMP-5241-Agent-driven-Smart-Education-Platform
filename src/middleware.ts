import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default auth((req: NextRequest & { auth: any }) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const role: string | undefined = session?.user?.role;

  // Public routes
  const publicPaths = ["/login", "/api/auth", "/api/audio-proxy", "/api/chat", "/api/lesson", "/api/simplify", "/lesson"];
  if (publicPaths.some((p) => pathname.startsWith(p))) return NextResponse.next();

  // Root redirect based on role
  if (pathname === "/") {
    if (!session) return NextResponse.redirect(new URL("/login", req.url));
    if (role === "ADMIN") return NextResponse.redirect(new URL("/admin/dashboard", req.url));
    if (role === "TEACHER") return NextResponse.redirect(new URL("/teacher/schedule", req.url));
    return NextResponse.redirect(new URL("/student/schedule", req.url));
  }

  // Require auth
  if (!session) return NextResponse.redirect(new URL("/login", req.url));

  // RBAC
  if (pathname.startsWith("/admin") && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (pathname.startsWith("/teacher") && role !== "TEACHER" && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (pathname.startsWith("/student") && role !== "STUDENT" && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
