import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAMES, ROUTES } from "@/constants";

const PROTECTED_PATHS = [
  "/dashboard", "/users", "/enterprise", "/plans", "/offers",
  "/credits", "/reports", "/expiry", "/settings", "/activity-logs",
  "/live-chat", "/tickets",
];
const AUTH_ONLY_PATHS = ["/login"];

function isProtected(pathname: string) {
  return PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
function isAuthOnly(pathname: string) {
  return AUTH_ONLY_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get(COOKIE_NAMES.SESSION_TOKEN)?.value;
  const accessToken = request.cookies.get(COOKIE_NAMES.ACCESS_TOKEN)?.value;
  const isAuthenticated = !!(sessionToken || accessToken);

  if (isProtected(pathname) && !isAuthenticated) {
    return NextResponse.redirect(new URL(ROUTES.LOGIN, request.url));
  }
  if (isAuthOnly(pathname) && isAuthenticated) {
    return NextResponse.redirect(new URL(ROUTES.DASHBOARD, request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
