import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../models/siteReview.model", () => ({
  SiteReview: { find: vi.fn() },
}));

vi.mock("../models/projectReview.model", () => ({
  Review: {
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    findOneAndDelete: vi.fn(),
    find: vi.fn(),
    countDocuments: vi.fn(),
    create: vi.fn(),
    aggregate: vi.fn(),
  },
}));

vi.mock("../models/project.model", () => ({
  Project: {
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
  },
}));

vi.mock("../models/purchase.model", () => ({
  Purchase: { findOne: vi.fn(), aggregate: vi.fn() },
}));

vi.mock("../models/sales.model", () => ({
  Sales: { updateOne: vi.fn() },
}));

vi.mock("../logger/logger", () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("../utils/asyncContext", () => ({
  enrichContext: vi.fn(),
}));

import {
  submitProjectReview,
  updateProjectReview,
  deleteProjectReview,
  getProjectReviews,
  getMyProjectReview,
} from "../controllers/reviews.controller";
import { Review } from "../models/projectReview.model";
import { Project } from "../models/project.model";
import { Purchase } from "../models/purchase.model";
import { Sales } from "../models/sales.model";

const VALID_USER_ID = "507f1f77bcf86cd799439011";
const VALID_SELLER_ID = "507f191e810c19729de860ef";
const VALID_PROJECT_ID = "507f191e810c19729de860ea";
const VALID_REVIEW_ID = "507f191e810c19729de860ab";

const flushPromises = () =>
  new Promise<void>((resolve) => setImmediate(resolve));

const makeReq = (overrides: Record<string, any> = {}) =>
  ({
    user: {
      _id: VALID_USER_ID,
      username: "buyer",
      name: "Buyer Name",
      profile_image_url: "https://img.test/buyer.png",
    },
    body: {},
    query: {},
    ...overrides,
  }) as any;

const makeRes = () => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.cookie = vi.fn().mockReturnValue(res);
  res.clearCookie = vi.fn().mockReturnValue(res);
  return res;
};

const next = vi.fn();

const mockProjectFindById = (project: any) => {
  vi.mocked(Project.findById).mockReturnValue({
    select: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(project),
    }),
  } as any);
};

const mockPurchaseFindOne = (purchase: any) => {
  vi.mocked(Purchase.findOne).mockReturnValue({
    select: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(purchase),
    }),
  } as any);
};

const mockReviewFindOne = (review: any) => {
  vi.mocked(Review.findOne).mockReturnValue({
    select: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(review),
    }),
  } as any);
};

const setupAggregateRecalcMocks = () => {
  vi.mocked(Review.aggregate).mockResolvedValue([
    { _id: null, avgRating: 4.5, totalReviews: 2 },
  ] as any);

  vi.mocked(Project.findByIdAndUpdate).mockReturnValue({
    select: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        _id: VALID_PROJECT_ID,
        userid: VALID_SELLER_ID,
        avgRating: 4.5,
        totalReviews: 2,
      }),
    }),
  } as any);

  vi.mocked(Purchase.aggregate).mockResolvedValue([
    { _id: null, avgRating: 4.666, totalReviews: 3 },
  ] as any);

  vi.mocked(Sales.updateOne).mockResolvedValue({ acknowledged: true } as any);
};

