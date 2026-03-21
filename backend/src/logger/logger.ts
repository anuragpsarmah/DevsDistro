import pino from "pino";
import { asyncLocalStorage } from "../utils/asyncContext";

const levels = {
  http: 30,
  worker: 30,
};

const pinoInstance = pino({
  customLevels: levels,
  level: process.env.LOG_LEVEL || "info",
  transport:
    process.env.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
          },
        }
      : undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
});

class PinoAdapter {
  private pino = pinoInstance;

  private handle(level: keyof typeof levels | pino.Level, args: any[]) {
    // Enrich context if error
    if (level === "error") {
      const store = asyncLocalStorage.getStore();
      if (store) {
        const errorArg = args.find((arg) => arg instanceof Error);
        if (errorArg) {
          store.error = {
            message: errorArg.message,
            stack: errorArg.stack,
            name: errorArg.name,
          };
        } else {
          // If no error object, capture the message
          store.error_message = args.map(String).join(" ");
        }
      }
    }

    if (args.length === 0) return;

    // Case 1: (Msg, Error/Object) -> pino.level(obj, msg)
    if (
      args.length === 2 &&
      typeof args[0] === "string" &&
      typeof args[1] === "object"
    ) {
      // @ts-ignore
      this.pino[level](args[1], args[0]);
      return;
    }

    // Case 2: (Object) -> pino.level(obj)
    if (args.length === 1 && typeof args[0] === "object") {
      // @ts-ignore
      this.pino[level](args[0]);
      return;
    }

    // Case 3: Legacy/Text behavior
    const message = args
      .map((arg) =>
        typeof arg === "object" ? JSON.stringify(arg) : String(arg)
      )
      .join(" ");

    // @ts-ignore
    this.pino[level](message);
  }

  public info(...args: any[]) {
    this.handle("info", args);
  }

  public error(...args: any[]) {
    this.handle("error", args);
  }

  public warn(...args: any[]) {
    this.handle("warn", args);
  }

  public debug(...args: any[]) {
    this.handle("debug", args);
  }

  public http(...args: any[]) {
    this.handle("http", args);
  }

  public worker(...args: any[]) {
    this.handle("worker", args);
  }
}

const logger = new PinoAdapter();

export default logger;
