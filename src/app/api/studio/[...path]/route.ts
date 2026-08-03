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

function csvCell(value: unknown) {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
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
    if (endpoint === "customers/export") {
      const params = new URLSearchParams(req.nextUrl.searchParams);
      params.set("limit", "200");
      params.set("page", "1");
      let data = await studioGet(user, "customers", params) as {
        customers: Array<Record<string, unknown>>;
        currency: string;
        pages: number;
      };
      const allCustomers = [...data.customers];
      for (let page = 2; page <= data.pages; page += 1) {
        params.set("page", String(page));
        const next = await studioGet(user, "customers", params) as typeof data;
        allCustomers.push(...next.customers);
      }
      data = { ...data, customers: allCustomers };
      const headers = ["Name", "Phone", "Email", "Source", "Placed", "Delivered", "Refused", `Revenue (${data.currency})`, "Points", "Tier", "First delivered", "Last delivered"];
      const rows = data.customers.map((customer) => [
        customer.name, customer.phone, customer.email,
        (customer.source as { type?: string } | undefined)?.type || "direct",
        customer.placed, customer.delivered, customer.refused, customer.spent,
        customer.points, customer.tier, customer.firstDeliveredAt, customer.lastDeliveredAt,
      ]);
      const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
      return new NextResponse(`\uFEFF${csv}`, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="fidely-customers-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }
    if (endpoint === "account/export") {
      const data = await studioGet(user, endpoint, req.nextUrl.searchParams);
      return new NextResponse(JSON.stringify(data, null, 2), {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="fidely-account-${new Date().toISOString().slice(0, 10)}.json"`,
        },
      });
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
    const endpoint = path.join("/");
    const response = NextResponse.json(await studioMutate(user, endpoint, method, body));
    if (endpoint === "account" && method === "DELETE") response.cookies.delete("fidely_session");
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}

export const POST = (req: NextRequest, context: Context) => mutation(req, context, "POST");
export const PUT = (req: NextRequest, context: Context) => mutation(req, context, "PUT");
export const PATCH = (req: NextRequest, context: Context) => mutation(req, context, "PATCH");
export const DELETE = (req: NextRequest, context: Context) => mutation(req, context, "DELETE");
