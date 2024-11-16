import { NextFunction, Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler.util";
import { privateRepoPrefix } from "../utils/redisPrefixGenerator.util";
import { redisClient } from "..";
import response from "../utils/response.util";
import logger from "../logger/winston.logger";
import ApiError from "../utils/ApiError.util";

const getPrivateReposFromCache = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    if (req.user) {
      const redisKey = privateRepoPrefix(req.user._id);

      if (req.query.refreshStatus === "false") {
        try {
          const cached_private_repositories = await redisClient.get(redisKey);
          if (cached_private_repositories) {
            response(
              res,
              200,
              "Repos fetched from cache successfully",
              JSON.parse(cached_private_repositories)
            );
            return;
          }
        } catch (error) {
          logger.error("Redis error:", error);
        }
      }

      next();
    } else {
      throw new ApiError("Error during validation", 401);
    }
  }
);

export { getPrivateReposFromCache };
