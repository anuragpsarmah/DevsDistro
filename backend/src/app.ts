import express, { Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import loggerMiddleware from "./middlewares/logger.middleware";
import response from "./utils/response.util";
import {
  globalRateLimiter,
  healthMemoryCheckLimiter,
} from "./utils/rateLimitConfig.util";

export const app = express();

// Trust the first proxy hop so express-rate-limit uses the real client IP
app.set("trust proxy", 1);

/* global middlewares */
app.use(
  cors({
    origin: [process.env.FRONTEND_URI as string, "http://localhost:5173"],
    credentials: true,
  })
);
app.use(loggerMiddleware);
app.use(globalRateLimiter);

// Mounting webhook route before express.json() so that the raw body is preserved for HMAC signature verification
import { webhookRouter } from "./routes/webhook.routes";
app.use(
  "/api/webhooks",
  express.raw({ type: "application/json" }),
  webhookRouter
);

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
import { reviewRouter } from "./routes/reviews.routes";
import { projectRouter } from "./routes/projects.routes";
import { githubAppRouter } from "./routes/githubApp.routes";
import { wishlistRouter } from "./routes/wishlist.routes";
import { purchaseRouter } from "./routes/purchase.routes";

app.use("/api/auth", authRouter);
app.use("/api/profile", profileRouter);
app.use("/api/sales", salesRouter);
app.use("/api/reviews", reviewRouter);
app.use("/api/projects", projectRouter);
app.use("/api/github-app", githubAppRouter);
app.use("/api/wishlist", wishlistRouter);
app.use("/api/purchases", purchaseRouter);
