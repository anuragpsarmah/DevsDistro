import dotenv from "dotenv";
import dbConnect from "./db/db-connect";
import app from "./app";
import logger from "./logger/winston.logger";

dotenv.config();

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const DBretiers = process.env.RETRIES ? Number(process.env.RETRIES) : 3;

(async () => {
  let retries = DBretiers;
  while (retries--) {
    logger.info("Trying to connect DB");
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
