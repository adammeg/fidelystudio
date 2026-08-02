import { NextRequest, NextResponse } from "next/server";
import { connectDatabase } from "@/server/db";
import { syncAllConnectedStores } from "@/server/converty-sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  await connectDatabase();
  const result = await syncAllConnectedStores(2);
  return NextResponse.json({ success: result.failed === 0, ...result });
}
