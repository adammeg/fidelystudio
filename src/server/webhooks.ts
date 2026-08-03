import { NextRequest } from "next/server";
import { sha256 } from "./security";
import { StudioWebhookEvent } from "./models";

export async function registerWebhookEvent(provider: "converty" | "evolution", request: NextRequest, rawBody: string) {
  const timestampValue = request.headers.get("x-webhook-timestamp") || request.headers.get("x-timestamp");
  if (timestampValue) {
    const timestamp = /^\d+$/.test(timestampValue) ? Number(timestampValue) * (timestampValue.length <= 10 ? 1000 : 1) : new Date(timestampValue).getTime();
    if (!Number.isFinite(timestamp) || Math.abs(Date.now() - timestamp) > 5 * 60 * 1000) {
      throw Object.assign(new Error("Webhook timestamp is outside the accepted window"), { status: 401 });
    }
  }
  const providerId = request.headers.get("x-webhook-id") || request.headers.get("x-event-id") || request.headers.get("webhook-id");
  const eventKey = providerId ? sha256(providerId) : sha256(rawBody);
  try {
    const record = await StudioWebhookEvent.create({ provider, eventKey, expiresAt: new Date(Date.now() + 30 * 86_400_000) });
    return { duplicate: false, id: record._id };
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === 11000) return { duplicate: true, id: null };
    throw error;
  }
}

export async function completeWebhookEvent(id: unknown) {
  if (id) await StudioWebhookEvent.updateOne({ _id: id }, { $set: { processedAt: new Date() } });
}
export async function releaseWebhookEvent(id: unknown) {
  if (id) await StudioWebhookEvent.deleteOne({ _id: id, processedAt: null });
}
