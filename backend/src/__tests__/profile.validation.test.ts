import { describe, it, expect } from "vitest";
import {
  profileInformationSchema,
  walletAddressSchema,
} from "../validations/profile.validation";

describe("profileInformationSchema", () => {
  it("passes with all fields valid", () => {
    const result = profileInformationSchema.safeParse({
      website_url: "https://example.com",
      x_username: "johndoe",
      short_bio: "Hello world",
      job_role: "Software Engineer",
      location: "New York",
      review_description: "Great platform",
      review_stars: 5,
      profile_visibility: true,
      auto_repackage_on_push: false,
    });
    expect(result.success).toBe(true);
  });

  it("passes with all fields omitted (all optional)", () => {
    expect(profileInformationSchema.safeParse({}).success).toBe(true);
  });

  it("passes with empty strings for optional text fields", () => {
    const result = profileInformationSchema.safeParse({
      website_url: "",
      x_username: "",
      short_bio: "",
      job_role: "",
      location: "",
      review_description: "",
    });
    expect(result.success).toBe(true);
  });

  describe("website_url", () => {
    it("rejects an invalid URL", () => {
      const result = profileInformationSchema.safeParse({
        website_url: "not-a-url",
      });
      expect(result.success).toBe(false);
    });

    it("accepts a valid HTTPS URL", () => {
      const result = profileInformationSchema.safeParse({
        website_url: "https://portfolio.dev",
      });
      expect(result.success).toBe(true);
    });

    it("accepts an empty string", () => {
      expect(
        profileInformationSchema.safeParse({ website_url: "" }).success
      ).toBe(true);
    });
  });

  describe("job_role", () => {
    it("accepts a valid enum value", () => {
      expect(
        profileInformationSchema.safeParse({ job_role: "Frontend Engineer" })
          .success
      ).toBe(true);
    });

    it("rejects an unlisted job role", () => {
      const result = profileInformationSchema.safeParse({
        job_role: "Ninja Developer",
      });
      expect(result.success).toBe(false);
    });

    it("accepts an empty string", () => {
      expect(profileInformationSchema.safeParse({ job_role: "" }).success).toBe(
        true
      );
    });
  });

  describe("short_bio", () => {
    it("accepts exactly 250 characters", () => {
      expect(
        profileInformationSchema.safeParse({ short_bio: "a".repeat(250) })
          .success
      ).toBe(true);
    });

    it("rejects 251 characters", () => {
      const result = profileInformationSchema.safeParse({
        short_bio: "a".repeat(251),
      });
      expect(result.success).toBe(false);
      expect(result.error?.errors[0].message).toContain("250 characters");
    });
  });

  describe("x_username", () => {
    it("accepts exactly 50 characters", () => {
      expect(
        profileInformationSchema.safeParse({ x_username: "a".repeat(50) })
          .success
      ).toBe(true);
    });

    it("rejects 51 characters", () => {
      const result = profileInformationSchema.safeParse({
        x_username: "a".repeat(51),
      });
      expect(result.success).toBe(false);
      expect(result.error?.errors[0].message).toContain("50 characters");
    });
  });

  describe("location", () => {
    it("accepts exactly 100 characters", () => {
      expect(
        profileInformationSchema.safeParse({ location: "a".repeat(100) })
          .success
      ).toBe(true);
    });

    it("rejects 101 characters", () => {
      const result = profileInformationSchema.safeParse({
        location: "a".repeat(101),
      });
      expect(result.success).toBe(false);
      expect(result.error?.errors[0].message).toContain("100 characters");
    });
  });

  describe("review_description", () => {
    it("accepts exactly 200 characters", () => {
      expect(
        profileInformationSchema.safeParse({
          review_description: "a".repeat(200),
        }).success
      ).toBe(true);
    });

    it("rejects 201 characters", () => {
      const result = profileInformationSchema.safeParse({
        review_description: "a".repeat(201),
      });
      expect(result.success).toBe(false);
      expect(result.error?.errors[0].message).toContain("200 characters");
    });
  });

  describe("review_stars", () => {
    it("accepts 0", () => {
      expect(
        profileInformationSchema.safeParse({ review_stars: 0 }).success
      ).toBe(true);
    });

    it("accepts 5", () => {
      expect(
        profileInformationSchema.safeParse({ review_stars: 5 }).success
      ).toBe(true);
    });

    it("rejects 6", () => {
      const result = profileInformationSchema.safeParse({ review_stars: 6 });
      expect(result.success).toBe(false);
    });

    it("rejects -1", () => {
      const result = profileInformationSchema.safeParse({ review_stars: -1 });
      expect(result.success).toBe(false);
    });

    it("rejects a float like 3.5", () => {
      const result = profileInformationSchema.safeParse({ review_stars: 3.5 });
      expect(result.success).toBe(false);
      expect(result.error?.errors[0].message).toContain("whole number");
    });
  });
});

describe("walletAddressSchema", () => {
  const validAddress = "GsbwXfJraMomNxBcpR3DBuWMxSrPMD8HuCHBuyBEjMzN";
  const validSignature =
    "4rQBPFE3v8s5TxNJuBvmNdq1ZzWqHmLRUMXsMtPP1H5MfnMoQqMKe7LzCa6s5ZbxFsR3d2eY2pHh7XUuFmBMaCm";
  const validMessage = `DevsDistro Wallet Verification\nAddress: ${validAddress}\nTimestamp: ${Date.now()}`;

  it("passes with valid address, signature and message", () => {
    const result = walletAddressSchema.safeParse({
      wallet_address: validAddress,
      signature: validSignature,
      message: validMessage,
    });
    expect(result.success).toBe(true);
  });

  it("passes with empty address (disconnect — no sig/message needed)", () => {
    expect(walletAddressSchema.safeParse({ wallet_address: "" }).success).toBe(
      true
    );
  });

  it("fails when address is set but signature is missing", () => {
    const result = walletAddressSchema.safeParse({
      wallet_address: validAddress,
      message: validMessage,
    });
    expect(result.success).toBe(false);
    expect(result.error?.errors[0].message).toContain(
      "Signature and message are required"
    );
  });

  it("fails when address is set but message is missing", () => {
    const result = walletAddressSchema.safeParse({
      wallet_address: validAddress,
      signature: validSignature,
    });
    expect(result.success).toBe(false);
    expect(result.error?.errors[0].message).toContain(
      "Signature and message are required"
    );
  });

  it("fails with invalid base58 address", () => {
    const result = walletAddressSchema.safeParse({
      wallet_address: "invalid!address",
      signature: validSignature,
      message: validMessage,
    });
    expect(result.success).toBe(false);
    expect(result.error?.errors[0].message).toContain(
      "Invalid Solana wallet address"
    );
  });

  it("fails with address that is too short (< 32 chars)", () => {
    const result = walletAddressSchema.safeParse({
      wallet_address: "abc123",
      signature: validSignature,
      message: validMessage,
    });
    expect(result.success).toBe(false);
  });

  it("fails with address that is too long (> 44 chars)", () => {
    const result = walletAddressSchema.safeParse({
      wallet_address: "A".repeat(45),
      signature: validSignature,
      message: validMessage,
    });
    expect(result.success).toBe(false);
  });
});
