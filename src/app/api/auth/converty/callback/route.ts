import { NextRequest, NextResponse } from "next/server";
import { connectDatabase } from "@/server/db";
import { StudioConvertyConnection, StudioOAuthState, StudioUser } from "@/server/models";
import {
  convertyScopes,
  convertyImageUrl,
  encryptedTokenRecord,
  exchangeAuthorizationCode,
  studioAppUrl,
  storeInfoWithToken,
} from "@/server/converty";
import { createSession, SESSION_COOKIE } from "@/server/auth";
import { decryptSecret, encryptSecret, randomToken, sha256 } from "@/server/security";
import { setupWebhooksForUser, syncOrdersForUser } from "@/server/converty-sync";

const appUrl = (path: string) =>
  new URL(path, studioAppUrl());

export async function GET(req: NextRequest) {
  const oauthError = req.nextUrl.searchParams.get("error");
  if (oauthError) {
    const url = appUrl("/login");
    url.searchParams.set("error", oauthError);
    return NextResponse.redirect(url);
  }

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  if (!code || !state) {
    const url = appUrl("/login");
    url.searchParams.set("error", "Converty returned an incomplete authorization response.");
    return NextResponse.redirect(url);
  }

  try {
    await connectDatabase();
    const consumed = await StudioOAuthState.findOneAndDelete({
      stateHash: sha256(state),
      expiresAt: { $gt: new Date() },
    });
    if (!consumed) throw new Error("The authorization request expired. Please try again.");

    const tokens = await exchangeAuthorizationCode(code);
    const store = await storeInfoWithToken(tokens.access_token);
    const ownerName =
      [store.user?.firstname, store.user?.lastname].filter(Boolean).join(" ") || null;

    const userLookup = consumed.user
      ? { _id: consumed.user }
      : { convertyStoreId: String(store._id) };
    const user = await StudioUser.findOneAndUpdate(
      userLookup,
      {
        convertyStoreId: String(store._id),
        email: store.user?.email || null,
        shopName: store.name,
        ownerName,
        logoUrl: convertyImageUrl(store.logo),
        currency: store.currency || "DZD",
        country: store.country || null,
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    const existingConnection = await StudioConvertyConnection.findOne({ user: user._id })
      .select("webhookSecret webhookSecretHash")
      .lean();
    const webhookSecret = existingConnection?.webhookSecret
      ? decryptSecret(existingConnection.webhookSecret)
      : randomToken(32);
    await StudioConvertyConnection.findOneAndUpdate(
      { user: user._id },
      {
        convertyStoreId: String(store._id),
        ...encryptedTokenRecord(tokens),
        scopes: convertyScopes(),
        storeName: store.name,
        storeSlug: store.slug || null,
        storeDomain: store.domain || null,
        currency: store.currency || "DZD",
        country: store.country || null,
        webhookSecret: encryptSecret(webhookSecret),
        webhookSecretHash: sha256(webhookSecret),
        connectedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const session = await createSession(String(user._id));
    const destination = appUrl("/settings?converty=connected");
    const setupMessages: string[] = [];
    try {
      await syncOrdersForUser(String(user._id));
    } catch (syncError) {
      setupMessages.push(
        syncError instanceof Error
          ? `Initial order sync needs attention: ${syncError.message}`
          : "Initial order sync needs attention."
      );
    }
    try {
      if (convertyScopes().includes("create-hooks")) {
        await setupWebhooksForUser(String(user._id));
      }
    } catch (setupError) {
      setupMessages.push(
        setupError instanceof Error
          ? `Webhook setup needs attention: ${setupError.message}`
          : "Webhook setup needs attention."
      );
    }
    if (setupMessages.length) {
      destination.searchParams.set(
        "message",
        `Connected. ${setupMessages.join(" ")}`
      );
    }
    const res = NextResponse.redirect(destination);
    res.cookies.set(SESSION_COOKIE, session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });
    return res;
  } catch (error) {
    const url = appUrl("/login");
    url.searchParams.set(
      "error",
      error instanceof Error ? error.message : "Could not complete Converty authorization."
    );
    return NextResponse.redirect(url);
  }
}
