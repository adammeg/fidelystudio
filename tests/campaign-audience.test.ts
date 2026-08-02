import { describe, expect, it } from "vitest";
import { snapshotAudience } from "../src/lib/campaign-audience";

describe("campaign audience snapshots", () => {
  const now = new Date("2026-08-02T12:00:00Z");

  it("requires explicit consent and a channel destination", () => {
    const snapshot = snapshotAudience([
      { id: "a", phone: "+2161", email: null, marketingConsent: { whatsapp: true } },
      { id: "b", phone: "+2162", email: null, marketingConsent: { whatsapp: false } },
    ], ["whatsapp"], now);
    expect(snapshot.eligibleCustomerCount).toBe(1);
    expect(snapshot.queuedMessageCount).toBe(1);
    expect(snapshot.excludedConsentCount).toBe(1);
  });

  it("applies the seven-day frequency cap", () => {
    const snapshot = snapshotAudience([{ id: "a", phone: "+2161", email: null, marketingConsent: { whatsapp: true }, lastMessagedAt: "2026-07-30T12:00:00Z" }], ["whatsapp"], now);
    expect(snapshot.excludedFrequencyCount).toBe(1);
  });

  it("counts an eligible WhatsApp customer once", () => {
    const snapshot = snapshotAudience([{ id: "a", phone: "+2161", email: "a@example.com", marketingConsent: { whatsapp: true } }], ["whatsapp"], now);
    expect(snapshot.queuedMessageCount).toBe(1);
    expect(snapshot.eligibleCustomerCount).toBe(1);
  });
});
