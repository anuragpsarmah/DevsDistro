import jwt, { JwtPayload } from "jsonwebtoken";
import asyncHandler from "../utils/asyncHandler.util";
import { NextFunction, Request, Response } from "express";
import response from "../utils/response.util";
import ApiError from "../utils/ApiError.util";
import { enrichContext } from "../utils/asyncContext";

export const sessionValidation = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const session_token = req.cookies.session_token;
    const jwtSecret = process.env.JWT_SECRET;

    if (!session_token) {
      enrichContext({
        auth_status: "unauthenticated",
        outcome: "unauthorized",
      });
      response(res, 401, "Unauthorized Access");
      return;
    }

    if (!jwtSecret) {
      enrichContext({
        outcome: "error",
        error: {
          name: "ConfigError",
          message: "JWT secret is not configured",
        },
      });
      throw new ApiError("Internal Server Error", 500);
    }

    try {
      const decoded = jwt.verify(session_token, jwtSecret, {
        algorithms: ["HS256"],
      }) as JwtPayload;
      req.user = decoded as any;
      enrichContext({
        auth_status: "authenticated",
        user: {
          id: decoded._id as string,
          username: decoded.username as string,
        },
      });
      next();
    } catch (err: any) {
      enrichContext({
        auth_status:
          err.name === "TokenExpiredError" ? "token_expired" : "token_invalid",
        outcome: "unauthorized",
        error: {
          name: err.name,
          message: err.message,
        },
      });
      throw new ApiError("Unauthorized Access", 401, {}, err);
    }
  }
);
