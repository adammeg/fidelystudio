import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth";
import { studioGet } from "@/server/studio-service";
import { studioMutate } from "@/server/studio-mutations";

type Context = { params: Promise<{ path: string[] }> };

function errorResponse(error: unknown) {
  const status =
    error instanceof Error && "status" in error && typeof error.status === "number"
      ? error.status
      : 500;
  return NextResponse.json(
    { message: error instanceof Error ? error.message : "Request failed" },
    { status }
  );
}

async function userId() {
  const user = await getSessionUser();
  return user ? String(user._id) : null;
}

export async function GET(req: NextRequest, context: Context) {
  try {
    const user = await userId();
    if (!user) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
    const { path } = await context.params;
    const endpoint = path.join("/");
    if (endpoint === "converty/connect-url") {
      return NextResponse.json({ url: "/api/auth/converty/start" });
    }
    return NextResponse.json(await studioGet(user, endpoint, req.nextUrl.searchParams));
  } catch (error) {
    return errorResponse(error);
  }
}

async function mutation(req: NextRequest, context: Context, method: string) {
  try {
    const user = await userId();
    if (!user) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
    const { path } = await context.params;
    const body = await req.json().catch(() => ({}));
    return NextResponse.json(await studioMutate(user, path.join("/"), method, body));
  } catch (error) {
    return errorResponse(error);
  }
}

export const POST = (req: NextRequest, context: Context) => mutation(req, context, "POST");
export const PUT = (req: NextRequest, context: Context) => mutation(req, context, "PUT");
export const PATCH = (req: NextRequest, context: Context) => mutation(req, context, "PATCH");
export const DELETE = (req: NextRequest, context: Context) => mutation(req, context, "DELETE");
