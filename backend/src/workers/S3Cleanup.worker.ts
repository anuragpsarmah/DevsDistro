import { redisClient } from "..";
import { s3Service } from "..";
import logger from "../logger/logger";
import * as cron from "node-cron";
import { tryCatch } from "../utils/tryCatch.util";

export default class S3CleanupService {
  private static async processExpiredJobs() {
    const cleanupItems: string[] = [];
    const failedItems: string[] = [];
    const startTime = performance.now();

    try {
      const now = Date.now();
      const expiredKeys = await redisClient.zrangebyscore(
        "media-cleanup-schedule",
        0,
        now
      );

      for (const key of expiredKeys) {
        try {
          const actualS3Key = key.startsWith("s3upload_")
            ? key.slice("s3upload_".length)
            : key;
          await s3Service.deleteObject(actualS3Key);
          await redisClient.zrem("media-cleanup-schedule", key);
          cleanupItems.push(key);
        } catch (deleteError) {
          failedItems.push(key);
          logger.error("Failed to cleanup S3 object", {
            s3_key: key,
            error:
              deleteError instanceof Error
                ? deleteError.message
                : "Unknown error",
          });
        }
      }
    } catch (error) {
      logger.error("Error processing cleanup queue", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }

    const durationMs = Math.round(performance.now() - startTime);

    if (cleanupItems.length || failedItems.length) {
      logger.worker({
        action: "s3_cleanup",
        items_cleaned: cleanupItems.length,
        items_failed: failedItems.length,
        duration_ms: durationMs,
        cleaned_keys: cleanupItems,
        failed_keys: failedItems.length > 0 ? failedItems : undefined,
      });
    }
  }

  static async startWorker() {
    const cronExpression =
      process.env.WORKER_CRON_EXPRESSION || "0 0 */12 * * *"; // Run cleanup every 12 hours (default)

    cron.schedule(cronExpression, async () => {
      const [, error] = await tryCatch(this.processExpiredJobs());

      if (error) {
        logger.error("S3 cleanup worker execution failed", {
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });

    logger.info({
      event: "worker_started",
      worker: "s3_cleanup",
      cron_expression: cronExpression,
    });
  }
}
