import { beforeEach, describe, expect, it, vi } from "vitest";
import mongoose from "mongoose";

vi.mock("../models/user.model", () => ({
  User: { findById: vi.fn(), updateOne: vi.fn() },
}));

vi.mock("../models/project.model", () => ({
  Project: { find: vi.fn(), countDocuments: vi.fn() },
}));

vi.mock("../models/purchase.model", () => ({
  Purchase: { findOne: vi.fn() },
}));

vi.mock("../logger/logger", () => ({
  default: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

vi.mock("../utils/asyncContext", () => ({
  enrichContext: vi.fn(),
}));

import { toggleWishlist } from "../controllers/wishlist.controller";
import { User } from "../models/user.model";
import { Purchase } from "../models/purchase.model";

const USER_ID = "507f1f77bcf86cd799439011";
const PROJECT_ID = "507f1f77bcf86cd799439033";

const flushPromises = () =>
  new Promise<void>((resolve) => setImmediate(resolve));

const makeRes = () => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

const makeReq = (overrides: Record<string, unknown> = {}) =>
  ({
    user: { _id: USER_ID, username: "buyer" },
    body: { project_id: PROJECT_ID },
    query: {},
    ...overrides,
  }) as any;

function mockSelectLean(value: unknown) {
  const leanFn = vi.fn().mockResolvedValue(value);
  const selectFn = vi.fn().mockReturnValue({ lean: leanFn });
  return { select: selectFn, lean: leanFn };
}

describe("toggleWishlist", () => {
  const next = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(User.findById).mockReturnValue(
      mockSelectLean({ wishlist: [] }) as any
    );
    vi.mocked(Purchase.findOne).mockReturnValue(mockSelectLean(null) as any);
    vi.mocked(User.updateOne).mockResolvedValue({ modifiedCount: 1 } as any);
  });

  it("adds a non-purchased project to the wishlist", async () => {
    const req = makeReq();
    const res = makeRes();

    toggleWishlist(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(200);
    expect(User.updateOne).toHaveBeenCalledWith(
      { _id: expect.any(Object) },
      { $addToSet: { wishlist: expect.any(Object) } }
    );
    expect(vi.mocked(res.json).mock.calls[0][0].data).toEqual({
      isWishlisted: true,
    });
  });

  it("checks confirmed purchase ownership before allowing a new wishlist add", async () => {
    const req = makeReq();
    const res = makeRes();

    toggleWishlist(req, res, next);
    await flushPromises();

    expect(Purchase.findOne).toHaveBeenCalledWith({
      buyerId: expect.any(Object),
      projectId: expect.any(Object),
      status: "CONFIRMED",
    });
  });

  it("rejects adding a project the user already owns", async () => {
    vi.mocked(Purchase.findOne).mockReturnValue(
      mockSelectLean({ _id: "purchase-1" }) as any
    );

    const req = makeReq();
    const res = makeRes();

    toggleWishlist(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(409);
    expect(User.updateOne).not.toHaveBeenCalled();
    expect(vi.mocked(res.json).mock.calls[0][0].message).toMatch(
      /already own this project/i
    );
  });

  it("allows removing an already-wishlisted project without re-checking purchases", async () => {
    const wishlistedId = new mongoose.Types.ObjectId(PROJECT_ID);
    vi.mocked(User.findById).mockReturnValue(
      mockSelectLean({ wishlist: [wishlistedId] }) as any
    );

    const req = makeReq();
    const res = makeRes();

    toggleWishlist(req, res, next);
    await flushPromises();

    expect(Purchase.findOne).not.toHaveBeenCalled();
    expect(User.updateOne).toHaveBeenCalledWith(
      { _id: expect.any(Object) },
      { $pull: { wishlist: expect.any(Object) } }
    );
    expect(vi.mocked(res.json).mock.calls[0][0].data).toEqual({
      isWishlisted: false,
    });
  });

  it("returns 500 and does not mutate the wishlist if the purchase lookup fails", async () => {
    vi.mocked(Purchase.findOne).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockRejectedValue(new Error("purchase lookup failed")),
      }),
    } as any);

    const req = makeReq();
    const res = makeRes();

    toggleWishlist(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(500);
    expect(User.updateOne).not.toHaveBeenCalled();
  });

  it("returns 500 when the wishlist update itself fails", async () => {
    vi.mocked(User.updateOne).mockRejectedValue(
      new Error("wishlist write failed")
    );

    const req = makeReq();
    const res = makeRes();

    toggleWishlist(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
