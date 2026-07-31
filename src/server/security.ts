import crypto from "node:crypto";

const TOKEN_PREFIX = "enc:v1";

export function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function encryptionKey() {
  const secret = process.env.TOKEN_ENCRYPTION_KEY;
  if (!secret || secret.length < 32) {
    throw new Error("TOKEN_ENCRYPTION_KEY must be at least 32 characters");
  }
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptSecret(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [TOKEN_PREFIX, iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(":");
}

export function decryptSecret(value: string) {
  const [prefix, version, iv, tag, encrypted] = value.split(":");
  if (`${prefix}:${version}` !== TOKEN_PREFIX || !iv || !tag || !encrypted) {
    throw new Error("Invalid encrypted token");
  }
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}
