import { NextResponse } from "next/server";
import { connectDatabase } from "@/server/db";
import { StudioOAuthState } from "@/server/models";
import { authorizationUrl } from "@/server/converty";
import { randomToken, sha256 } from "@/server/security";
import { getSessionUser } from "@/server/auth";

export async function GET() {
  try {
    await connectDatabase();
    const state = randomToken(32);
    const user = await getSessionUser().catch(() => null);
    await StudioOAuthState.create({
      stateHash: sha256(state),
      user: user?._id || null,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });
    return NextResponse.redirect(authorizationUrl(state));
  } catch (error) {
    const url = new URL("/login", process.env.STUDIO_APP_URL || "http://localhost:3000");
    url.searchParams.set(
      "error",
      error instanceof Error ? error.message : "Converty sign-in is unavailable"
    );
    return NextResponse.redirect(url);
  }
}
