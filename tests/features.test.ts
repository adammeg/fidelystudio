import { describe, expect, it } from "vitest";
import {
  PRODUCT_FEATURES,
  isUnsupportedStudioApi,
} from "../src/lib/features";

describe("supported product surface", () => {
  it("keeps WhatsApp campaigns disabled", () => {
    expect(PRODUCT_FEATURES.whatsappCampaigns).toBe(false);
  });

  it.each([
    "campaigns",
    "campaigns/example",
    "influencers",
    "referral",
    "loyalty",
    "widgets",
  ])("rejects hidden Studio API %s", (path) => {
    expect(isUnsupportedStudioApi(path)).toBe(true);
  });

  it.each(["overview", "customers", "segments", "cohorts", "converty/status"])(
    "keeps supported Studio API %s available",
    (path) => {
      expect(isUnsupportedStudioApi(path)).toBe(false);
    }
  );
});
