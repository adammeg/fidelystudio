import { NextRequest, NextResponse } from "next/server";
import { connectDatabase } from "@/server/db";
import { StudioLoginAttempt, StudioUser } from "@/server/models";
import { createSession, SESSION_COOKIE } from "@/server/auth";
import { hashPassword, sha256, verifyPassword } from "@/server/security";
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
    const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
    const emailHash = sha256(email);
    const ipHash = sha256(forwarded);
    const windowStart = new Date(Date.now() - 15 * 60 * 1000);
    const [emailFailures, ipFailures] = await Promise.all([
      StudioLoginAttempt.countDocuments({ emailHash, success: false, createdAt: { $gte: windowStart } }),
      StudioLoginAttempt.countDocuments({ ipHash, success: false, createdAt: { $gte: windowStart } }),
    ]);
    if (emailFailures >= 5 || ipFailures >= 25) {
      const response = NextResponse.redirect(loginUrl(req, "Too many sign-in attempts. Try again in 15 minutes."), 303);
      response.headers.set("Retry-After", "900");
      return response;
    }
    const candidates = await StudioUser.find({ email }).select("+passwordHash");
    let user = null;
    for (const candidate of candidates) {
      if (candidate.passwordHash && await verifyPassword(password, candidate.passwordHash)) {
        user = candidate;
        break;
      }
    }

    const defaultEmail = process.env.DEFAULT_USER_EMAIL?.trim().toLowerCase();
    const defaultPassword = process.env.DEFAULT_USER_PASSWORD;
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
      await StudioLoginAttempt.create({ emailHash, ipHash, success: false, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) });
      return NextResponse.redirect(loginUrl(req, "Invalid email or password."), 303);
    }

    await StudioLoginAttempt.create({ emailHash, ipHash, success: true, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) });

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
