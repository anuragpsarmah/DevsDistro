import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import dbConnect from "./initializations/db-connect";
import { app } from "./app";
import logger from "./logger/logger";
import { redisInitialization } from "./initializations/redis-initialization";
import { Redis } from "ioredis";
import S3Service from "./services/S3.service";
import RepoZipUploadService from "./services/repoZipUpload.service";
import { setGlobals } from "./globals";

// Re-export globals so all callers of `import { ... } from ".."` get live bindings.
// Tests mock this entire module via vi.mock("..") — the re-exports are replaced by
// the mock, so tests are unaffected. In production, setGlobals() populates these.
export { redisClient, s3Service, repoZipUploadService } from "./globals";

// Only start the server when this file is the main entry point.
// Prevents a second API server from starting when index.ts is loaded
// transitively by worker.ts (via S3.service.ts → ".." → index.ts).
if (require.main === module) {
  const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
  const DBretries = process.env.RETRIES ? Number(process.env.RETRIES) : 3;

  (async () => {
    let redisClient: Redis;
    try {
      redisClient = await redisInitialization();
    } catch {
      process.exit(1);
    }

    let retries = DBretries;
    while (retries--) {
      try {
        await dbConnect();
        break;
      } catch (error) {
        logger.error("Error connecting to DB", error);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        if (!retries) process.exit(1);
      }
    }

    const s3ServiceInst = new S3Service();
    const repoZipInst = new RepoZipUploadService();

    setGlobals({ redis: redisClient, s3: s3ServiceInst, repoZip: repoZipInst });

    // Readiness probe — used by blue/green deploy script before traffic switch
    app.get("/readyz", async (_req, res) => {
      try {
        await redisClient.ping();
        if (mongoose.connection.readyState !== 1) {
          res.status(503).json({ status: "unavailable", service: "mongodb" });
          return;
        }
        res.status(200).json({ status: "ok" });
      } catch {
        res.status(503).json({ status: "unavailable", service: "redis" });
      }
    });

    const server = app.listen(PORT, () =>
      logger.info(`Server is running on PORT: ${PORT}`)
    );

    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      server.close(async () => {
        await redisClient.quit();
        await mongoose.connection.close();
        process.exit(0);
      });
      setTimeout(() => {
        logger.error("Forced shutdown after 10s timeout");
        process.exit(1);
      }, 10_000).unref();
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  })();
}
