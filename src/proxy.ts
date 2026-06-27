import { NextRequest, NextResponse } from "next/server";

import { ADMIN_COOKIE_NAME, ADMIN_LOGIN_PATH } from "@/lib/admin-auth";

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  if (pathname === ADMIN_LOGIN_PATH || pathname === "/admin/auth") {
    return NextResponse.next();
  }

  if (pathname === "/admin/logout") {
    return NextResponse.next();
  }

  const accessCookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (accessCookie === "1") {
    return NextResponse.next();
  }

  const loginUrl = new URL(ADMIN_LOGIN_PATH, request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
