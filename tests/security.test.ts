import { beforeAll, describe, expect, it } from "vitest";
import {
  decryptSecret,
  encryptSecret,
  hashPassword,
  sha256,
  verifyPassword,
} from "../src/server/security";

describe("server security", () => {
  beforeAll(() => {
    process.env.TOKEN_ENCRYPTION_KEY =
      "test-encryption-key-with-at-least-thirty-two-characters";
  });

  it("encrypts secrets with authenticated encryption", () => {
    const encrypted = encryptSecret("converty-access-token");
    expect(encrypted).not.toContain("converty-access-token");
    expect(decryptSecret(encrypted)).toBe("converty-access-token");
  });

  it("rejects a modified encrypted secret", () => {
    const encrypted = encryptSecret("converty-access-token");
    const modified = `${encrypted.slice(0, -1)}${encrypted.endsWith("a") ? "b" : "a"}`;
    expect(() => decryptSecret(modified)).toThrow();
  });

  it("hashes and verifies default-user passwords", async () => {
    const stored = await hashPassword("strong-password");
    expect(stored).not.toContain("strong-password");
    await expect(verifyPassword("strong-password", stored)).resolves.toBe(true);
    await expect(verifyPassword("wrong-password", stored)).resolves.toBe(false);
  });

  it("produces stable one-way state hashes", () => {
    expect(sha256("state")).toBe(sha256("state"));
    expect(sha256("state")).not.toBe(sha256("other-state"));
  });
});
