import { NextFunction, Request, Response } from "express";
import logger from "../logger/logger";
import * as UAParser from "ua-parser-js";
import { asyncLocalStorage, LogContext } from "../utils/asyncContext";
import crypto from "crypto";

const loggerMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const store: LogContext = {
    request_id: crypto.randomUUID(),
  };

  asyncLocalStorage.run(store, () => {
    const startTime = performance.now();

    const method = req.method;
    const url = req.url;
    const ip = req.ip;

    const parser = new UAParser.UAParser(req.headers["user-agent"]);
    const userAgent = parser.getResult();
    const deviceInfo = {
      browser: `${userAgent.browser.name || "Unknown"}/${userAgent.browser.version || "?"}`,
      os: `${userAgent.os.name || "Unknown"}/${userAgent.os.version || "?"}`,
      device: userAgent.device.type || "desktop",
    };

    res.on("finish", () => {
      const endTime = performance.now();
      const duration = (endTime - startTime).toFixed(2);

      let inferredOutcome = store.outcome;
      if (!inferredOutcome) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          inferredOutcome = "success";
        } else if (res.statusCode === 401 || res.statusCode === 403) {
          inferredOutcome = "unauthorized";
        } else if (res.statusCode === 404) {
          inferredOutcome = "not_found";
        } else if (res.statusCode === 400) {
          inferredOutcome = "validation_failed";
        } else if (res.statusCode >= 500) {
          inferredOutcome = "error";
        }
      }

      const wideEvent = {
        request_id: store.request_id,
        service: process.env.SERVICE_NAME || "devdistro-backend",
        version: process.env.SERVICE_VERSION || "1.0.0",
        environment: process.env.NODE_ENV || "development",
        ip,
        method,
        url,
        status_code: res.statusCode,
        duration_ms: Number(duration),
        user_agent: {
          browser: deviceInfo.browser,
          os: deviceInfo.os,
          device: deviceInfo.device,
        },
        outcome: inferredOutcome,
        ...store,
      };

      logger.http(wideEvent);
    });
    next();
  });
};

export default loggerMiddleware;

