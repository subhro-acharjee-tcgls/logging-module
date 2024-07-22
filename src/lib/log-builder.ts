import winston, { format, LoggerOptions, transports } from "winston";
import "winston-daily-rotate-file";
import { LogsProviderInterface } from "../interfaces/logs-provider.interface";
import { LogsProvider } from "./logger";
import { LogLevels } from "../types/log-level";

export class LoggerBuilder {
  private timestampFormat: string;
  private addCallerNameToMessageAsPrefix: boolean;
  private defaultFormats: winston.Logform.Format[];
  private defaultTransport: winston.transport[];
  private defaultLogLevels: LogLevels;
  private separatedFileMeta?: {
    dirname: string;
    rotate?: string;
  };
  constructor() {
    this.timestampFormat = "YYYY MMM DD HH:mm:ss Z";
    this.addCallerNameToMessageAsPrefix = true;
    this.defaultFormats = [format.json(), format.errors()];
    this.defaultTransport = [
      new transports.Console({
        silent: LogsProvider.isSilent(),
      }),
    ];
    this.defaultLogLevels = {
      fatal: 0,
      error: 1,
      warn: 2,
      debug: 3,
      info: 4,
    };
  }

  setCallerPrefix(value?: boolean) {
    this.addCallerNameToMessageAsPrefix = value ?? true;
    return this;
  }

  setTimestampFormat(format: string) {
    this.timestampFormat = format;
    return this;
  }

  addFormats(...formats: winston.Logform.Format[]) {
    this.defaultFormats.push(...formats);
    return this;
  }

  addTransports(...transports: winston.transport[]) {
    this.defaultTransport.push(...transports);
    return this;
  }

  addCombinedFileLogs(dirname: string = ".logs", rotate?: string) {
    if (rotate && typeof rotate === "string" && rotate.length > 0) {
      this.defaultTransport.push(
        new transports.DailyRotateFile({
          dirname,
          filename: `combined-%DATE%.log`,
        })
      );
    } else {
      this.defaultTransport.push(
        new transports.File({
          dirname: dirname,
          filename: "combined.log",
        })
      );
    }
    return this;
  }

  addSeparatedFileLogs(dirname: string = ".logs", rotate?: string) {
    this.separatedFileMeta = {
      dirname: dirname,
      rotate,
    };
    return this;
  }

  handleSepartedFileLogs() {
    if (!this.separatedFileMeta) return;
    for (const logLevel of Object.keys(this.defaultLogLevels)) {
      if (this.separatedFileMeta.rotate) {
        this.defaultTransport.push(
          new transports.DailyRotateFile({
            level: logLevel,
            filename: `${logLevel}-%DATE%.log`,
            dirname: this.separatedFileMeta.dirname,
          })
        );
      } else {
        this.defaultTransport.push(
          new transports.File({
            level: logLevel,
            filename: `${logLevel}.log`,
            dirname: this.separatedFileMeta.dirname,
          })
        );
      }
    }
  }

  build(): LogsProviderInterface {
    this.defaultFormats.unshift(
      format.timestamp({ format: this.timestampFormat }),
      format.label({
        label: "caller",
        message: this.addCallerNameToMessageAsPrefix,
      })
    );
    this.handleSepartedFileLogs();

    const config: LoggerOptions = {
      transports: this.defaultTransport,
      format: format.combine(...this.defaultFormats),
      levels: this.defaultLogLevels,
    };

    LogsProvider.getInstance(config);
    return LogsProvider;
  }
}
