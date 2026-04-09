import { Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler.util";
import ApiError from "../utils/ApiError.util";
import mongoose from "mongoose";
import { Sales } from "../models/sales.model";
import { Purchase } from "../models/purchase.model";
import { Project } from "../models/project.model";
import response from "../utils/response.util";
import logger from "../logger/logger";
import { tryCatch } from "../utils/tryCatch.util";
import { enrichContext } from "../utils/asyncContext";

type DatePreset = "all" | "7d" | "30d" | "thisYear";

const VALID_DATE_PRESETS: DatePreset[] = ["all", "7d", "30d", "thisYear"];

const parseLimit = (limitRaw: unknown): number => {
  const parsed = Number(limitRaw);
  if (Number.isNaN(parsed) || parsed <= 0) return 20;
  return Math.min(Math.floor(parsed), 50);
};

const getDateLowerBound = (preset: DatePreset): Date | null => {
  const now = new Date();

  if (preset === "7d") {
    const lower = new Date(now);
    lower.setDate(lower.getDate() - 7);
    return lower;
  }

  if (preset === "30d") {
    const lower = new Date(now);
    lower.setDate(lower.getDate() - 30);
    return lower;
  }

  if (preset === "thisYear") {
    return new Date(Date.UTC(now.getUTCFullYear(), 0, 1, 0, 0, 0, 0));
  }

  return null;
};

const getCommonSalesInformation = asyncHandler(
  async (req: Request, res: Response) => {
    enrichContext({ action: "get_sales" });

    if (!req.user) {
      enrichContext({ outcome: "unauthorized" });
      throw new ApiError("Error during validation", 401);
    }

    const userId = new mongoose.Types.ObjectId(req.user._id);
    enrichContext({ entity: { type: "sales_data", id: userId.toString() } });

    const dbStartTime = performance.now();
    const [salesData, error] = await tryCatch(
      Sales.findOne({ userId }).select(
        "-userId -_id -__v -createdAt -updatedAt"
      )
    );
    enrichContext({
      db_latency_ms: Math.round(performance.now() - dbStartTime),
    });

    if (error) {
      enrichContext({
        outcome: "error",
        error: {
          name: "DatabaseError",
          message:
            error instanceof Error ? error.message : "Database query failed",
        },
      });
      logger.error("Failed to fetch sales data", error);
      throw new ApiError("Error fetching data", 500);
    }

    const [purchaseMetrics, purchaseMetricsError] = await tryCatch(
      Purchase.aggregate([
        {
          $match: {
            sellerId: userId,
            status: "CONFIRMED",
          },
        },
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: "$projectId",
            salesCount: { $sum: 1 },
            revenue: { $sum: "$price_usd" },
            latestTitle: { $first: "$project_snapshot.title" },
            latestPurchaseAt: { $first: "$createdAt" },
          },
        },
        { $sort: { salesCount: -1, latestPurchaseAt: -1, latestTitle: 1 } },
      ])
    );

    if (purchaseMetricsError) {
      logger.error(
        "Failed to aggregate purchase metrics",
        purchaseMetricsError
      );
    }

    const [activeProjects, activeProjectsError] = await tryCatch(
      Project.countDocuments({
        userid: userId,
        isActive: true,
        github_access_revoked: false,
        repo_zip_status: "SUCCESS",
      })
    );

    if (activeProjectsError) {
      logger.error(
        "Failed to count active marketplace projects",
        activeProjectsError
      );
    }

    const safePurchaseMetrics = purchaseMetricsError
      ? []
      : purchaseMetrics || [];
    const computedTotalSales = safePurchaseMetrics.reduce(
      (sum: number, item: any) => sum + ((item?.revenue as number) || 0),
      0
    );
    const computedBestSeller =
      safePurchaseMetrics.length > 0
        ? safePurchaseMetrics[0]?.latestTitle || ""
        : "";

    const payload = {
      total_sales: computedTotalSales,
      active_projects: activeProjectsError ? 0 : activeProjects || 0,
      customer_rating: salesData?.customer_rating || 0,
      best_seller: computedBestSeller,
    };

    enrichContext({
      outcome: "success",
      has_sales_data: Boolean(salesData),
      has_purchase_metrics: !purchaseMetricsError,
      has_active_projects_count: !activeProjectsError,
    });
    response(
      res,
      200,
      salesData
        ? "Data fetched sucessfully"
        : "Data fetched successfully with default values",
      payload
    );
  }
);

