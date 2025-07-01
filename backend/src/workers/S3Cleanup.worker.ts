import { redisClient } from "..";
import { s3Service } from "..";
import logger from "../logger/logger";
import * as cron from "node-cron";
import { tryCatch } from "../utils/tryCatch.util";

export default class S3CleanupService {
  private static async processExpiredJobs() {
    let cleanupItems: string[] = [];
    try {
      const now = Date.now();
      const expiredKeys = await redisClient.zrangebyscore(
        "media-cleanup-schedule",
        0,
        now
      );
      for (const key of expiredKeys) {
        try {
          const actualS3Key = key.replace("s3upload_", "");
          await s3Service.deleteObject(actualS3Key);
          await redisClient.zrem("media-cleanup-schedule", key);
          cleanupItems = [...cleanupItems, key];
        } catch (deleteError) {
          logger.error(`Failed to delete object ${key}:`, deleteError);
        }
      }
    } catch (error) {
      logger.error("Error processing expired job:", error);
    }
    if (cleanupItems.length) {
      logger.worker(
        `Cleanup completed for ${cleanupItems.length} items:\n${cleanupItems.map((key) => `  - ${key}`).join("\n")}`
      );
    }
  }

  static async startWorker() {
    const cronExpression =
      process.env.WORKER_CRON_EXPRESSION || "0 0 */12 * * *";

    cron.schedule(cronExpression, async () => {
      const [, error] = await tryCatch(this.processExpiredJobs());

      if (error) logger.error("Error in S3 cleanup worker:", error);
    });

    logger.info(
      `⚒️  Cleanup worker started with cron expression: ${cronExpression}`
    );
  }
}
