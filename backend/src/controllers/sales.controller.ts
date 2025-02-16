import { Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler.util";
import ApiError from "../utils/ApiError.util";
import mongoose from "mongoose";
import { Sales } from "../models/sales.model";
import response from "../utils/response.util";
import logger from "../logger/logger";

const getCommonSalesInformation = asyncHandler(
  async (req: Request, res: Response) => {
    if (req.user) {
      const userId = new mongoose.Types.ObjectId(req.user._id);

      try {
        const salesData = await Sales.findOne({ userId }).select(
          "-userId -_id -__v -createdAt -updatedAt"
        );

        if (!salesData) {
          response(res, 200, "Data fetched successfully with default values", {
            total_sales: 0,
            active_projects: 0,
            customer_rating: 0,
            best_seller: "",
          });
          return;
        }

        response(res, 200, "Data fetched sucessfully", salesData);
      } catch (error) {
        logger.error("Error fetching sales data", error);
        throw new ApiError("Error fetching data", 500);
      }
    } else {
      throw new ApiError("Error during validation", 401);
    }
  }
);

const getYearlySalesInformation = asyncHandler(
  async (req: Request, res: Response) => {
    if (req.user) {
      const userId = new mongoose.Types.ObjectId(req.user._id);
      const year = parseInt(req.query.year as string);

      if (!year || isNaN(year)) {
        throw new ApiError("Valid year parameter is required", 400);
      }

      try {
        const yearlySalesData = await Sales.findOne(
          { userId },
          {
            yearly_sales: {
              $elemMatch: { year: year },
            },
          }
        ).select(
          "-_id -__v -createdAt -updatedAt -userId -total_sales -active_projects -customer_rating -best_seller"
        );

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

          response(res, 200, "Data fetched successfully with default values", {
            year: year,
            monthly_sales: defaultMonthlySales,
          });
        } else {
          response(
            res,
            200,
            "Data fetched successfully",
            yearlySalesData.yearly_sales[0]
          );
        }
      } catch (error) {
        logger.error("Error fetching yearly sales data", error);
        throw new ApiError("Error fetching data", 500);
      }
    } else {
      throw new ApiError("Error during validation", 401);
    }
  }
);

export { getCommonSalesInformation, getYearlySalesInformation };
