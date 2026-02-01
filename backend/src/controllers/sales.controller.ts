import { Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler.util";
import ApiError from "../utils/ApiError.util";
import mongoose from "mongoose";
import { Sales } from "../models/sales.model";
import response from "../utils/response.util";
import logger from "../logger/logger";
import { tryCatch } from "../utils/tryCatch.util";
import { enrichContext } from "../utils/asyncContext";

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
    enrichContext({ db_latency_ms: Math.round(performance.now() - dbStartTime) });

    if (error) {
      enrichContext({
        outcome: "error",
        error: { name: "DatabaseError", message: error instanceof Error ? error.message : "Database query failed" },
      });
      logger.error("Failed to fetch sales data", error);
      throw new ApiError("Error fetching data", 500);
    }

    if (!salesData) {
      enrichContext({ outcome: "success", has_sales_data: false });
      response(res, 200, "Data fetched successfully with default values", {
        total_sales: 0,
        active_projects: 0,
        customer_rating: 0,
        best_seller: "",
      });
      return;
    }

    enrichContext({ outcome: "success", has_sales_data: true });
    response(res, 200, "Data fetched sucessfully", salesData);
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
    enrichContext({ db_latency_ms: Math.round(performance.now() - dbStartTime) });

    if (error) {
      enrichContext({
        outcome: "error",
        error: { name: "DatabaseError", message: error instanceof Error ? error.message : "Database query failed" },
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

export { getCommonSalesInformation, getYearlySalesInformation };

