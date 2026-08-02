import { NextRequest, NextResponse } from "next/server";
import { connectDatabase } from "@/server/db";
import { StudioUser } from "@/server/models";
import { createSession, SESSION_COOKIE } from "@/server/auth";
import { hashPassword, verifyPassword } from "@/server/security";
import { ensureSubscription } from "@/server/subscriptions";

function loginUrl(req: NextRequest, error?: string) {
  const url = new URL("/login", req.url);
  if (error) url.searchParams.set("error", error);
  return url;
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const email = String(form.get("email") || "").trim().toLowerCase();
  const password = String(form.get("password") || "");
  if (!email || !password) {
    return NextResponse.redirect(loginUrl(req, "Email and password are required."), 303);
  }

  try {
    await connectDatabase();
    let user = await StudioUser.findOne({ email }).select("+passwordHash");

    const defaultEmail = process.env.DEFAULT_USER_EMAIL?.trim().toLowerCase();
    const defaultPassword = process.env.DEFAULT_USER_PASSWORD;
    const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!user && email === adminEmail && password === adminPassword) {
      user = await StudioUser.create({
        convertyStoreId: "local:admin",
        email,
        shopName: "Fidely Administration",
        ownerName: "Administrator",
        role: "admin",
        passwordHash: await hashPassword(password),
      });
    }
    if (!user && email === defaultEmail && password === defaultPassword) {
      user = await StudioUser.create({
        convertyStoreId: "local:default",
        email,
        shopName: process.env.DEFAULT_USER_SHOP_NAME || "Fidely Demo Store",
        ownerName: "Fidely Studio",
        passwordHash: await hashPassword(password),
      });
    }

    if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.redirect(loginUrl(req, "Invalid email or password."), 303);
    }

    if (user.role !== "admin") await ensureSubscription(String(user._id));

    const token = await createSession(String(user._id));
    const response = NextResponse.redirect(new URL(user.role === "admin" ? "/admin" : "/studio", req.url), 303);
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });
    return response;
  } catch {
    return NextResponse.redirect(loginUrl(req, "Could not sign in. Check the database connection."), 303);
  }
}