const getYearlySalesInformation = asyncHandler(
  async (req: Request, res: Response) => {
    enrichContext({ action: "get_yearly_sales" });

    if (!req.user) {
      enrichContext({ outcome: "unauthorized" });
      throw new ApiError("Error during validation", 401);
    }

    const userId = new mongoose.Types.ObjectId(req.user._id);
    const year = parseInt(req.query.year as string);

    if (!year || isNaN(year)) {
      enrichContext({ outcome: "validation_failed", reason: "invalid_year" });
      throw new ApiError("Valid year parameter is required", 400);
    }

    enrichContext({
      entity: { type: "yearly_sales", id: userId.toString() },
      query_params: { year },
    });

    const dbStartTime = performance.now();
    const [yearlySalesData, error] = await tryCatch(
      Sales.findOne(
        { userId },
        {
          yearly_sales: {
            $elemMatch: { year: year },
          },
        }
      ).select(
        "-_id -__v -createdAt -updatedAt -userId -total_sales -active_projects -customer_rating -best_seller"
      )
    );
    enrichContext({
      db_latency_ms: Math.round(performance.now() - dbStartTime),
    });

    if (error) {
      enrichContext({
        outcome: "error",
        error: {
          name: "DatabaseError",
          message:
            error instanceof Error ? error.message : "Database query failed",
        },
      });
      logger.error("Failed to fetch yearly sales data", error);
      throw new ApiError("Error fetching data", 500);
    }

    if (
      !yearlySalesData ||
      !yearlySalesData.yearly_sales ||
      yearlySalesData.yearly_sales.length === 0
    ) {
      const defaultMonthlySales = Array(12)
        .fill(undefined)
        .map((_, index) => {
          return { month: index + 1, sales: 0 };
        });

      enrichContext({ outcome: "success", has_yearly_data: false });
      response(res, 200, "Data fetched successfully with default values", {
        year: year,
        monthly_sales: defaultMonthlySales,
      });
    } else {
      enrichContext({ outcome: "success", has_yearly_data: true });
      response(
        res,
        200,
        "Data fetched successfully",
        yearlySalesData.yearly_sales[0]
      );
    }
  }
);

