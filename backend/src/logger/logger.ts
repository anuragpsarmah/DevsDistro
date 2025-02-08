import fs from "fs";
import path from "path";

type LogLevel = "error" | "warn" | "info" | "http" | "worker" | "debug";

type LogColors = {
  [K in LogLevel]: string;
};

class CustomLogger {
  private colors: LogColors = {
    error: "\x1b[31m",
    warn: "\x1b[33m",
    info: "\x1b[34m",
    http: "\x1b[35m",
    worker: "\x1b[32m",
    debug: "\x1b[37m",
  };

  private reset = "\x1b[0m";
  private logsDir = "logs";

  constructor() {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir);
    }
  }

  private getTimestamp(): string {
    const now = new Date();
    return (
      now.toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }) +
      ":" +
      now.getMilliseconds().toString().padStart(3, "0")
    );
  }

  private formatMessage(level: LogLevel, args: unknown[]): string {
    const timestamp = this.getTimestamp();
    const message = args
      .map((arg) => {
        if (arg instanceof Error) {
          return arg.stack || arg.message;
        }
        if (typeof arg === "object") {
          return JSON.stringify(arg, null, 2);
        }
        return String(arg);
      })
      .join(" ");
    return `[${timestamp}] ${this.colors[level]}${level}: ${message.trim()}${this.reset}`;
  }

  private formatFileMessage(level: LogLevel, args: unknown[]): string {
    const timestamp = this.getTimestamp();
    const message = args
      .map((arg) => {
        if (arg instanceof Error) {
          return arg.stack || arg.message;
        }
        if (typeof arg === "object") {
          return JSON.stringify(arg, null, 2);
        }
        return String(arg);
      })
      .join(" ");
    return `[${timestamp}] ${level}: ${message.trim()}\n`;
  }

  private writeToFile(filePath: string, message: string): void {
    fs.appendFile(filePath, message, (err) => {
      if (err) {
        console.error("Error writing to log file:", err);
      }
    });
  }

  private log(level: LogLevel, ...args: unknown[]): void {
    const consoleMessage = this.formatMessage(level, args);
    console.log(consoleMessage);

    const fileMessage = this.formatFileMessage(level, args);

    if (level === "error" || level === "warn") {
      this.writeToFile(path.join(this.logsDir, "error.txt"), fileMessage);
    }

    if (level === "http") {
      this.writeToFile(path.join(this.logsDir, "http.txt"), fileMessage);
    }

    if (level === "worker") {
      this.writeToFile(path.join(this.logsDir, "worker.txt"), fileMessage);
    }
  }

  public error(...args: unknown[]): void {
    this.log("error", ...args);
  }

  public warn(...args: unknown[]): void {
    this.log("warn", ...args);
  }

  public info(...args: unknown[]): void {
    this.log("info", ...args);
  }

  public http(...args: unknown[]): void {
    this.log("http", ...args);
  }

  public worker(...args: unknown[]): void {
    this.log("worker", ...args);
  }

  public debug(...args: unknown[]): void {
    this.log("debug", ...args);
  }
}

const logger = new CustomLogger();
export default logger;
