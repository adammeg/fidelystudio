import crypto from "node:crypto";
import mongoose from "mongoose";

function decrypt(value) {
  const [prefix, version, iv, tag, encrypted] = String(value || "").split(":");
  if (`${prefix}:${version}` !== "enc:v1") throw new Error("Invalid encrypted token");
  const key = crypto.createHash("sha256").update(process.env.TOKEN_ENCRYPTION_KEY).digest();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64url")), decipher.final()]).toString("utf8");
}

function matchingPaths(value, prefix = "", found = []) {
  if (!value || typeof value !== "object") return found;
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (/promo|coupon|discount|voucher/i.test(key)) found.push({ path, kind: Array.isArray(child) ? "array" : typeof child, sample: typeof child === "string" || typeof child === "number" ? child : undefined, fields: child && typeof child === "object" && !Array.isArray(child) ? Object.keys(child) : undefined });
    if (typeof child === "object") matchingPaths(child, path, found);
  }
  return found;
}

await mongoose.connect(process.env.MONGODB_URI);
try {
  const collections = await mongoose.connection.db.listCollections().toArray();
  const name = collections.map((item) => item.name).find((item) => /convertyconnections/i.test(item));
  if (!name) throw new Error("No Converty connection collection found");
  const connections = await mongoose.connection.db.collection(name).find({}).limit(10).toArray();
  if (!connections.length) throw new Error("No connected Converty store found");
  let inspected = 0;
  const matches = [];
  for (const connection of connections) {
    let token = decrypt(connection.accessToken);
    let response = await fetch("https://api.converty.shop/api/v1/orders?page=1&limit=200", { headers: { Authorization: `Bearer ${token}` } });
    if (response.status === 401 && connection.refreshToken) {
      const body = new URLSearchParams({ grant_type: "refresh_token", refresh_token: decrypt(connection.refreshToken), client_id: process.env.CONVERTY_CLIENT_ID, client_secret: process.env.CONVERTY_CLIENT_SECRET });
      const refreshed = await fetch("https://partner.converty.shop/oauth2/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
      if (!refreshed.ok) throw new Error(`Token refresh failed (${refreshed.status})`);
      token = (await refreshed.json()).access_token;
      response = await fetch("https://api.converty.shop/api/v1/orders?page=1&limit=200", { headers: { Authorization: `Bearer ${token}` } });
    }
    if (!response.ok) throw new Error(`Orders request failed (${response.status})`);
    const payload = await response.json();
    const orders = Array.isArray(payload.data) ? payload.data : [];
    inspected += orders.length;
    for (const order of orders) matches.push(...matchingPaths(order).map((match) => ({ ...match, order: String(order._id || "unknown").slice(-8) })));
  }
  const unique = [...new Map(matches.map((match) => [match.path, match])).values()];
  console.log(JSON.stringify({ connections: connections.length, ordersInspected: inspected, promoRelatedFields: unique }, null, 2));
} finally {
  await mongoose.disconnect();
}
