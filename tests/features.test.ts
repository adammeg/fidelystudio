import { describe, expect, it } from "vitest";
import {
  PRODUCT_FEATURES,
  isUnsupportedStudioApi,
} from "../src/lib/features";

describe("supported product surface", () => {
  it("keeps direct WhatsApp sending disabled until a provider is connected", () => {
    expect(PRODUCT_FEATURES.whatsappCampaigns).toBe(false);
  });

  it.each(["referral", "widgets"])("rejects hidden Studio API %s", (path) => {
    expect(isUnsupportedStudioApi(path)).toBe(true);
  });

  it.each(["overview", "customers", "segments", "cohorts", "campaigns", "campaigns/example", "influencers", "converty/status", "loyalty", "loyalty/customers"])(
    "keeps supported Studio API %s available",
    (path) => {
      expect(isUnsupportedStudioApi(path)).toBe(false);
    }
  );
});
