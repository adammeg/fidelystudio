export const FIDELY_MONTHLY_PRICE = { amount: 50, currency: "TND", interval: "month" } as const;

export const FIDELY_ENTITLEMENTS = {
  customerLimit: Number.MAX_SAFE_INTEGER,
  stores: 1,
  csvExport: true,
  campaigns: true,
  teamMembers: 1,
} as const;

export function effectiveSubscription(status: string, trialEndsAt: Date | string) {
  if (status === "active") return "active" as const;
  if (status === "trialing" && new Date(trialEndsAt).getTime() > Date.now()) return "trialing" as const;
  return "restricted" as const;
}
