import "server-only";
import { redirect } from "next/navigation";
import { getSessionUser as getStoredSessionUser } from "@/server/auth";

export interface SessionUser {
  id: string;
  role: "shop" | "client" | "admin";
  email: string;
  shopName: string | null;
  ownerName: string | null;
  logoUrl: string | null;
  loyaltyType: "points" | "stamps";
  pointsPerPurchase: number;
  redeemThreshold: number;
}

/** Reads the bearer token from the httpOnly session cookie (server only). */
export async function getToken(): Promise<string | null> {
  const { cookies } = await import("next/headers");
  const jar = await cookies();
  return jar.get("fidely_session")?.value ?? null;
}

/** Returns the token or redirects to /login when missing. */
export async function requireToken(): Promise<string> {
  const token = await getToken();
  if (!token) redirect("/login");
  return token;
}

/** Loads the authenticated user; redirects to /login if the token is invalid. */
export async function getSessionUser(): Promise<SessionUser> {
  const user = await getStoredSessionUser();
  if (!user) redirect("/login");
  return {
    id: String(user._id),
    role: "shop",
    email: user.email || "",
    shopName: user.shopName || null,
    ownerName: user.ownerName || null,
    logoUrl: user.logoUrl || null,
    loyaltyType: "points",
    pointsPerPurchase: 10,
    redeemThreshold: 100,
  };
}
