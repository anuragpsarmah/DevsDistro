import dotenv from "dotenv";
import dbConnect from "./initializations/db-connect";
import { app } from "./app";
import logger from "./logger/winston.logger";
import { redisInitialization } from "./initializations/redis-initialization";
import { Redis } from "ioredis";
import S3Service from "./utils/S3Service.util";
import S3CleanupService from "./utils/S3CleanupService.util";

dotenv.config();

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const DBretiers = process.env.RETRIES ? Number(process.env.RETRIES) : 3;

export let redisClient: Redis;
export let s3Service: S3Service;

(async () => {
  try {
    redisClient = await redisInitialization();
  } catch (error) {
    process.exit(1);
  }

  let retries = DBretiers;
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

  s3Service = new S3Service();

  S3CleanupService.startWorker().catch((err) => {
    logger.error("Failed to start cleanup worker:", err);
    process.exit(1);
  });
  logger.info("⚒️  Cleanup Worker is running");

  app.listen(PORT, () => logger.info(`⚙️  Server is running on PORT: ${PORT}`));
})();