const getSalesTransactions = asyncHandler(
  async (req: Request, res: Response) => {
    enrichContext({ action: "get_sales_transactions" });

    if (!req.user) {
      enrichContext({ outcome: "unauthorized" });
      throw new ApiError("Error during validation", 401);
    }

    const userId = new mongoose.Types.ObjectId(req.user._id);
    const limit = parseLimit(req.query.limit);

    const datePresetRaw = (req.query.date_preset as string) || "all";
    if (!VALID_DATE_PRESETS.includes(datePresetRaw as DatePreset)) {
      response(res, 400, "Invalid date_preset. Use all, 7d, 30d, or thisYear.");
      return;
    }
    const datePreset = datePresetRaw as DatePreset;

    const projectFilterRaw = (req.query.project_filter as string) || "all";
    const isProjectFilterAll = projectFilterRaw === "all";
    const isProjectFilterUnlisted = projectFilterRaw === "unlisted";
    const isProjectFilterProjectId =
      !isProjectFilterAll &&
      !isProjectFilterUnlisted &&
      mongoose.Types.ObjectId.isValid(projectFilterRaw);

    if (
      !isProjectFilterAll &&
      !isProjectFilterUnlisted &&
      !isProjectFilterProjectId
    ) {
      response(
        res,
        400,
        "Invalid project_filter. Use all, unlisted, or a valid project id."
      );
      return;
    }

    const cursorCreatedAtRaw = req.query.cursor_created_at as
      | string
      | undefined;
    const cursorIdRaw = req.query.cursor_id as string | undefined;

    if (
      (cursorCreatedAtRaw && !cursorIdRaw) ||
      (!cursorCreatedAtRaw && cursorIdRaw)
    ) {
      response(
        res,
        400,
        "Both cursor_created_at and cursor_id are required together."
      );
      return;
    }

    let cursorCreatedAt: Date | null = null;
    let cursorId: mongoose.Types.ObjectId | null = null;

    if (cursorCreatedAtRaw && cursorIdRaw) {
      cursorCreatedAt = new Date(cursorCreatedAtRaw);
      if (Number.isNaN(cursorCreatedAt.getTime())) {
        response(res, 400, "Invalid cursor_created_at value.");
        return;
      }
      if (!mongoose.Types.ObjectId.isValid(cursorIdRaw)) {
        response(res, 400, "Invalid cursor_id value.");
        return;
      }
      cursorId = new mongoose.Types.ObjectId(cursorIdRaw);
    }

    const baseMatch: Record<string, unknown> = {
      sellerId: userId,
      status: "CONFIRMED",
    };

    const dateLowerBound = getDateLowerBound(datePreset);
    if (dateLowerBound) {
      baseMatch.createdAt = { $gte: dateLowerBound };
    }

    if (isProjectFilterProjectId) {
      baseMatch.projectId = new mongoose.Types.ObjectId(projectFilterRaw);
    }

    const pipeline: any[] = [{ $match: baseMatch }];

    if (cursorCreatedAt && cursorId) {
      pipeline.push({
        $match: {
          $or: [
            { createdAt: { $lt: cursorCreatedAt } },
            {
              createdAt: cursorCreatedAt,
              _id: { $lt: cursorId },
            },
          ],
        },
      });
    }

    pipeline.push({ $sort: { createdAt: -1, _id: -1 } });

    // Apply the limit early unless orphan detection needs the project lookup first.
    if (!isProjectFilterUnlisted) {
      pipeline.push({ $limit: limit + 1 });
    }

    pipeline.push(
      {
        $lookup: {
          from: "projects",
          localField: "projectId",
          foreignField: "_id",
          as: "projectDoc",
        },
      },
      {
        $unwind: {
          path: "$projectDoc",
          preserveNullAndEmptyArrays: true,
        },
      }
    );

    if (isProjectFilterUnlisted) {
      pipeline.push(
        {
          $match: {
            projectDoc: null,
          },
        },
        { $limit: limit + 1 }
      );
    }

    pipeline.push(
      {
        $lookup: {
          from: "users",
          localField: "buyerId",
          foreignField: "_id",
          as: "buyerDoc",
        },
      },
      {
        $unwind: {
          path: "$buyerDoc",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          createdAt: 1,
          tx_signature: 1,
          payment_currency: { $ifNull: ["$payment_currency", "SOL"] },
          payment_total: { $ifNull: ["$payment_total", "$price_sol_total"] },
          payment_seller: { $ifNull: ["$payment_seller", "$price_sol_seller"] },
          payment_platform: {
            $ifNull: ["$payment_platform", "$price_sol_platform"],
          },
          payment_mint: { $ifNull: ["$payment_mint", null] },
          price_usd: 1,
          price_sol_total: 1,
          price_sol_seller: 1,
          project_snapshot: 1,
          projectId: {
            $cond: [
              { $ifNull: ["$projectDoc._id", false] },
              {
                _id: "$projectDoc._id",
                title: "$projectDoc.title",
                project_type: "$projectDoc.project_type",
                scheduled_deletion_at: "$projectDoc.scheduled_deletion_at",
              },
              null,
            ],
          },
          buyer_username: { $ifNull: ["$buyerDoc.username", ""] },
        },
      },
      {
        $addFields: {
          is_unlisted: { $eq: ["$projectId", null] },
        },
      }
    );

    const [rows, rowsError] = await tryCatch(Purchase.aggregate(pipeline));
    if (rowsError) {
      logger.error("Failed to fetch seller sales transactions", rowsError);
      throw new ApiError("Error fetching data", 500);
    }

    const safeRows = rows || [];
    const hasMore = safeRows.length > limit;
    const pageRows = hasMore ? safeRows.slice(0, limit) : safeRows;

    const nextCursor = hasMore
      ? {
          cursor_created_at: pageRows[pageRows.length - 1].createdAt,
          cursor_id: pageRows[pageRows.length - 1]._id,
        }
      : null;

    const [projectOptionsAgg, projectOptionsError] = await tryCatch(
      Purchase.aggregate([
        {
          $match: {
            sellerId: userId,
            status: "CONFIRMED",
          },
        },
        {
          $lookup: {
            from: "projects",
            localField: "projectId",
            foreignField: "_id",
            as: "projectDoc",
          },
        },
        {
          $unwind: {
            path: "$projectDoc",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $match: {
            projectDoc: { $ne: null },
          },
        },
        {
          $sort: {
            createdAt: -1,
          },
        },
        {
          $group: {
            _id: "$projectDoc._id",
            label: { $first: "$projectDoc.title" },
          },
        },
        {
          $project: {
            _id: 0,
            value: { $toString: "$_id" },
            label: 1,
          },
        },
        {
          $sort: {
            label: 1,
          },
        },
      ])
    );

    if (projectOptionsError) {
      logger.error(
        "Failed to fetch project filter options for sales transactions",
        projectOptionsError
      );
    }

    const projectOptions = [
      { value: "all", label: "All Projects" },
      ...(projectOptionsError ? [] : projectOptionsAgg || []),
      { value: "unlisted", label: "Unlisted" },
    ];

    response(res, 200, "Sales transactions fetched successfully", {
      transactions: pageRows,
      next_cursor: nextCursor,
      has_more: hasMore,
      filter_meta: {
        project_options: projectOptions,
        selected_filters: {
          date_preset: datePreset,
          project_filter: projectFilterRaw,
          limit,
        },
      },
    });
  }
);

export {
  getCommonSalesInformation,
  getYearlySalesInformation,
  getSalesTransactions,
};
