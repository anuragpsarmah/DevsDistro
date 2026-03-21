import { Request, Response, NextFunction } from "express";
import response from "./response.util";
import logger from "../logger/logger";
import { enrichContext } from "./asyncContext";

const asyncHandler = (
  requestHandler: (
    req: Request,
    res: Response,
    next: NextFunction
  ) => Promise<void>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(requestHandler(req, res, next)).catch((error) => {
      enrichContext({
        outcome: "error",
        error: {
          message: error.message,
          name: error.name,
          stack:
            process.env.NODE_ENV === "development" ? error.stack : undefined,
        },
        error_message: error.message,
      });

      logger.error("Unhandled request error", {
        error_name: error.name,
        error_message: error.message,
        status: error.status || 500,
      });

      if (res.headersSent) {
        logger.error("Headers already sent — cannot send error response", {
          error_name: error.name,
          error_message: error.message,
        });
        return;
      }

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
