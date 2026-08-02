import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "fidely_session";

// Routes that never require auth.
const PUBLIC_PATHS = ["/", "/login"];
const HIDDEN_FEATURE_PATHS = ["/influence", "/widgets"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  const isHiddenFeature = HIDDEN_FEATURE_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  // Unauthenticated → force to /login.
  if (!token && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Authenticated user hitting /login → send to dashboard.
  if (token && isPublic) {
    if (pathname === "/") return NextResponse.next();
    const url = req.nextUrl.clone();
    url.pathname = "/studio";
    return NextResponse.redirect(url);
  }

  if (token && isHiddenFeature) {
    const url = req.nextUrl.clone();
    url.pathname = "/studio";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything except Next internals, the auth API, and static assets.
  matcher: [
    "/((?!api/auth/converty|api/auth/default|api/converty/webhooks|api/evolution/webhooks|api/logout|_next/static|_next/image|favicon.ico|sw.js).*)",
  ],
};
