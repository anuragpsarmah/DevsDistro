import express, { Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import serveIndex from "serve-index";
import requestLogger from "./loggers/request-logger.middleware";
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
  })
);
app.use(requestLogger);
app.use(express.json());
app.use(cookieParser());

/* server health */
app.get("/health", (req: Request, res: Response) => {
  response(res, 200, "OK");
  return;
});

/* routes */
import { authRouter } from "./routes/auth.routes";

app.use("/api/auth", authRouter);

export default app;
