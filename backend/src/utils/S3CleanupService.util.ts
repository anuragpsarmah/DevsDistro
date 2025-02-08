import { redisClient } from "..";
import { s3Service } from "..";
import logger from "../logger/logger";

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
    while (true) {
      await this.processExpiredJobs();
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}
