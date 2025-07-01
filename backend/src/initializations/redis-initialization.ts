import { Redis } from "ioredis";
import logger from "../logger/logger";
import { tryCatch } from "../utils/tryCatch.util";

export const redisInitialization = async () => {
  const client = new Redis({
    host: process.env.REDIS_HOST || "localhost",
    port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });

  const [, error] = await tryCatch(client.ping());

  if (error) {
    logger.error("❌ Redis connection failed:", error);
    throw error;
  }

  logger.info("✅ Redis connection established");
  return client;
};
