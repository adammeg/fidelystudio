import { cookies } from "next/headers";
import { connectDatabase } from "./db";
import { StudioSession, StudioUser } from "./models";
import { randomToken, sha256 } from "./security";

export const SESSION_COOKIE = "fidely_session";
const SESSION_MS = 30 * 24 * 60 * 60 * 1000;

export async function createSession(userId: string) {
  await connectDatabase();
  const token = randomToken(32);
  await StudioSession.create({
    tokenHash: sha256(token),
    user: userId,
    expiresAt: new Date(Date.now() + SESSION_MS),
  });
  return token;
}

export async function getSessionUser(token?: string | null) {
  await connectDatabase();
  const value = token || (await cookies()).get(SESSION_COOKIE)?.value;
  if (!value) return null;
  const session = await StudioSession.findOne({
    tokenHash: sha256(value),
    expiresAt: { $gt: new Date() },
  }).lean();
  if (!session) return null;
  return StudioUser.findById(session.user).lean();
}

export async function deleteSession(token?: string | null) {
  await connectDatabase();
  const value = token || (await cookies()).get(SESSION_COOKIE)?.value;
  if (value) await StudioSession.deleteOne({ tokenHash: sha256(value) });
}
