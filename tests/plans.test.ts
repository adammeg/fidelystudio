import { describe, expect, it } from "vitest";
import { effectiveSubscription, FIDELY_ENTITLEMENTS, FIDELY_MONTHLY_PRICE } from "../src/lib/plans";

describe("SaaS plan entitlements", () => {
  it("keeps active subscriptions enabled", () => {
    expect(effectiveSubscription("active", new Date(0))).toBe("active");
  });

  it("allows seven-day trials and restricts them after expiry", () => {
    expect(effectiveSubscription("pending_payment", "2026-08-03T00:00:00Z")).toBe("restricted");
    expect(effectiveSubscription("trialing", new Date(Date.now() + 86_400_000))).toBe("trialing");
    expect(effectiveSubscription("trialing", new Date(Date.now() - 86_400_000))).toBe("restricted");
  });

  it("offers one full subscription at 49 TND per month", () => {
    expect(FIDELY_MONTHLY_PRICE).toEqual({ amount: 49, currency: "TND", interval: "month" });
    expect(FIDELY_ENTITLEMENTS.campaigns).toBe(true);
    expect(FIDELY_ENTITLEMENTS.customerLimit).toBe(Number.MAX_SAFE_INTEGER);
  });
});
