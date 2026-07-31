import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  authorizationUrl,
  exchangeAuthorizationCode,
} from "../src/server/converty";

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

  it("allows webhook scopes only when explicitly configured", () => {
    process.env.CONVERTY_SCOPES =
      "read-stores read-orders read-hooks create-hooks delete-hooks";
    const url = new URL(authorizationUrl("csrf-state"));
    expect(url.searchParams.get("scope")?.split(" ")).toContain("create-hooks");
  });
});
