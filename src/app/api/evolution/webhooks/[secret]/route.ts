import { NextRequest, NextResponse } from "next/server";
import { connectDatabase } from "@/server/db";
import { StudioCampaignRecipient, StudioWhatsAppConnection } from "@/server/models";
import { sha256 } from "@/server/security";
import { evolutionConnectionState } from "@/server/evolution";

export async function POST(request: NextRequest, context: { params: Promise<{ secret: string }> }) {
  await connectDatabase();
  const { secret } = await context.params;
  const connection = await StudioWhatsAppConnection.findOne({ webhookSecretHash: sha256(secret) });
  if (!connection) return NextResponse.json({ message: "Invalid webhook" }, { status: 401 });
  const payload = await request.json().catch(() => ({}));
  const event = String(payload.event || "").toLowerCase().replaceAll("_", ".");
  connection.lastWebhookAt = new Date();
  if (event.includes("connection")) {
    connection.status = evolutionConnectionState(payload.data?.state ?? payload.data?.status ?? payload.state);
    connection.lastStatusAt = new Date();
    if (connection.status === "connected" && !connection.connectedAt) connection.connectedAt = new Date();
  }
  await connection.save();
  if (event.includes("message") && event.includes("update")) {
    const messageId = payload.data?.key?.id ?? payload.data?.id;
    const status = String(payload.data?.status ?? payload.data?.update?.status ?? "").toLowerCase();
    if (messageId && ["delivery_ack", "delivered", "read", "played"].includes(status)) {
      await StudioCampaignRecipient.updateOne({ user: connection.user, providerMessageId: messageId }, { $set: { status: "delivered", deliveredAt: new Date() } });
    }
  }
  return NextResponse.json({ received: true });
}
