import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../models/sales.model", () => ({
  Sales: { findOne: vi.fn() },
}));

vi.mock("../models/purchase.model", () => ({
  Purchase: { aggregate: vi.fn() },
}));

vi.mock("../models/project.model", () => ({
  Project: { countDocuments: vi.fn() },
}));

vi.mock("../logger/logger", () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("../utils/asyncContext", () => ({
  enrichContext: vi.fn(),
}));

import {
  getCommonSalesInformation,
  getYearlySalesInformation,
  getSalesTransactions,
} from "../controllers/sales.controller";
import { Sales } from "../models/sales.model";
import { Purchase } from "../models/purchase.model";
import { Project } from "../models/project.model";

const VALID_USER_ID = "507f1f77bcf86cd799439011";

const flushPromises = () =>
  new Promise<void>((resolve) => setImmediate(resolve));

const makeReq = (overrides: Record<string, any> = {}) =>
  ({
    user: { _id: VALID_USER_ID },
    query: {},
    body: {},
    ...overrides,
  }) as any;

const makeRes = () => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

const next = vi.fn();

const mockSalesFindOne = (value: any, shouldReject = false) => {
  const select = shouldReject
    ? vi.fn().mockRejectedValue(value)
    : vi.fn().mockResolvedValue(value);
  vi.mocked(Sales.findOne).mockReturnValue({ select } as any);
};

describe("sales.controller :: getCommonSalesInformation", () => {
  let res: any;

  beforeEach(() => {
    vi.clearAllMocks();
    res = makeRes();
  });

  it("returns 401 when user is unauthenticated", async () => {
    const req = makeReq({ user: undefined });
    getCommonSalesInformation(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(401);
    expect(Purchase.aggregate).not.toHaveBeenCalled();
    expect(Project.countDocuments).not.toHaveBeenCalled();
  });

  it("returns zeroed defaults when seller has no sales document and no purchases", async () => {
    mockSalesFindOne(null);
    vi.mocked(Purchase.aggregate).mockResolvedValue([] as any);
    vi.mocked(Project.countDocuments).mockResolvedValue(0 as any);

    const req = makeReq();
    getCommonSalesInformation(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          total_sales: 0,
          active_projects: 0,
          customer_rating: 0,
          best_seller: "",
        },
      })
    );
  });

  it("computes total_sales and best_seller from confirmed purchases and keeps customer_rating from Sales", async () => {
    mockSalesFindOne({
      customer_rating: 4.6,
      total_sales: 9999, // should be ignored in response in favor of purchase aggregation
      best_seller: "stale",
      active_projects: 999,
    });
    vi.mocked(Purchase.aggregate).mockResolvedValue([
      {
        _id: "projectB",
        salesCount: 5,
        revenue: 250,
        latestTitle: "Project B",
      },
      {
        _id: "projectA",
        salesCount: 3,
        revenue: 150,
        latestTitle: "Project A",
      },
    ] as any);
    vi.mocked(Project.countDocuments).mockResolvedValue(3 as any);

    const req = makeReq();
    getCommonSalesInformation(req, res, next);
    await flushPromises();

    expect(Project.countDocuments).toHaveBeenCalledWith({
      userid: expect.anything(),
      isActive: true,
      github_access_revoked: false,
      repo_zip_status: "SUCCESS",
    });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          total_sales: 400,
          active_projects: 3,
          customer_rating: 4.6,
          best_seller: "Project B",
        },
      })
    );
  });

  it("falls back to zero revenue and empty best_seller when purchase aggregation fails", async () => {
    mockSalesFindOne({ customer_rating: 4.2 });
    vi.mocked(Purchase.aggregate).mockRejectedValue(
      new Error("aggregation failed")
    );
    vi.mocked(Project.countDocuments).mockResolvedValue(2 as any);

    const req = makeReq();
    getCommonSalesInformation(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          total_sales: 0,
          active_projects: 2,
          customer_rating: 4.2,
          best_seller: "",
        },
      })
    );
  });

  it("falls back to active_projects=0 when active project count query fails", async () => {
    mockSalesFindOne({ customer_rating: 4.9 });
    vi.mocked(Purchase.aggregate).mockResolvedValue([
      {
        _id: "project1",
        salesCount: 1,
        revenue: 50,
        latestTitle: "Only Project",
      },
    ] as any);
    vi.mocked(Project.countDocuments).mockRejectedValue(
      new Error("count failed")
    );

    const req = makeReq();
    getCommonSalesInformation(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          total_sales: 50,
          active_projects: 0,
          customer_rating: 4.9,
          best_seller: "Only Project",
        },
      })
    );
  });

  it("uses deterministic best-seller aggregation pipeline with tie-breakers", async () => {
    mockSalesFindOne({ customer_rating: 3.8 });
    vi.mocked(Purchase.aggregate).mockResolvedValue([] as any);
    vi.mocked(Project.countDocuments).mockResolvedValue(0 as any);

    const req = makeReq();
    getCommonSalesInformation(req, res, next);
    await flushPromises();

    expect(Purchase.aggregate).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          $match: expect.objectContaining({ status: "CONFIRMED" }),
        }),
        expect.objectContaining({ $sort: { createdAt: -1 } }),
        expect.objectContaining({
          $group: expect.objectContaining({
            _id: "$projectId",
            salesCount: { $sum: 1 },
            revenue: { $sum: "$price_usd" },
            latestTitle: { $first: "$project_snapshot.title" },
          }),
        }),
        expect.objectContaining({
          $sort: { salesCount: -1, latestPurchaseAt: -1, latestTitle: 1 },
        }),
      ])
    );
  });
});

