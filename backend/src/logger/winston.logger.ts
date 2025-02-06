import winston from "winston";

interface CustomLevels extends winston.config.AbstractConfigSetLevels {
  error: number;
  warn: number;
  info: number;
  http: number;
  worker: number;
  debug: number;
  [key: string]: number;
}

interface CustomLogger extends winston.Logger {
  worker: winston.LeveledLogMethod;
}

const levels: CustomLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  worker: 4,
  debug: 5,
};

const level = () => {
  const env = (process.env.NODE_ENV as string) || "development";
  return env === "development" ? "debug" : "warn";
};

const colors = {
  error: "red",
  warn: "yellow",
  info: "blue",
  http: "magenta",
  worker: "green",
  debug: "white",
};

winston.addColors(colors);

const format = winston.format.combine(
  winston.format.timestamp({ format: "DD MMM, YYYY - HH:mm:ss:ms" }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (message) =>
      `[${message.timestamp}] ${message.level}: ${message.message.trim()}`
  )
);

const transports = [new winston.transports.Console()];

const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports,
}) as CustomLogger;

export default logger;
