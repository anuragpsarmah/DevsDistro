import { NextFunction, Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler.util";
import { privateRepoPrefix } from "../utils/redisPrefixGenerator.util";
import { redisClient } from "..";
import response from "../utils/response.util";
import logger from "../logger/logger";
import ApiError from "../utils/ApiError.util";

const getPrivateReposFromCache = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new ApiError("Error during validation", 401);
    }

    const page = parseInt(req.query.page as string) || 1;
    const redisKey = privateRepoPrefix(req.user._id);

    try {
      if (req.query.refreshStatus === "true") {
        if (req.rateLimited) {
          const cachedData = await redisClient.hget(redisKey, `page:${page}`);
          if (cachedData) {
            const parsed = JSON.parse(cachedData);
            response(
              res,
              200,
              req.rateLimitMessage || "Too many requests. Cached data fetched.",
              { ...parsed, isRateLimited: true }
            );
            return;
          }
          response(
            res,
            429,
            "Too many refresh requests and no cached data available",
            null
          );
          return;
        }

        await redisClient.del(redisKey);
        next();
        return;
      }

      const cachedData = await redisClient.hget(redisKey, `page:${page}`);

      if (cachedData) {
        response(res, 200, "Repos fetched from cache", JSON.parse(cachedData));
        return;
      }

      next();
    } catch (error) {
      logger.error("Redis error:", error);

      if (req.rateLimited) {
        response(res, 429, "Too many requests and cache unavailable", null);
        return;
      }

      next();
    }
  }
);

export { getPrivateReposFromCache };
