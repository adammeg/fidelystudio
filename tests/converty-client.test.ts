import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  authorizationUrl,
  convertyImageUrl,
  convertyCurrencyCode,
  convertyCountryCode,
  convertyDomain,
  exchangeAuthorizationCode,
  storeInfoWithToken,
} from "../src/server/converty";
import { deliveredAt, normalizedStatus, sourceUpdatedAt } from "../src/server/converty-sync";

describe("Converty OAuth contract", () => {
  beforeEach(() => {
    process.env.CONVERTY_CLIENT_ID = "client-id";
    process.env.CONVERTY_CLIENT_SECRET = "client-secret";
    process.env.CONVERTY_REDIRECT_URI =
      "https://www.fidelystudio.shop/api/auth/converty/callback";
    process.env.STUDIO_APP_URL = "https://www.fidelystudio.shop";
    delete process.env.CONVERTY_SCOPES;
    vi.restoreAllMocks();
  });

  it("builds the documented authorization-code URL and scopes", () => {
    const url = new URL(authorizationUrl("csrf-state"));
    expect(url.origin).toBe("https://partner.converty.shop");
    expect(url.pathname).toBe("/oauth2/authorize");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("client_id")).toBe("client-id");
    expect(url.searchParams.get("state")).toBe("csrf-state");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://www.fidelystudio.shop/api/auth/converty/callback"
    );
    expect(url.searchParams.get("scope")?.split(" ")).toEqual([
      "read-stores",
      "read-orders",
      "read-hooks",
      "create-hooks",
      "delete-hooks",
    ]);
  });

  it("exchanges codes using form encoding and server-only credentials", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: "access",
          refresh_token: "refresh",
          token_type: "Bearer",
          expires_in: 1295999,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    await exchangeAuthorizationCode("single-use-code");
    const [, init] = fetchMock.mock.calls[0];
    expect(init?.headers).toEqual({
      "Content-Type": "application/x-www-form-urlencoded",
    });
    const body = init?.body as URLSearchParams;
    expect(body.get("grant_type")).toBe("authorization_code");
    expect(body.get("code")).toBe("single-use-code");
    expect(body.get("client_id")).toBe("client-id");
    expect(body.get("client_secret")).toBe("client-secret");
    expect(body.get("redirect_uri")).toBe(
      "https://www.fidelystudio.shop/api/auth/converty/callback"
    );
  });

  it("rejects redirect configuration that differs from the canonical origin", () => {
    process.env.CONVERTY_REDIRECT_URI =
      "https://fidelystudio.shop/api/auth/converty/callback";
    expect(() => authorizationUrl("csrf-state")).toThrow(
      "must match the canonical app URL exactly"
    );
  });

  it("requires webhook scopes when explicitly configured", () => {
    process.env.CONVERTY_SCOPES =
      "read-stores read-orders read-hooks create-hooks delete-hooks";
    const url = new URL(authorizationUrl("csrf-state"));
    expect(url.searchParams.get("scope")?.split(" ")).toContain("create-hooks");
  });

  it("rejects configured scopes that omit webhook access", () => {
    process.env.CONVERTY_SCOPES = "read-stores read-orders";
    expect(() => authorizationUrl("csrf-state")).toThrow("must include read-hooks");
  });

  it("uses the separate protected API origin for store data", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ data: { _id: "store-1", name: "Store" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    await storeInfoWithToken("access-token");
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://api.converty.shop/api/v1/stores/me"
    );
  });

  it("normalizes Converty responsive store logos to one database URL", () => {
    expect(
      convertyImageUrl({
        sm: "https://cdn.converty.shop/logo_sm.webp",
        md: "https://cdn.converty.shop/logo_md.webp",
        lg: "https://cdn.converty.shop/logo_lg.webp",
      })
    ).toBe("https://cdn.converty.shop/logo_lg.webp");
    expect(convertyImageUrl("https://cdn.converty.shop/logo.webp")).toBe(
      "https://cdn.converty.shop/logo.webp"
    );
    expect(convertyImageUrl(undefined)).toBeNull();
  });

  it("normalizes structured Converty store metadata", () => {
    expect(
      convertyCurrencyCode({
        code: "TND",
        name: "Tunisian Dinar",
        symbol: "DT",
        num: 788,
        decimals: 3,
      })
    ).toBe("TND");
    expect(convertyCountryCode({ code: "TN", name: "Tunisia" })).toBe("TN");
    expect(convertyDomain({ host: "store.example.com" })).toBe(
      "store.example.com"
    );
  });
});

describe("Converty order normalization", () => {
  it("normalizes COD terminal statuses", () => {
    expect(normalizedStatus({ _id: "1", status: "rejected" })).toBe("refused");
    expect(normalizedStatus({ _id: "1", status: "in transit" })).toBe("in_transit");
    expect(normalizedStatus({ _id: "1", archived: true })).toBe("cancelled");
  });

  it("uses the latest delivered history event", () => {
    const date = deliveredAt({ _id: "1", history: [
      { status: "delivered", timestamp: 1000 },
      { status: "delivered", timestamp: 2000 },
    ] });
    expect(date?.getTime()).toBe(2000);
  });

  it("uses the source update time to order webhook events", () => {
    expect(sourceUpdatedAt({ _id: "1", createdAt: "2026-01-01T00:00:00Z" }).toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(sourceUpdatedAt({ _id: "1", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-02-01T00:00:00Z" }).toISOString()).toBe("2026-02-01T00:00:00.000Z");
  });
});
