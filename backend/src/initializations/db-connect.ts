import mongoose from "mongoose";
import logger from "../logger/logger";
import { tryCatch } from "../utils/tryCatch.util";

const dbConnect = async () => {
  const [connection, error] = await tryCatch(
    mongoose.connect(process.env.MONGODB_URI as string)
  );

  if (error) throw error;

  logger.info({
    event: "database_connected",
    database: "mongodb",
    host: connection.connection.host,
  });
};

export default dbConnect;
