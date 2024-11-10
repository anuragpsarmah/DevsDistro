import express, { Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import loggerMiddleware from "./middlewares/logger.middleware";
import response from "./utils/response.util";
import { healthMemoryCheckLimiter } from "./utils/rateLimitConfig";
import S3Service from "./utils/S3Service";

export const app = express();
export const s3Service = new S3Service();

/* global middlewares */
app.use(
  cors({
    origin: [process.env.FRONTEND_URI as string, "http://localhost:5173"],
    credentials: true,
  })
);
app.use(loggerMiddleware);
app.use(express.json());
app.use(cookieParser());

/* server health */
app.get("/health", healthMemoryCheckLimiter, (req: Request, res: Response) => {
  response(res, 200, "OK");
  return;
});

/* server memory */
app.get("/memory", healthMemoryCheckLimiter, (req, res) => {
  const used = process.memoryUsage();
  response(res, 200, "", {
    heapTotal: `${Math.round((used.heapTotal / 1024 / 1024) * 100) / 100} MB`,
    heapUsed: `${Math.round((used.heapUsed / 1024 / 1024) * 100) / 100} MB`,
  });
  return;
});

/* routes */
import { authRouter } from "./routes/auth.routes";
import { profileRouter } from "./routes/profile.routes";
import { salesRouter } from "./routes/sales.routes";
import { citiesRouter } from "./routes/cities.routes";
import { reviewRouter } from "./routes/reviews.routes";
import { projectRouter } from "./routes/projects.routes";

app.use("/api/auth", authRouter);
app.use("/api/profile", profileRouter);
app.use("/api/sales", salesRouter);
app.use("/api/reviews", reviewRouter);
app.use("/api/projects", projectRouter);
app.use("/api/cities", citiesRouter);
