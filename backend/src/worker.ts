import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import dbConnect from "./initializations/db-connect";
import logger from "./logger/logger";
import { redisInitialization } from "./initializations/redis-initialization";
import S3Service from "./services/S3.service";
import S3CleanupService from "./workers/S3Cleanup.worker";
import { startScheduledDeletionJob } from "./utils/projectCleanup.util";
import { setGlobals } from "./globals";

const DBretries = process.env.RETRIES ? Number(process.env.RETRIES) : 3;

(async () => {
  let redisClient;
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

  setGlobals({ redis: redisClient, s3: s3ServiceInst });

  startScheduledDeletionJob();

  S3CleanupService.startWorker().catch((err) => {
    logger.error("Failed to start cleanup worker:", err);
    process.exit(1);
  });

  logger.info("Worker process started");

  const shutdown = async (signal: string) => {
    logger.info(`Worker received ${signal}, shutting down gracefully...`);
    await redisClient.quit();
    await mongoose.connection.close();
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
})();
