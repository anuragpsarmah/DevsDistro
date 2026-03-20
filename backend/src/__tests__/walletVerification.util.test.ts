import { describe, it, expect } from "vitest";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { verifyWalletSignature } from "../utils/walletVerification.util";

// Generates a real keypair + signature so we can test both valid and invalid paths
function makeSignedMessage(message: string): { address: string; signature: string } {
  const keypair = nacl.sign.keyPair();
  const messageBytes = new TextEncoder().encode(message);
  const signatureBytes = nacl.sign.detached(messageBytes, keypair.secretKey);
  return {
    address: bs58.encode(keypair.publicKey),
    signature: bs58.encode(signatureBytes),
  };
}

describe("verifyWalletSignature", () => {
  const message = "DevsDistro Wallet Verification\nAddress: testAddress\nTimestamp: 1700000000000";

  it("returns true for a valid signature", () => {
    const { address, signature } = makeSignedMessage(message);
    expect(verifyWalletSignature(address, signature, message)).toBe(true);
  });

  it("returns false when the message has been tampered", () => {
    const { address, signature } = makeSignedMessage(message);
    const tamperedMessage = message.replace("testAddress", "differentAddress");
    expect(verifyWalletSignature(address, signature, tamperedMessage)).toBe(false);
  });

  it("returns false when verified against a different public key", () => {
    const { signature } = makeSignedMessage(message);
    const otherKeypair = nacl.sign.keyPair();
    const wrongAddress = bs58.encode(otherKeypair.publicKey);
    expect(verifyWalletSignature(wrongAddress, signature, message)).toBe(false);
  });

  it("returns false for an invalid base58 signature (does not throw)", () => {
    const { address } = makeSignedMessage(message);
    expect(verifyWalletSignature(address, "not-valid-base58!!!", message)).toBe(false);
  });

  it("returns false for an invalid base58 address (does not throw)", () => {
    const { signature } = makeSignedMessage(message);
    expect(verifyWalletSignature("not-valid-base58!!!", signature, message)).toBe(false);
  });

  it("returns false when signature bytes are the correct length but all zeros", () => {
    const { address } = makeSignedMessage(message);
    const zeroSig = bs58.encode(new Uint8Array(64));
    expect(verifyWalletSignature(address, zeroSig, message)).toBe(false);
  });

  it("returns false when address is an empty string (does not throw)", () => {
    const { signature } = makeSignedMessage(message);
    expect(verifyWalletSignature("", signature, message)).toBe(false);
  });
});
