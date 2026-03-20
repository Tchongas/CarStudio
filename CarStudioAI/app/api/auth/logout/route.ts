import { NextResponse } from "next/server";
import { HUB_SESSION_COOKIE_NAME } from "@/lib/auth/hub-handoff";

export async function POST() {
  const response = NextResponse.json({ ok: true });

  response.cookies.set(HUB_SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
