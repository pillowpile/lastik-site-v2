import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.next();
  }

  const host = request.headers.get("host") ?? "";
  if (!host.startsWith("localhost:")) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  const port = host.split(":")[1] ?? "3000";
  url.host = `127.0.0.1:${port}`;
  return NextResponse.redirect(url, 307);
}

export const config = {
  matcher: "/:path*",
};
