import { describe, expect, it, vi } from "vitest";
import { effectiveSubscription, FIDELY_ENTITLEMENTS, FIDELY_MONTHLY_PRICE } from "../src/lib/plans";

describe("SaaS plan entitlements", () => {
  it("keeps active subscriptions enabled", () => {
    expect(effectiveSubscription("active", new Date(0))).toBe("active");
  });

  it("restricts expired trials", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-02T00:00:00Z"));
    expect(effectiveSubscription("trialing", "2026-08-03T00:00:00Z")).toBe("trialing");
    expect(effectiveSubscription("trialing", "2026-08-01T00:00:00Z")).toBe("restricted");
    vi.useRealTimers();
  });

  it("offers one full subscription at 50 TND per month", () => {
    expect(FIDELY_MONTHLY_PRICE).toEqual({ amount: 50, currency: "TND", interval: "month" });
    expect(FIDELY_ENTITLEMENTS.campaigns).toBe(true);
    expect(FIDELY_ENTITLEMENTS.customerLimit).toBe(Number.MAX_SAFE_INTEGER);
  });
});
