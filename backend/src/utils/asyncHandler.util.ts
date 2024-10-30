import { Request, Response, NextFunction } from "express";
import response from "./response.util";
import logger from "../logger/winston.logger";

const asyncHandler = (
  requestHandler: (
    req: Request,
    res: Response,
    next: NextFunction
  ) => Promise<void>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(requestHandler(req, res, next)).catch((error) => {
      logger.error(error.message, error);
      response(
        res,
        error.status || 500,
        error.message || "Something went wrong",
        error.data || {}
      );
    });
  };
};

export default asyncHandler;
