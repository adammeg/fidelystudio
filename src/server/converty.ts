import { decryptSecret, encryptSecret } from "./security";

const AUTH_BASE_URL = "https://partner.converty.shop";
const API_BASE_URL = "https://api.converty.shop";
const TOKEN_BUFFER_MS = 5 * 60 * 1000;
const MAX_RETRIES = 3;

export const CONVERTY_BASE_SCOPES = [
  "read-stores",
  "read-orders",
] as const;

export const CONVERTY_WEBHOOK_SCOPES = [
  "read-hooks",
  "create-hooks",
  "delete-hooks",
] as const;

const ALLOWED_SCOPES = new Set<string>([
  ...CONVERTY_BASE_SCOPES,
  ...CONVERTY_WEBHOOK_SCOPES,
]);

export function convertyScopes() {
  const configured = process.env.CONVERTY_SCOPES?.trim();
  if (!configured) return [...CONVERTY_BASE_SCOPES];
  const scopes = [...new Set(configured.split(/[\s,]+/).filter(Boolean))];
  const invalid = scopes.filter((scope) => !ALLOWED_SCOPES.has(scope));
  if (invalid.length) throw new Error(`Unsupported Converty scope: ${invalid.join(", ")}`);
  for (const required of CONVERTY_BASE_SCOPES) {
    if (!scopes.includes(required)) {
      throw new Error(`CONVERTY_SCOPES must include ${required}`);
    }
  }
  return scopes;
}

function env(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

export function studioAppUrl() {
  return env("STUDIO_APP_URL").replace(/\/+$/, "");
}

export function convertyRedirectUri() {
  const expected = `${studioAppUrl()}/api/auth/converty/callback`;
  const configured = process.env.CONVERTY_REDIRECT_URI?.replace(/\/+$/, "");
  if (configured && configured !== expected) {
    throw new Error(
      `CONVERTY_REDIRECT_URI must match the canonical app URL exactly. Expected ${expected}`
    );
  }
  return expected;
}

async function parseResponse(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (res.ok) return data;
  const error = new Error(
    typeof data?.message === "string" ? data.message : `Converty request failed (${res.status})`
  ) as Error & { status?: number };
  error.status = res.status;
  throw error;
}

async function withBackoff(run: () => Promise<Response>) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    const res = await run();
    if (res.status !== 429 && res.status < 500) return res;
    if (attempt === MAX_RETRIES) return res;
    await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt));
  }
  throw new Error("Converty request failed after retries");
}

async function tokenRequest(params: Record<string, string>) {
  const body = new URLSearchParams({
    ...params,
    client_id: env("CONVERTY_CLIENT_ID"),
    client_secret: env("CONVERTY_CLIENT_SECRET"),
  });
  const res = await withBackoff(() =>
    fetch(`${AUTH_BASE_URL}/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    })
  );
  return parseResponse(res) as Promise<{
    access_token: string;
    refresh_token: string;
    token_type: "Bearer";
    expires_in: number;
  }>;
}

export function authorizationUrl(state: string) {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: env("CONVERTY_CLIENT_ID"),
    redirect_uri: convertyRedirectUri(),
    scope: convertyScopes().join(" "),
    state,
  });
  return `${AUTH_BASE_URL}/oauth2/authorize?${params}`;
}

export function exchangeAuthorizationCode(code: string) {
  return tokenRequest({
    grant_type: "authorization_code",
    code,
    redirect_uri: convertyRedirectUri(),
  });
}

export function refreshTokens(refreshToken: string) {
  return tokenRequest({ grant_type: "refresh_token", refresh_token: refreshToken });
}

type Connection = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  save(): Promise<unknown>;
};

async function persistTokens(
  connection: Connection,
  tokens: { access_token: string; refresh_token?: string; expires_in: number }
) {
  connection.accessToken = encryptSecret(tokens.access_token);
  if (tokens.refresh_token) connection.refreshToken = encryptSecret(tokens.refresh_token);
  connection.accessTokenExpiresAt = new Date(Date.now() + Number(tokens.expires_in || 1295999) * 1000);
  await connection.save();
}

async function validAccessToken(connection: Connection) {
  if (connection.accessTokenExpiresAt.getTime() - TOKEN_BUFFER_MS > Date.now()) {
    return decryptSecret(connection.accessToken);
  }
  const tokens = await refreshTokens(decryptSecret(connection.refreshToken));
  await persistTokens(connection, tokens);
  return decryptSecret(connection.accessToken);
}

export async function convertyApi<T>(
  connection: Connection,
  path: string,
  init: { method?: string; body?: unknown } = {}
): Promise<T> {
  let token = await validAccessToken(connection);
  let retriedUnauthorized = false;

  for (;;) {
    const res = await withBackoff(() =>
      fetch(`${API_BASE_URL}/api/v1${path}`, {
        method: init.method || "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          ...(init.body ? { "Content-Type": "application/json" } : {}),
        },
        body: init.body ? JSON.stringify(init.body) : undefined,
        cache: "no-store",
      })
    );
    if (res.status === 401 && !retriedUnauthorized) {
      const tokens = await refreshTokens(decryptSecret(connection.refreshToken));
      await persistTokens(connection, tokens);
      token = decryptSecret(connection.accessToken);
      retriedUnauthorized = true;
      continue;
    }
    return parseResponse(res) as Promise<T>;
  }
}

export async function storeInfoWithToken(accessToken: string) {
  const res = await fetch(`${API_BASE_URL}/api/v1/stores/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  const result = await parseResponse(res);
  return result.data as {
    _id: string;
    name: string;
    slug?: string;
    domain?: string;
    logo?: string | {
      sm?: string;
      md?: string;
      lg?: string;
      url?: string;
    };
    currency?: string;
    country?: string;
    user?: { email?: string; firstname?: string; lastname?: string };
  };
}

export function convertyImageUrl(
  image:
    | string
    | { sm?: string; md?: string; lg?: string; url?: string }
    | null
    | undefined
) {
  if (typeof image === "string") return image || null;
  if (!image || typeof image !== "object") return null;
  return image.lg || image.md || image.sm || image.url || null;
}

export function encryptedTokenRecord(tokens: {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}) {
  return {
    accessToken: encryptSecret(tokens.access_token),
    refreshToken: encryptSecret(tokens.refresh_token),
    accessTokenExpiresAt: new Date(Date.now() + Number(tokens.expires_in || 1295999) * 1000),
  };
}
