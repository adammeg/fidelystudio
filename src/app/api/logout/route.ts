import { NextResponse } from "next/server";
import { deleteSession, SESSION_COOKIE } from "@/server/auth";

export async function POST(req: Request) {
  await deleteSession();
  const res = NextResponse.redirect(new URL("/login", req.url));
  res.cookies.set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  return res;
}
