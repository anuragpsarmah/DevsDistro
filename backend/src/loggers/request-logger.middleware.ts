import { NextFunction, Request, Response } from "express";
import logger from "./winston.logger";

const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = performance.now();
  const method = req.method;
  const url = req.url;
  const ip = req.ip;

  res.on("finish", () => {
    const endTime = performance.now();

    logger.http(
      `${ip} ${method} ${url} ${res.statusCode} ${(endTime - startTime).toFixed(2)}ms`
    );
  });

  next();
};

export default requestLogger;
