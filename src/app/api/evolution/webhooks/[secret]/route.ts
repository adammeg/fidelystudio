import { NextRequest, NextResponse } from "next/server";
import { connectDatabase } from "@/server/db";
import { StudioCampaign, StudioCampaignRecipient, StudioWhatsAppConnection } from "@/server/models";
import { sha256 } from "@/server/security";
import { evolutionConnectionState, processMessageOutbox, sendCampaignBatch } from "@/server/evolution";
import { completeWebhookEvent, registerWebhookEvent, releaseWebhookEvent } from "@/server/webhooks";

export async function POST(request: NextRequest, context: { params: Promise<{ secret: string }> }) {
  await connectDatabase();
  const { secret } = await context.params;
  const connection = await StudioWhatsAppConnection.findOne({ webhookSecretHash: sha256(secret) });
  if (!connection) return NextResponse.json({ message: "Invalid webhook" }, { status: 401 });
  const rawBody = await request.text();
  let payload;
  try { payload = JSON.parse(rawBody || "{}"); } catch { return NextResponse.json({ message: "Invalid JSON" }, { status: 400 }); }
  const registration = await registerWebhookEvent("evolution", request, rawBody);
  if (registration.duplicate) return NextResponse.json({ received: true, duplicate: true });
  try {
  const event = String(payload.event || "").toLowerCase().replaceAll("_", ".");
  connection.lastWebhookAt = new Date();
  if (event.includes("connection")) {
    connection.status = evolutionConnectionState(payload.data?.state ?? payload.data?.status ?? payload.state);
    connection.lastStatusAt = new Date();
    if (connection.status === "connected" && !connection.connectedAt) connection.connectedAt = new Date();
    if (connection.status === "connected") await processMessageOutbox(String(connection.user), 10);
  }
  await connection.save();
  if (event.includes("message") && event.includes("update")) {
    const messageId = payload.data?.key?.id ?? payload.data?.id;
    const status = String(payload.data?.status ?? payload.data?.update?.status ?? "").toLowerCase();
    if (messageId && ["delivery_ack", "delivered", "read", "played"].includes(status)) {
      await StudioCampaignRecipient.updateOne({ user: connection.user, providerMessageId: messageId }, { $set: { status: "delivered", deliveredAt: new Date() } });
    }
  }
  if (event.includes("send.message") || event.includes("sendmessage")) {
    const campaign = await StudioCampaign.findOne({ user: connection.user, state: "sending" }).sort({ updatedAt: 1 }).lean();
    if (campaign) await sendCampaignBatch(String(connection.user), campaign.slug, 1);
    await processMessageOutbox(String(connection.user), 3);
  }
    await completeWebhookEvent(registration.id);
    return NextResponse.json({ received: true });
  } catch (error) {
    await releaseWebhookEvent(registration.id);
    return NextResponse.json({ message: error instanceof Error ? error.message : "Webhook processing failed" }, { status: 500 });
  }
}
