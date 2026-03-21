import { describe, expect, it } from "vitest";
import { decrypt, encrypt } from "../utils/encryption.util";

describe("encryption util", () => {
  const key =
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

  it("encrypt/decrypt round-trip works with v2 AES-GCM format", () => {
    const token = "gho_sensitive_access_token";
    const encrypted = encrypt(token, key);
    const decrypted = decrypt(encrypted, key);

    expect(encrypted.startsWith("v2:")).toBe(true);
    expect(decrypted).toBe(token);
  });

  // --- D1: Same plaintext produces different ciphertext (random IV) ---
  it("encrypt produces different ciphertext for the same plaintext", () => {
    const plaintext = "gho_same_token_value";
    const enc1 = encrypt(plaintext, key);
    const enc2 = encrypt(plaintext, key);

    expect(enc1).not.toBe(enc2);
    expect(enc1.startsWith("v2:")).toBe(true);
    expect(enc2.startsWith("v2:")).toBe(true);
  });

  // --- D2: Tampered auth tag → decrypt throws ---
  it("decrypt throws when the auth tag has been tampered with", () => {
    const encrypted = encrypt("sensitive_data", key);
    const parts = encrypted.split(":");
    // Flip a character in the auth tag (parts[2])
    const tampered = parts[2];
    const flipped =
      tampered[0] === "a" ? "b" + tampered.slice(1) : "a" + tampered.slice(1);
    parts[2] = flipped;
    const tamperedCiphertext = parts.join(":");

    expect(() => decrypt(tamperedCiphertext, key)).toThrow();
  });

  // --- D3: Tampered IV → decrypt throws ---
  it("decrypt throws when the IV has been tampered with", () => {
    const encrypted = encrypt("sensitive_data", key);
    const parts = encrypted.split(":");
    // Flip a character in the IV (parts[1])
    const originalIv = parts[1];
    const flipped =
      originalIv[0] === "a"
        ? "b" + originalIv.slice(1)
        : "a" + originalIv.slice(1);
    parts[1] = flipped;
    const tamperedCiphertext = parts.join(":");

    expect(() => decrypt(tamperedCiphertext, key)).toThrow();
  });

  // --- D4: Empty string round-trip ---
  it("encrypt/decrypt round-trip works with empty string", () => {
    const encrypted = encrypt("", key);
    const decrypted = decrypt(encrypted, key);

    expect(encrypted.startsWith("v2:")).toBe(true);
    expect(decrypted).toBe("");
  });

  // --- D5: Very long plaintext round-trip ---
  it("encrypt/decrypt round-trip works with very long plaintext", () => {
    const longText = "x".repeat(100_000);
    const encrypted = encrypt(longText, key);
    const decrypted = decrypt(encrypted, key);

    expect(decrypted).toBe(longText);
  });

  // --- D6: Completely invalid input → decrypt throws ---
  it("decrypt throws on completely invalid input", () => {
    expect(() => decrypt("not-a-valid-ciphertext!!!", key)).toThrow();
  });
});
