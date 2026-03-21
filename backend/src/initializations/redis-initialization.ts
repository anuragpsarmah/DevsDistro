import { Redis } from "ioredis";
import logger from "../logger/logger";
import { tryCatch } from "../utils/tryCatch.util";

export const redisInitialization = async () => {
  const host = process.env.REDIS_HOST || "localhost";
  const port = process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379;

  const client = new Redis({
    host,
    port,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });

  const [, error] = await tryCatch(client.ping());

  if (error) {
    logger.error("Redis connection failed", {
      host,
      port,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }

  logger.info({
    event: "redis_connected",
    database: "redis",
    host,
    port,
  });

  return client;
};