describe("sales.controller :: getSalesTransactions", () => {
  let res: any;

  beforeEach(() => {
    vi.clearAllMocks();
    res = makeRes();
  });

  it("returns 401 when user is unauthenticated", async () => {
    const req = makeReq({ user: undefined });
    getSalesTransactions(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(401);
    expect(Purchase.aggregate).not.toHaveBeenCalled();
  });

  it("returns first page with cursor and has_more=true", async () => {
    const rows = Array.from({ length: 21 }).map((_, index) => ({
      _id: `507f1f77bcf86cd7994390${(index + 10).toString().padStart(2, "0")}`,
      createdAt: new Date(
        `2025-01-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`
      ),
      tx_signature: `sig_${index}`,
      price_usd: 10 + index,
      price_sol_total: 0.1 + index,
      price_sol_seller: 0.09 + index,
      project_snapshot: {
        title: `Project ${index}`,
        project_type: "Web Application",
      },
      projectId: {
        _id: `proj_${index}`,
        title: `Project ${index}`,
        project_type: "Web Application",
      },
      buyer_username: `buyer_${index}`,
      is_unlisted: false,
    }));

    vi.mocked(Purchase.aggregate)
      .mockResolvedValueOnce(rows as any)
      .mockResolvedValueOnce([
        { value: "project_1", label: "Project 1" },
      ] as any);

    const req = makeReq({ query: {} });
    getSalesTransactions(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          transactions: expect.any(Array),
          has_more: true,
          next_cursor: expect.objectContaining({
            cursor_created_at: expect.any(Date),
            cursor_id: expect.any(String),
          }),
        }),
      })
    );

    const payload = res.json.mock.calls[0][0].data;
    expect(payload.transactions).toHaveLength(20);
  });

  it("applies cursor pagination conditions when cursor is provided", async () => {
    vi.mocked(Purchase.aggregate)
      .mockResolvedValueOnce([] as any)
      .mockResolvedValueOnce([] as any);

    const req = makeReq({
      query: {
        cursor_created_at: "2026-01-10T00:00:00.000Z",
        cursor_id: "507f1f77bcf86cd799439099",
      },
    });
    getSalesTransactions(req, res, next);
    await flushPromises();

    expect(Purchase.aggregate).toHaveBeenCalled();
    const firstCallPipeline = vi.mocked(Purchase.aggregate).mock
      .calls[0][0] as any[];
    expect(firstCallPipeline).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          $match: expect.objectContaining({
            $or: expect.any(Array),
          }),
        }),
      ])
    );
  });

  it("applies unlisted filter in aggregation pipeline", async () => {
    vi.mocked(Purchase.aggregate)
      .mockResolvedValueOnce([] as any)
      .mockResolvedValueOnce([] as any);

    const req = makeReq({ query: { project_filter: "unlisted" } });
    getSalesTransactions(req, res, next);
    await flushPromises();

    const firstCallPipeline = vi.mocked(Purchase.aggregate).mock
      .calls[0][0] as any[];
    expect(firstCallPipeline).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          $match: { projectDoc: null },
        }),
      ])
    );
  });

  it("returns 400 for invalid project filter", async () => {
    const req = makeReq({ query: { project_filter: "bad-filter-value" } });
    getSalesTransactions(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(Purchase.aggregate).not.toHaveBeenCalled();
  });

  it("returns 500 when transactions aggregation fails", async () => {
    vi.mocked(Purchase.aggregate).mockRejectedValueOnce(new Error("db failed"));

    const req = makeReq({ query: {} });
    getSalesTransactions(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("returns 400 when only cursor_created_at is provided without cursor_id", async () => {
    const req = makeReq({
      query: { cursor_created_at: "2025-01-01T00:00:00.000Z" },
    });
    getSalesTransactions(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(Purchase.aggregate).not.toHaveBeenCalled();
  });

  it("returns 400 when only cursor_id is provided without cursor_created_at", async () => {
    const req = makeReq({ query: { cursor_id: VALID_USER_ID } });
    getSalesTransactions(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(Purchase.aggregate).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid date_preset value", async () => {
    const req = makeReq({ query: { date_preset: "yesterday" } });
    getSalesTransactions(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(Purchase.aggregate).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid cursor_created_at (non-date string)", async () => {
    const req = makeReq({
      query: { cursor_created_at: "not-a-date", cursor_id: VALID_USER_ID },
    });
    getSalesTransactions(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(Purchase.aggregate).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid cursor_id (non-ObjectId string)", async () => {
    const req = makeReq({
      query: {
        cursor_created_at: "2025-01-01T00:00:00.000Z",
        cursor_id: "bad-id",
      },
    });
    getSalesTransactions(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(Purchase.aggregate).not.toHaveBeenCalled();
  });

  it("returns last page with has_more=false and next_cursor=null", async () => {
    const singleRow = {
      _id: "507f1f77bcf86cd799439010",
      createdAt: new Date("2025-06-15T00:00:00.000Z"),
      tx_signature: "sig_0",
      price_usd: 99,
      price_sol_total: 1.0,
      price_sol_seller: 0.99,
      project_snapshot: {
        title: "Only Project",
        project_type: "Web Application",
      },
      projectId: {
        _id: "proj_0",
        title: "Only Project",
        project_type: "Web Application",
      },
      buyer_username: "buyer_0",
      is_unlisted: false,
    };

    vi.mocked(Purchase.aggregate)
      .mockResolvedValueOnce([singleRow] as any)
      .mockResolvedValueOnce([
        { value: "proj_0", label: "Only Project" },
      ] as any);

    const req = makeReq({ query: {} });
    getSalesTransactions(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(200);
    const payload = res.json.mock.calls[0][0].data;
    expect(payload.has_more).toBe(false);
    expect(payload.next_cursor).toBeNull();
    expect(payload.transactions).toHaveLength(1);
  });

  it("injects specific project ObjectId filter into pipeline when project_filter is a valid ObjectId", async () => {
    vi.mocked(Purchase.aggregate)
      .mockResolvedValueOnce([] as any)
      .mockResolvedValueOnce([] as any);

    const req = makeReq({ query: { project_filter: VALID_USER_ID } });
    getSalesTransactions(req, res, next);
    await flushPromises();

    expect(Purchase.aggregate).toHaveBeenCalled();
    const pipeline = vi.mocked(Purchase.aggregate).mock.calls[0][0] as any[];
    const baseMatchStage = pipeline[0];
    expect(baseMatchStage.$match).toHaveProperty("projectId");
  });

  it("returns 200 with only All/Unlisted project options when project options aggregation fails", async () => {
    const singleRow = {
      _id: "507f1f77bcf86cd799439010",
      createdAt: new Date("2025-06-15T00:00:00.000Z"),
      tx_signature: "sig_0",
      price_usd: 99,
      price_sol_total: 1.0,
      price_sol_seller: 0.99,
      project_snapshot: {
        title: "Only Project",
        project_type: "Web Application",
      },
      projectId: null,
      buyer_username: "buyer_0",
      is_unlisted: true,
    };

    vi.mocked(Purchase.aggregate)
      .mockResolvedValueOnce([singleRow] as any)
      .mockRejectedValueOnce(new Error("options agg failed"));

    const req = makeReq({ query: {} });
    getSalesTransactions(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(200);
    const payload = res.json.mock.calls[0][0].data;
    expect(payload.filter_meta.project_options).toEqual([
      { value: "all", label: "All Projects" },
      { value: "unlisted", label: "Unlisted" },
    ]);
  });
});

describe("sales.controller :: getCommonSalesInformation (additional)", () => {
  let res: any;

  beforeEach(() => {
    vi.clearAllMocks();
    res = makeRes();
  });

  it("returns 500 when Sales.findOne throws a database error", async () => {
    mockSalesFindOne(new Error("db connection failed"), true);

    const req = makeReq();
    getCommonSalesInformation(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(500);
    expect(Purchase.aggregate).not.toHaveBeenCalled();
    expect(Project.countDocuments).not.toHaveBeenCalled();
  });
});

describe("sales.controller :: getYearlySalesInformation", () => {
  let res: any;

  beforeEach(() => {
    vi.clearAllMocks();
    res = makeRes();
  });

  it("returns 401 when user is unauthenticated", async () => {
    const req = makeReq({ user: undefined, query: { year: "2025" } });
    getYearlySalesInformation(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(401);
    expect(Sales.findOne).not.toHaveBeenCalled();
  });

  it("returns 400 when year query param is missing", async () => {
    const req = makeReq({ query: {} });
    getYearlySalesInformation(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(Sales.findOne).not.toHaveBeenCalled();
  });

  it("returns 400 when year is a non-numeric string", async () => {
    const req = makeReq({ query: { year: "abc" } });
    getYearlySalesInformation(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(Sales.findOne).not.toHaveBeenCalled();
  });

  it("returns 500 when Sales.findOne throws", async () => {
    mockSalesFindOne(new Error("db failure"), true);

    const req = makeReq({ query: { year: "2025" } });
    getYearlySalesInformation(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("returns default 12 zero-sales months when no Sales document exists for user", async () => {
    mockSalesFindOne(null);

    const req = makeReq({ query: { year: "2025" } });
    getYearlySalesInformation(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(200);
    const payload = res.json.mock.calls[0][0].data;
    expect(payload.year).toBe(2025);
    expect(payload.monthly_sales).toHaveLength(12);
    expect(payload.monthly_sales.every((m: any) => m.sales === 0)).toBe(true);
  });

  it("returns default 12 zero-sales months when Sales doc exists but has no entry for requested year", async () => {
    mockSalesFindOne({ yearly_sales: [] });

    const req = makeReq({ query: { year: "2023" } });
    getYearlySalesInformation(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(200);
    const payload = res.json.mock.calls[0][0].data;
    expect(payload.year).toBe(2023);
    expect(payload.monthly_sales).toHaveLength(12);
    expect(payload.monthly_sales.every((m: any) => m.sales === 0)).toBe(true);
  });

  it("returns stored monthly_sales when year data exists in Sales document", async () => {
    const storedMonthlySales = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      sales: (i + 1) * 100,
    }));
    mockSalesFindOne({
      yearly_sales: [{ year: 2025, monthly_sales: storedMonthlySales }],
    });

    const req = makeReq({ query: { year: "2025" } });
    getYearlySalesInformation(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(200);
    const payload = res.json.mock.calls[0][0].data;
    expect(payload.monthly_sales).toHaveLength(12);
    expect(payload.monthly_sales[0].sales).toBe(100);
    expect(payload.monthly_sales[11].sales).toBe(1200);
  });

  it("default monthly_sales entries have month numbers 1 through 12 in order", async () => {
    mockSalesFindOne(null);

    const req = makeReq({ query: { year: "2025" } });
    getYearlySalesInformation(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(200);
    const { monthly_sales } = res.json.mock.calls[0][0].data;
    expect(monthly_sales.map((m: any) => m.month)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
    ]);
  });
});
