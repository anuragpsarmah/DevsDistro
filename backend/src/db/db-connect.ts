import mongoose from "mongoose";
import logger from "../loggers/winston.logger";

const dbConnect = async () => {
  try {
    const connection = await mongoose.connect(
      process.env.MONGODB_URI as string
    );
    logger.info(`🍀 MongoDB connected at host: ${connection.connection.host}`);
  } catch (error) {
    throw error;
  }
};

export default dbConnect;
