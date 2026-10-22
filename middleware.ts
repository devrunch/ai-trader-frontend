import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { safeNextPath } from "@/lib/safe-next";

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get("access_token")?.value;

  const isDashboard = pathname.startsWith("/dashboard");

  if (isDashboard && !token) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    // Where they were actually going, carried through the sign-in. A shared
    // terminal link puts the symbol in its query string, and sending them to
    // a bare /dashboard/terminal afterwards opened the default symbol --
    // every shared link landed on AAPL.
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  if ((pathname === "/login" || pathname === "/register") && token) {
    // Already signed in and still holding a destination: go there rather
    // than to the generic landing page.
    const next = safeNextPath(request.nextUrl.searchParams.get("next"));
    return NextResponse.redirect(new URL(next ?? "/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/).*)"],
};