describe("reviews.controller", () => {
  let res: any;

  beforeEach(() => {
    vi.clearAllMocks();
    res = makeRes();
    setupAggregateRecalcMocks();
  });

  describe("submitProjectReview (POST /reviews/project)", () => {
    it("returns 401 when user is unauthenticated", async () => {
      const req = makeReq({
        user: undefined,
        body: { project_id: VALID_PROJECT_ID, rating: 5 },
      });
      submitProjectReview(req, res, next);
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("returns 400 for invalid payload", async () => {
      const req = makeReq({ body: { project_id: "bad", rating: 0 } });
      submitProjectReview(req, res, next);
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(400);
      expect(Project.findById).not.toHaveBeenCalled();
    });

    it("returns 409 when review already exists and does not create duplicate", async () => {
      mockProjectFindById({
        _id: VALID_PROJECT_ID,
        userid: VALID_SELLER_ID,
        isActive: true,
      });
      mockPurchaseFindOne({ _id: "purchase_1" });
      vi.mocked(Review.create).mockRejectedValue(
        Object.assign(new Error("Duplicate key"), { code: 11000 })
      );

      const req = makeReq({
        body: {
          project_id: VALID_PROJECT_ID,
          rating: 4,
          review: "already reviewed",
        },
      });
      submitProjectReview(req, res, next);
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(409);
    });

    it("enforces confirmed purchase when submitting a review", async () => {
      mockProjectFindById({
        _id: VALID_PROJECT_ID,
        userid: VALID_SELLER_ID,
        isActive: true,
        price: 49,
      });
      mockPurchaseFindOne(null);
      mockReviewFindOne(null);

      const req = makeReq({
        body: { project_id: VALID_PROJECT_ID, rating: 4 },
      });
      submitProjectReview(req, res, next);
      await flushPromises();

      expect(Purchase.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ status: "CONFIRMED" })
      );
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("blocks owner from reviewing their own free project (self-review still enforced)", async () => {
      mockProjectFindById({
        _id: VALID_PROJECT_ID,
        userid: VALID_USER_ID, // same as the requester
        isActive: true,
        price: 0,
      });

      const req = makeReq({
        body: { project_id: VALID_PROJECT_ID, rating: 5 },
      });
      submitProjectReview(req, res, next);
      await flushPromises();

      expect(Purchase.findOne).not.toHaveBeenCalled();
      expect(Review.create).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("allows submitting a review for a free project without a purchase", async () => {
      mockProjectFindById({
        _id: VALID_PROJECT_ID,
        userid: VALID_SELLER_ID,
        isActive: true,
        price: 0,
      });
      vi.mocked(Review.create).mockResolvedValue({
        _id: VALID_REVIEW_ID,
        userId: VALID_USER_ID,
        projectId: VALID_PROJECT_ID,
        rating: 5,
        review: "great free project",
      } as any);

      const req = makeReq({
        body: {
          project_id: VALID_PROJECT_ID,
          rating: 5,
          review: "great free project",
        },
      });
      submitProjectReview(req, res, next);
      await flushPromises();

      expect(Purchase.findOne).not.toHaveBeenCalled();
      expect(Review.create).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: expect.anything(),
          userId: expect.anything(),
          rating: 5,
          review: "great free project",
        })
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it("creates review and recalculates project and seller aggregates", async () => {
      mockProjectFindById({
        _id: VALID_PROJECT_ID,
        userid: VALID_SELLER_ID,
        isActive: true,
        price: 49,
      });
      mockPurchaseFindOne({ _id: "purchase_1" });
      mockReviewFindOne(null);
      vi.mocked(Review.create).mockResolvedValue({
        _id: VALID_REVIEW_ID,
        userId: VALID_USER_ID,
        projectId: VALID_PROJECT_ID,
        rating: 5,
        review: "great",
      } as any);

      const req = makeReq({
        body: { project_id: VALID_PROJECT_ID, rating: 5, review: "great" },
      });
      submitProjectReview(req, res, next);
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(201);
      expect(Review.aggregate).toHaveBeenCalled();
      expect(Purchase.aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            $match: expect.objectContaining({ status: "CONFIRMED" }),
          }),
        ])
      );
      expect(Sales.updateOne).toHaveBeenCalledWith(
        { userId: expect.anything() },
        expect.objectContaining({
          $set: expect.objectContaining({
            customer_rating: expect.any(Number),
          }),
          $setOnInsert: expect.any(Object),
        }),
        { upsert: true }
      );
    });
  });

  describe("updateProjectReview (PUT /reviews/project)", () => {
    it("returns 404 when project is not found", async () => {
      mockProjectFindById(null);
      const req = makeReq({
        body: { project_id: VALID_PROJECT_ID, rating: 3, review: "test" },
      });
      updateProjectReview(req, res, next);
      await flushPromises();

      expect(Purchase.findOne).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 403 if user did not purchase project in confirmed state", async () => {
      mockProjectFindById({
        _id: VALID_PROJECT_ID,
        userid: VALID_SELLER_ID,
        price: 49,
      });
      mockPurchaseFindOne(null);
      const req = makeReq({
        body: { project_id: VALID_PROJECT_ID, rating: 4, review: "text" },
      });
      updateProjectReview(req, res, next);
      await flushPromises();

      expect(Purchase.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ status: "CONFIRMED" })
      );
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("allows updating an existing review for a free project without a purchase", async () => {
      mockProjectFindById({
        _id: VALID_PROJECT_ID,
        userid: VALID_SELLER_ID,
        price: 0,
      });
      vi.mocked(Review.findOneAndUpdate).mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          _id: VALID_REVIEW_ID,
          userId: VALID_USER_ID,
          projectId: VALID_PROJECT_ID,
          rating: 4,
          review: "updated free review",
        }),
      } as any);

      const req = makeReq({
        body: {
          project_id: VALID_PROJECT_ID,
          rating: 4,
          review: "updated free review",
        },
      });
      updateProjectReview(req, res, next);
      await flushPromises();

      expect(Purchase.findOne).not.toHaveBeenCalled();
      expect(Review.findOneAndUpdate).toHaveBeenCalledWith(
        {
          userId: expect.anything(),
          projectId: expect.anything(),
        },
        { $set: { rating: 4, review: "updated free review" } },
        { new: true, runValidators: true }
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("returns 404 when trying to update a non-existent review", async () => {
      mockProjectFindById({
        _id: VALID_PROJECT_ID,
        userid: VALID_SELLER_ID,
        price: 49,
      });
      mockPurchaseFindOne({ _id: "purchase_1" });
      vi.mocked(Review.findOneAndUpdate).mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      } as any);

      const req = makeReq({
        body: { project_id: VALID_PROJECT_ID, rating: 3, review: "" },
      });
      updateProjectReview(req, res, next);
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("updates existing review and recalculates aggregates", async () => {
      mockProjectFindById({
        _id: VALID_PROJECT_ID,
        userid: VALID_SELLER_ID,
        price: 49,
      });
      mockPurchaseFindOne({ _id: "purchase_1" });
      vi.mocked(Review.findOneAndUpdate).mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          _id: VALID_REVIEW_ID,
          userId: VALID_USER_ID,
          projectId: VALID_PROJECT_ID,
          rating: 2,
          review: "changed",
        }),
      } as any);

      const req = makeReq({
        body: { project_id: VALID_PROJECT_ID, rating: 2, review: "changed" },
      });
      updateProjectReview(req, res, next);
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(200);
      expect(Review.aggregate).toHaveBeenCalled();
      expect(Project.findByIdAndUpdate).toHaveBeenCalled();
    });
  });

  describe("deleteProjectReview (DELETE /reviews/project)", () => {
    it("returns 404 when review does not exist", async () => {
      vi.mocked(Review.findOneAndDelete).mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      } as any);

      const req = makeReq({ body: { project_id: VALID_PROJECT_ID } });
      deleteProjectReview(req, res, next);
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("allows deleting an existing review on a now-paid project without purchase validation", async () => {
      vi.mocked(Review.findOneAndDelete).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ _id: VALID_REVIEW_ID }),
      } as any);

      const req = makeReq({ body: { project_id: VALID_PROJECT_ID } });
      deleteProjectReview(req, res, next);
      await flushPromises();

      expect(Purchase.findOne).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(Review.aggregate).toHaveBeenCalled();
    });

    it("deletes review and recomputes aggregates", async () => {
      vi.mocked(Review.findOneAndDelete).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ _id: VALID_REVIEW_ID }),
      } as any);

      const req = makeReq({ body: { project_id: VALID_PROJECT_ID } });
      deleteProjectReview(req, res, next);
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(200);
      expect(Review.aggregate).toHaveBeenCalled();
      expect(Sales.updateOne).toHaveBeenCalled();
    });

    it("falls back to purchase seller resolution when project is missing", async () => {
      vi.mocked(Review.findOneAndDelete).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ _id: VALID_REVIEW_ID }),
      } as any);

      vi.mocked(Project.findByIdAndUpdate).mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(null),
        }),
      } as any);

      vi.mocked(Purchase.findOne).mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({ sellerId: VALID_SELLER_ID }),
        }),
      } as any);

      vi.mocked(Purchase.aggregate).mockResolvedValue([
        { _id: null, avgRating: 4.2, totalReviews: 5 },
      ] as any);

      const req = makeReq({ body: { project_id: VALID_PROJECT_ID } });
      deleteProjectReview(req, res, next);
      await flushPromises();

      expect(Purchase.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: expect.anything(),
          status: "CONFIRMED",
        })
      );
      expect(Sales.updateOne).toHaveBeenCalledWith(
        { userId: expect.anything() },
        expect.objectContaining({
          $set: expect.objectContaining({ customer_rating: 4.2 }),
        }),
        { upsert: true }
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("does not inflate rating when no attributable reviews are found", async () => {
      vi.mocked(Review.findOneAndDelete).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ _id: VALID_REVIEW_ID }),
      } as any);

      vi.mocked(Purchase.aggregate).mockResolvedValue([] as any);

      const req = makeReq({ body: { project_id: VALID_PROJECT_ID } });
      deleteProjectReview(req, res, next);
      await flushPromises();

      expect(Sales.updateOne).toHaveBeenCalledWith(
        { userId: expect.anything() },
        expect.objectContaining({
          $set: expect.objectContaining({
            customer_rating: 0,
            best_seller: "",
          }),
        }),
        { upsert: true }
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("getProjectReviews (GET /reviews/project)", () => {
    it("returns paginated reviews with populated authors", async () => {
      vi.mocked(Review.find).mockReturnValue({
        populate: vi.fn().mockReturnValue({
          sort: vi.fn().mockReturnValue({
            skip: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                lean: vi.fn().mockResolvedValue([
                  {
                    _id: VALID_REVIEW_ID,
                    rating: 5,
                    review: "solid",
                    userId: {
                      _id: VALID_USER_ID,
                      username: "buyer",
                      name: "Buyer",
                      profile_image_url: "https://img.test/buyer.png",
                    },
                  },
                ]),
              }),
            }),
          }),
        }),
      } as any);
      vi.mocked(Review.countDocuments).mockResolvedValue(1 as any);

      const req = makeReq({
        query: { project_id: VALID_PROJECT_ID, offset: "0", limit: "10" },
      });
      getProjectReviews(req, res, next);
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            reviews: expect.any(Array),
            pagination: expect.objectContaining({ total: 1 }),
          }),
        })
      );
    });
  });

  describe("getMyProjectReview (GET /reviews/my-review)", () => {
    it("returns review with populated user identity for 'Your Review' card", async () => {
      vi.mocked(Review.findOne).mockReturnValue({
        populate: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({
            _id: VALID_REVIEW_ID,
            projectId: VALID_PROJECT_ID,
            rating: 5,
            review: "great",
            userId: {
              _id: VALID_USER_ID,
              username: "buyer",
              name: "Buyer Name",
              profile_image_url: "https://img.test/buyer.png",
            },
          }),
        }),
      } as any);

      const req = makeReq({ query: { project_id: VALID_PROJECT_ID } });
      getMyProjectReview(req, res, next);
      await flushPromises();

      expect(Review.findOne).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            review: expect.objectContaining({
              userId: expect.objectContaining({
                username: "buyer",
                profile_image_url: "https://img.test/buyer.png",
              }),
            }),
          }),
        })
      );
    });
  });
});
