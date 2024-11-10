import dotenv from "dotenv";
import dbConnect from "./initializations/db-connect";
import { app } from "./app";
import logger from "./logger/winston.logger";
import { trieInitialization, cityTrie } from "./initializations/trie-initialization";
import { redisInitialization } from "./initializations/redis-initialization";
import { Redis } from "ioredis";

dotenv.config();

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const DBretiers = process.env.RETRIES ? Number(process.env.RETRIES) : 3;

export let redisClient: Redis;
export { cityTrie };

(async () => {
  await trieInitialization();

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

  app.listen(PORT, () => logger.info(`⚙️  Server is running on PORT: ${PORT}`));
})();