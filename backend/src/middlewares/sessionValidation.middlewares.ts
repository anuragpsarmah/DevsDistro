import jwt, { JwtPayload } from "jsonwebtoken";
import asyncHandler from "../utils/asyncHandler.util";
import { NextFunction, Request, Response } from "express";
import response from "../utils/response.util";
import ApiError from "../utils/ApiError.util";

export const sessionValidation = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const session_token = req.cookies.session_token;

    if (!session_token) {
      response(res, 401, "Unauthorized Access");
      return;
    }

    jwt.verify(
      session_token,
      process.env.JWT_SECRET as string,
      (err: any | null, decoded: any) => {
        if (err) throw new ApiError("Unauthorized Access", 401, {}, err);
        else req.user = decoded;
        next();
      }
    );
  }
);
