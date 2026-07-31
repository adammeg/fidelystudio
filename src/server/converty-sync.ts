import { convertyApi, studioAppUrl } from "./converty";
import { StudioConvertyConnection, StudioCustomer, StudioOrder } from "./models";
import { decryptSecret } from "./security";

export type ConvertyOrder = {
  _id: string;
  reference?: string | number;
  status?: string;
  paymentStatus?: string;
  archived?: boolean;
  customer?: {
    name?: string;
    phone?: string;
    email?: string;
  };
  cart?: {
    quantity?: number;
    product?: { cost?: number; deliveryCost?: number };
  }[];
  total?: {
    totalPrice?: number;
    deliveryCost?: number;
  };
  history?: { status?: string; timestamp?: number }[];
  createdAt?: string;
  updatedAt?: string;
};

type ConnectionDocument = InstanceType<typeof StudioConvertyConnection>;

export function normalizedStatus(order: ConvertyOrder) {
  if (order.archived) return "cancelled";
  const value = (order.status || "placed").toLowerCase();
  if (value === "rejected") return "refused";
  if (value === "in transit") return "in_transit";
  return value;
}

export function deliveredAt(order: ConvertyOrder) {
  const entry = [...(order.history || [])].reverse().find((item) => item.status === "delivered");
  if (entry?.timestamp) return new Date(entry.timestamp);
  return normalizedStatus(order) === "delivered"
    ? new Date(order.updatedAt || Date.now())
    : null;
}

export async function syncOrder(userId: string, order: ConvertyOrder) {
  if (!order._id || !order.customer?.phone) return false;
  const status = normalizedStatus(order);
  const delivered = deliveredAt(order);
  const customer = await StudioCustomer.findOneAndUpdate(
    { user: userId, phone: order.customer.phone.trim() },
    {
      $set: {
        name: order.customer.name || order.customer.phone,
        email: order.customer.email || null,
        ...(delivered ? { lastDeliveredAt: delivered } : {}),
      },
      $setOnInsert: { source: { type: "direct" }, points: 0, tier: "Member" },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  const productCost = (order.cart || []).reduce(
    (sum, item) => sum + (item.product?.cost || 0) * (item.quantity || 1),
    0
  );
  await StudioOrder.findOneAndUpdate(
    { user: userId, convertyOrderId: String(order._id) },
    {
      customer: customer._id,
      reference: order.reference == null ? null : String(order.reference),
      status,
      paymentStatus: order.paymentStatus || null,
      amount: order.total?.totalPrice || 0,
      cost: productCost + (order.total?.deliveryCost || 0),
      raw: order,
      placedAt: new Date(order.createdAt || Date.now()),
      deliveredAt: delivered,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return true;
}

export async function syncOrdersForUser(userId: string, maxPages = 20) {
  const connection = await StudioConvertyConnection.findOne({ user: userId });
  if (!connection) throw new Error("Converty is not connected");
  let synced = 0;
  for (let page = 1; page <= maxPages; page += 1) {
    const result = await convertyApi<{ data?: ConvertyOrder[] }>(
      connection as ConnectionDocument,
      `/orders?page=${page}&limit=200`
    );
    const orders = result.data || [];
    for (const order of orders) {
      if (await syncOrder(userId, order)) synced += 1;
    }
    if (orders.length < 200) break;
  }
  connection.lastSyncAt = new Date();
  await connection.save();
  return { synced, lastSyncAt: connection.lastSyncAt };
}

export async function setupWebhooksForUser(userId: string) {
  const connection = await StudioConvertyConnection.findOne({ user: userId });
  if (!connection) throw new Error("Converty is not connected");
  const required = ["read-hooks", "create-hooks", "delete-hooks"];
  if (!required.every((scope) => connection.scopes.includes(scope))) {
    throw Object.assign(
      new Error("Webhook access is not enabled for this Converty integration"),
      { status: 403 }
    );
  }
  const base = studioAppUrl();
  const targetUrl = `${base}/api/converty/webhooks/${decryptSecret(connection.webhookSecret)}`;
  const result = await convertyApi<{
    data?: { _id: string; targetUrl: string; event: string }[];
  }>(connection as ConnectionDocument, "/hooks");
  const existing = result.data || [];
  const ids = existing
    .filter((hook) => hook.targetUrl === targetUrl && ["order.create", "order.update"].includes(hook.event))
    .map((hook) => String(hook._id));

  for (const event of ["order.create", "order.update"]) {
    if (existing.some((hook) => hook.targetUrl === targetUrl && hook.event === event)) continue;
    try {
      const created = await convertyApi<{ data?: { _id?: string } }>(
        connection as ConnectionDocument,
        "/hooks/subscribe",
        { method: "POST", body: { targetUrl, event } }
      );
      if (created.data?._id) ids.push(String(created.data._id));
    } catch (error) {
      if (!(error instanceof Error && "status" in error && error.status === 409)) throw error;
    }
  }
  connection.webhookIds = [...new Set(ids)];
  await connection.save();
  return { webhooksActive: connection.webhookIds.length === 2 };
}

export async function teardownWebhooksForUser(userId: string) {
  const connection = await StudioConvertyConnection.findOne({ user: userId });
  if (!connection) return;
  for (const hookId of connection.webhookIds || []) {
    try {
      await convertyApi(connection as ConnectionDocument, `/hooks/unsubscribe/${hookId}`, {
        method: "DELETE",
      });
    } catch {
      // Disconnect must remain possible if Converty already removed a hook.
    }
  }
  connection.webhookIds = [];
  await connection.save();
}
