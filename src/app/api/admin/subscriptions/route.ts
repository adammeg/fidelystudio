import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth";
import { setMerchantSubscription } from "@/server/admin-service";

export async function POST(req: NextRequest) {
  try {
    const admin = await getSessionUser();
    if (!admin) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const merchantId = String(body.merchantId || "");
    if (!mongoose.isValidObjectId(merchantId) || typeof body.active !== "boolean") {
      return NextResponse.json({ message: "Invalid subscription request" }, { status: 400 });
    }
    return NextResponse.json(await setMerchantSubscription(String(admin._id), merchantId, body.active, body.active ? { method: body.method, reference: String(body.reference || ""), amount: Number(body.amount), note: String(body.note || "") } : undefined));
  } catch (error) {
    const status = error instanceof Error && "status" in error && typeof error.status === "number" ? error.status : 500;
    return NextResponse.json({ message: error instanceof Error ? error.message : "Request failed" }, { status });
  }
}
