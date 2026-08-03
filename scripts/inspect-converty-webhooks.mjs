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

await mongoose.connect(process.env.MONGODB_URI);
try {
  const names = (await mongoose.connection.db.listCollections().toArray()).map((item) => item.name);
  const collectionName = names.find((name) => /convertyconnections/i.test(name));
  const connections = collectionName ? await mongoose.connection.db.collection(collectionName).find({}).toArray() : [];
  const results = [];
  for (const connection of connections) {
    let response = await fetch("https://api.converty.shop/api/v1/hooks", { headers: { Authorization: `Bearer ${decrypt(connection.accessToken)}` } });
    const payload = await response.json().catch(() => ({}));
    const hooks = response.ok && Array.isArray(payload.data) ? payload.data : [];
    results.push({
      store: connection.storeName || connection.storeSlug || "Connected store",
      status: response.status,
      scopes: connection.scopes || [],
      storedWebhookIds: connection.webhookIds?.length || 0,
      hooks: hooks.map((hook) => ({ event: hook.event, targetHost: (() => { try { return new URL(hook.targetUrl).host; } catch { return "invalid"; } })() })),
      lastWebhookAt: connection.lastWebhookAt || null,
      lastWebhookError: connection.lastWebhookError || null,
      lastSyncAt: connection.lastSyncAt || null,
    });
  }
  console.log(JSON.stringify({ connections: results }, null, 2));
} finally { await mongoose.disconnect(); }
