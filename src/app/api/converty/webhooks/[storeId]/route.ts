import { NextRequest, NextResponse } from "next/server";
import { connectDatabase } from "@/server/db";
import { StudioConvertyConnection } from "@/server/models";
import { syncOrder } from "@/server/converty-sync";
import { sha256 } from "@/server/security";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  await connectDatabase();
  const { storeId } = await params;
  const connection = await StudioConvertyConnection.findOne({
    webhookSecretHash: sha256(storeId),
  }).lean();
  if (!connection) {
    return NextResponse.json({ success: false, message: "Store not connected" }, { status: 404 });
  }
  const body = await req.json().catch(() => null);
  const event = body?.event || "order.update";
  if (!["order.create", "order.update"].includes(event)) {
    return NextResponse.json({ success: false, message: "Unsupported event" }, { status: 400 });
  }
  const order = body?.data?.order || body?.order || body?.data || body;
  const synced = await syncOrder(String(connection.user), order);
  return NextResponse.json({ success: true, synced });
}
