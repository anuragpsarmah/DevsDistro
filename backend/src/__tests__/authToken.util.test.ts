import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../models/user.model", () => ({
  User: {
    updateOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
  },
}));

vi.mock("../index", () => ({
  redisClient: {
    set: vi.fn(),
    get: vi.fn(),
  },
}));

import { User } from "../models/user.model";
import {
  addRefreshToken,
  generateRefreshToken,
  getRefreshTokenExpiryDate,
  hashRefreshToken,
  revokeAllRefreshTokens,
  revokeRefreshToken,
  rotateRefreshToken,
} from "../utils/authToken.util";
import { redisClient } from "../index";

describe("authToken util", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("generateRefreshToken creates 80-char lowercase hex token", () => {
    const token = generateRefreshToken();
    expect(token).toMatch(/^[a-f0-9]{80}$/);
  });

  it("hashRefreshToken returns deterministic SHA-256 hash", () => {
    const t1 = hashRefreshToken("token-value");
    const t2 = hashRefreshToken("token-value");
    expect(t1).toBe(t2);
    expect(t1).toHaveLength(64);
  });

  it("addRefreshToken appends hashed token via update pipeline", async () => {
    vi.mocked(User.updateOne).mockResolvedValue({ acknowledged: true } as any);
    const userId = "507f1f77bcf86cd799439011" as any;

    await addRefreshToken(userId, "a".repeat(80));

    expect(User.updateOne).toHaveBeenCalledWith(
      { _id: userId },
      expect.arrayContaining([
        expect.objectContaining({
          $set: expect.objectContaining({
            refresh_tokens: expect.anything(),
          }),
        }),
      ])
    );
  });

  it("rotateRefreshToken returns user and stores consumed token marker", async () => {
    vi.mocked(User.findOneAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        _id: "507f1f77bcf86cd799439011",
        username: "user",
        name: "User",
        profile_image_url: "https://img.example/u.png",
      }),
    } as any);
    vi.mocked(redisClient.set).mockResolvedValue("OK" as any);

    const result = await rotateRefreshToken("a".repeat(80), "b".repeat(80));

    expect(result).toMatchObject({ username: "user" });
    expect(redisClient.set).toHaveBeenCalledWith(
      expect.stringMatching(/^consumed_rt:[a-f0-9]{64}$/),
      expect.any(String),
      "EX",
      expect.any(Number)
    );
  });

  it("rotateRefreshToken returns null for retry within grace window", async () => {
    const now = 1_700_000_000_000;
    vi.spyOn(Date, "now").mockReturnValue(now);
    vi.mocked(User.findOneAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any);
    vi.mocked(redisClient.get).mockResolvedValue(
      JSON.stringify({
        userId: "507f1f77bcf86cd799439011",
        consumedAt: now - 30_000,
      }) as any
    );

    const result = await rotateRefreshToken("a".repeat(80), "b".repeat(80));

    expect(result).toBeNull();
  });

  it("rotateRefreshToken detects replay after grace and revokes all sessions", async () => {
    const now = 1_700_000_100_000;
    vi.spyOn(Date, "now").mockReturnValue(now);
    vi.mocked(User.findOneAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any);
    vi.mocked(redisClient.get).mockResolvedValue(
      JSON.stringify({
        userId: "507f1f77bcf86cd799439011",
        consumedAt: now - 120_000,
      }) as any
    );
    vi.mocked(User.updateOne).mockResolvedValue({ acknowledged: true } as any);

    const result = await rotateRefreshToken("a".repeat(80), "b".repeat(80));

    expect(result).toBe("REUSE_DETECTED");
    expect(User.updateOne).toHaveBeenCalledWith(
      { _id: expect.anything() },
      { $set: { refresh_tokens: [] } }
    );
  });

  it("revokeRefreshToken removes hashed token from user record", async () => {
    vi.mocked(User.updateOne).mockResolvedValue({ acknowledged: true } as any);

    await revokeRefreshToken("a".repeat(80));

    expect(User.updateOne).toHaveBeenCalledWith(
      { "refresh_tokens.token_hash": expect.stringMatching(/^[a-f0-9]{64}$/) },
      { $pull: { refresh_tokens: { token_hash: expect.any(String) } } }
    );
  });

  it("revokeAllRefreshTokens clears all tokens for a user", async () => {
    vi.mocked(User.updateOne).mockResolvedValue({ acknowledged: true } as any);

    await revokeAllRefreshTokens("507f1f77bcf86cd799439011" as any);

    expect(User.updateOne).toHaveBeenCalledWith(
      { _id: "507f1f77bcf86cd799439011" },
      { $set: { refresh_tokens: [] } }
    );
  });

  // --- B1: generateRefreshToken uniqueness ---
  it("generateRefreshToken produces different tokens on successive calls", () => {
    const t1 = generateRefreshToken();
    const t2 = generateRefreshToken();
    expect(t1).not.toBe(t2);
  });

  // --- B2: hashRefreshToken different inputs -> different hashes ---
  it("hashRefreshToken produces different hashes for different inputs", () => {
    const h1 = hashRefreshToken("a".repeat(80));
    const h2 = hashRefreshToken("b".repeat(80));
    expect(h1).not.toBe(h2);
    expect(h1).toHaveLength(64);
    expect(h2).toHaveLength(64);
    expect(h1).toMatch(/^[a-f0-9]{64}$/);
    expect(h2).toMatch(/^[a-f0-9]{64}$/);
  });

  // --- B3: getRefreshTokenExpiryDate ---
  it("getRefreshTokenExpiryDate returns a date approximately 7 days in the future", () => {
    const before = Date.now();
    const expiryDate = getRefreshTokenExpiryDate();
    const after = Date.now();

    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    expect(expiryDate.getTime()).toBeGreaterThanOrEqual(before + sevenDaysMs);
    expect(expiryDate.getTime()).toBeLessThanOrEqual(after + sevenDaysMs);
  });

  // --- B4: addRefreshToken pipeline has exactly 3 stages ---
  it("addRefreshToken sends a 3-stage aggregation pipeline to updateOne", async () => {
    vi.mocked(User.updateOne).mockResolvedValue({ acknowledged: true } as any);
    const userId = "507f1f77bcf86cd799439011" as any;

    await addRefreshToken(userId, "c".repeat(80));

    const [filter, pipeline] = vi.mocked(User.updateOne).mock
      .calls[0] as unknown as any[];
    expect(filter).toEqual({ _id: userId });
    expect(Array.isArray(pipeline)).toBe(true);
    expect((pipeline as any[]).length).toBe(3);
    (pipeline as any[]).forEach((stage: any) => {
      expect(stage).toHaveProperty("$set");
      expect(stage.$set).toHaveProperty("refresh_tokens");
    });
  });

  // --- B5: rotateRefreshToken — Redis set fails after successful DB rotation ---
  it("rotateRefreshToken still returns user when Redis set fails", async () => {
    vi.mocked(User.findOneAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        _id: "507f1f77bcf86cd799439011",
        username: "user",
        name: "User",
        profile_image_url: "https://img.example/u.png",
      }),
    } as any);
    vi.mocked(redisClient.set).mockRejectedValue(new Error("Redis down"));

    const result = await rotateRefreshToken("a".repeat(80), "b".repeat(80));

    expect(result).toMatchObject({ username: "user" });
  });

  // --- B6: rotateRefreshToken — Redis get fails ---
  it("rotateRefreshToken returns null when Redis get fails during consumed token lookup", async () => {
    vi.mocked(User.findOneAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any);
    vi.mocked(redisClient.get).mockRejectedValue(new Error("Redis down"));

    const result = await rotateRefreshToken("a".repeat(80), "b".repeat(80));

    expect(result).toBeNull();
  });

  // --- B7: rotateRefreshToken — malformed JSON in Redis ---
  it("rotateRefreshToken returns null when Redis contains malformed JSON", async () => {
    vi.mocked(User.findOneAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any);
    vi.mocked(redisClient.get).mockResolvedValue("not valid json{" as any);

    const result = await rotateRefreshToken("a".repeat(80), "b".repeat(80));

    expect(result).toBeNull();
  });

  // --- B8: revokeRefreshToken idempotency ---
  it("revokeRefreshToken does not throw when token does not exist", async () => {
    vi.mocked(User.updateOne).mockResolvedValue({
      acknowledged: true,
      modifiedCount: 0,
      upsertedId: null,
      upsertedCount: 0,
      matchedCount: 0,
    } as any);

    await expect(revokeRefreshToken("a".repeat(80))).resolves.toBeUndefined();
  });
});
