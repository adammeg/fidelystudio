import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { effectiveSubscription } from "../src/lib/plans";
import { normalizeWhatsAppNumber } from "../src/server/evolution";

const root = path.resolve(import.meta.dirname, "..");
describe("production readiness regressions", () => {
  it("expires paid periods and preserves a live seven-day trial", () => {
    expect(effectiveSubscription("active", new Date(0), new Date(Date.now() - 1000))).toBe("restricted");
    expect(effectiveSubscription("active", new Date(0), new Date(Date.now() + 1000))).toBe("active");
    expect(effectiveSubscription("trialing", new Date(Date.now() + 1000))).toBe("trialing");
  });
  it("normalizes supported North African local phone numbers", () => {
    expect(normalizeWhatsAppNumber("90 053 729", "TN")).toBe("21690053729");
    expect(normalizeWhatsAppNumber("0550 12 34 56", "DZ")).toBe("213550123456");
  });
  it("keeps mobile layout protections and viewport configuration", () => {
    const css = fs.readFileSync(path.join(root, "src/app/globals.css"), "utf8");
    const layout = fs.readFileSync(path.join(root, "src/app/layout.tsx"), "utf8");
    expect(css).toContain("@media (max-width: 900px)");
    expect(css).toContain("loyalty-editor-table");
    expect(css).toContain("customer-table");
    expect(layout).toContain('width: "device-width"');
  });
});
