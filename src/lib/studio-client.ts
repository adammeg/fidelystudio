/** Client-side mutations via the authenticated /api/studio proxy. */

async function mutate<T>(path: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api/studio/${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
  return data as T;
}

export function markInfluencerPaid(influencerId: string) {
  return mutate(`influencers/${influencerId}/payout`, "POST", { markPaid: true });
}

export function createInfluencer(payload: {
  handle: string;
  platform: string;
  code: string;
  link?: string;
  commissionPct?: number;
}) {
  return mutate<{ influencer: { _id?: string; id?: string } }>("influencers", "POST", payload);
}

export function updateCampaign(slug: string, payload: { budget?: number; addInfluencerIds?: string[] }) {
  return mutate(`campaigns/${encodeURIComponent(slug)}`, "PATCH", payload);
}

export function saveCustomerNote(customerId: string, note: string) {
  return mutate(`customers/${customerId}`, "PUT", { note: note || null });
}

export function setupConvertyWebhooks() {
  return mutate("converty/webhooks/setup", "POST", {});
}

export function syncConvertyOrders() {
  return mutate("converty/sync", "POST", {});
}
