import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const redirectTo = url.searchParams.get("redirect_to");
  const target = new URL("/api/auth/google", request.url);

  if (redirectTo) {
    target.searchParams.set("redirect_to", redirectTo);
  }

  return NextResponse.redirect(target);
}
