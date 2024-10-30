import express, { Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import serveIndex from "serve-index";
import loggerMiddleware from "./middlewares/logger.middleware";
import logAuthorization from "./middlewares/logAuth.middleware";
import response from "./utils/response.util";

const app = express();

/* global middlewares */
app.use(
  "/logs",
  logAuthorization,
  express.static("logs"),
  serveIndex("logs", { icons: true, view: "details" })
);
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
app.get("/health", (req: Request, res: Response) => {
  response(res, 200, "OK");
  return;
});

/* routes */
import { authRouter } from "./routes/auth.routes";
import { profileRouter } from "./routes/profile.routes";

app.use("/api/auth", authRouter);
app.use("/api/profile", profileRouter);

export default app;
