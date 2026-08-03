import { convertyApi, studioAppUrl } from "./converty";
import { StudioCampaignRecipient, StudioConvertyConnection, StudioCustomer, StudioInfluencerCampaign, StudioOrder } from "./models";
import { decryptSecret } from "./security";
import { reconcileOrderRewards } from "./loyalty";
import { sendDeliveryPointsUpdate } from "./evolution";

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
    price?: number;
    variant?: { name?: string; title?: string };
    product?: { _id?: string; name?: string; title?: string; cost?: number; price?: number; deliveryCost?: number; image?: string; images?: string[] };
  }[];
  total?: {
    totalPrice?: number;
    deliveryCost?: number;
    promoCode?: { couponId?: string; code?: string; discountType?: string; discountValue?: number; amount?: number; freeShipping?: boolean } | null;
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

export function sourceUpdatedAt(order: ConvertyOrder) {
  const value = new Date(order.updatedAt || order.createdAt || 0);
  return Number.isFinite(value.getTime()) ? value : new Date(0);
}

export function promoSnapshot(order: ConvertyOrder) {
  const promo = order.total?.promoCode;
  return {
    code: String(promo?.code || "").trim().toUpperCase() || null,
    couponId: promo?.couponId || null,
    discountType: promo?.discountType || null,
    discountValue: promo?.discountValue || 0,
    amount: promo?.amount || 0,
    freeShipping: Boolean(promo?.freeShipping),
  };
}

async function withRetries<T>(operation: () => Promise<T>, attempts = 3) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, attempt * 250));
    }
  }
  throw lastError;
}

export async function syncOrder(userId: string, order: ConvertyOrder, notifyCustomer = false) {
  if (!order._id || !order.customer?.phone) return false;
  const incomingUpdatedAt = sourceUpdatedAt(order);
  const existing = await StudioOrder.findOne({ user: userId, convertyOrderId: String(order._id) })
    .select("sourceUpdatedAt updatedAt").lean();
  const existingUpdatedAt = existing?.sourceUpdatedAt || existing?.updatedAt;
  if (existingUpdatedAt && new Date(existingUpdatedAt).getTime() > incomingUpdatedAt.getTime()) return false;
  const status = normalizedStatus(order);
  const delivered = deliveredAt(order);
  const placedAt = new Date(order.createdAt || Date.now());
  const promo = promoSnapshot(order);
  const promoCode = promo.code;
  const influencer = promoCode ? await StudioInfluencerCampaign.findOne({ user: userId, promoCode }).lean() : null;
  const customer = await StudioCustomer.findOneAndUpdate(
    { user: userId, phone: order.customer.phone.trim() },
    {
      $set: {
        name: order.customer.name || order.customer.phone,
        email: order.customer.email || null,
        ...(delivered ? { lastDeliveredAt: delivered } : {}),
      },
      $setOnInsert: { source: influencer ? { type: "influencer", influencer: influencer._id, code: promoCode } : { type: "direct" }, sourceFirstOrderAt: placedAt, points: 0, tier: "Member" },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  const productCost = (order.cart || []).reduce(
    (sum, item) => sum + (item.product?.cost || 0) * (item.quantity || 1),
    0
  );
  const attributedRecipient = await StudioCampaignRecipient.findOne({
    user: userId, customer: customer._id, status: { $in: ["sent", "delivered"] },
    sentAt: { $lte: placedAt, $gte: new Date(placedAt.getTime() - 14 * 86_400_000) },
  }).sort({ sentAt: -1 }).select("campaign").lean();
  const orderFilter = existing
    ? {
        _id: existing._id,
        $or: [
          { sourceUpdatedAt: { $lte: incomingUpdatedAt } },
          { sourceUpdatedAt: null },
        ],
      }
    : { user: userId, convertyOrderId: String(order._id) };
  const updated = await StudioOrder.findOneAndUpdate(
    orderFilter,
    {
      customer: customer._id,
      reference: order.reference == null ? null : String(order.reference),
      status,
      paymentStatus: order.paymentStatus || null,
      amount: order.total?.totalPrice || 0,
      cost: productCost + (order.total?.deliveryCost || 0),
      raw: { cart: order.cart || [] },
      promoCode,
      promoCouponId: promo.couponId,
      promoDiscountType: promo.discountType,
      promoDiscountValue: promo.discountValue,
      promoDiscountAmount: promo.amount,
      promoFreeShipping: promo.freeShipping,
      placedAt,
      deliveredAt: delivered,
      sourceUpdatedAt: incomingUpdatedAt,
      attributedCampaign: attributedRecipient?.campaign || null,
      attributedInfluencer: influencer?._id || null,
    },
    { upsert: !existing, new: true, setDefaultsOnInsert: true }
  );
  if (updated) {
    if (placedAt.getTime() < new Date(customer.sourceFirstOrderAt || 8640000000000000).getTime()) {
      await StudioCustomer.updateOne({ _id: customer._id }, { $set: { sourceFirstOrderAt: placedAt, source: influencer ? { type: "influencer", influencer: influencer._id, code: promoCode } : { type: "direct" } } });
    }
    const reward = await reconcileOrderRewards(userId, String(updated._id));
    if (notifyCustomer && reward.credited > 0) {
      try { await sendDeliveryPointsUpdate(userId, String(customer._id), reward.credited, String(updated._id)); }
      catch { /* Loyalty accounting must succeed even when WhatsApp is temporarily unavailable. */ }
    }
  }
  return Boolean(updated);
}

export async function syncOrdersForUser(userId: string, pageLimit = 2) {
  const connection = await StudioConvertyConnection.findOne({ user: userId });
  if (!connection) throw new Error("Converty is not connected");
  connection.lastSyncStartedAt = new Date();
  connection.lastSyncError = null;
  await connection.save();
  let synced = 0;
  let complete = false;
  const firstPage = Math.max(1, connection.syncNextPage || 1);
  try {
    const retentionDays = Math.max(30, Number(process.env.ORDER_RAW_RETENTION_DAYS) || 90);
    await StudioOrder.updateMany({ user: userId, updatedAt: { $lt: new Date(Date.now() - retentionDays * 86_400_000) } }, { $unset: { raw: 1 } });
    for (let page = firstPage; page < firstPage + Math.min(5, Math.max(1, pageLimit)); page += 1) {
      const result = await withRetries(() => convertyApi<{ data?: ConvertyOrder[] }>(
        connection as ConnectionDocument, `/orders?page=${page}&limit=200`
      ));
      const orders = result.data || [];
      for (const order of orders) if (await syncOrder(userId, order)) synced += 1;
      connection.syncNextPage = page + 1;
      if (orders.length < 200) { complete = true; connection.syncNextPage = 1; break; }
    }
    if (complete) connection.lastSyncAt = new Date();
    connection.lastSyncOrderCount = (firstPage === 1 ? 0 : connection.lastSyncOrderCount || 0) + synced;
    connection.lastSyncError = null;
    await connection.save();
    return { synced, totalSynced: connection.lastSyncOrderCount, complete, nextPage: connection.syncNextPage, lastSyncAt: connection.lastSyncAt };
  } catch (error) {
    connection.lastSyncError = error instanceof Error ? error.message.slice(0, 500) : "Synchronization failed";
    await connection.save();
    throw error;
  }
}

export async function setupWebhooksForUser(userId: string) {
  const connection = await StudioConvertyConnection.findOne({ user: userId });
  if (!connection) throw new Error("Converty is not connected");
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
