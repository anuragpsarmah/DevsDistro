import mongoose from "mongoose";
import logger from "../logger/logger";
import { tryCatch } from "../utils/tryCatch.util";

const dbConnect = async () => {
  const [connection, error] = await tryCatch(
    mongoose.connect(process.env.MONGODB_URI as string)
  );

  if (error) throw error;

  logger.info(`🍀 MongoDB connected at host: ${connection.connection.host}`);
};

export default dbConnect;
