import { Logger, LoggerOptions, transports } from "winston";
import type LoggerInstance from "../interfaces/log.interface";
import { Express } from "express";
import { AsyncLocalStorage } from "async_hooks";
import ContextGenerator from "./context-generator";

export class LogsProvider {
  private static instance: LogsProvider;
  logger: Logger;
  localStorage?: AsyncLocalStorage<ContextGenerator>;
  applicationName?: string;

  private constructor(config: LoggerOptions) {
    this.logger = new Logger(config);
  }

  static isSilent() {
    return !!process.env["LOG_SILENT"];
  }

  static setLogger(logger: Logger) {
    if (LogsProvider.instance) {
      LogsProvider.instance.logger = logger;
    }
  }

  public static getInstance(opts?: LoggerOptions) {
    let config: LoggerOptions = {};
    if (opts) config = opts;
    else {
      if (LogsProvider.instance) return LogsProvider.instance;
      config.transports = [
        new transports.Console({ silent: LogsProvider.isSilent() }),
      ];
    }

    LogsProvider.instance = new LogsProvider(config);
    return LogsProvider.instance;
  }

  public static addRequestScope<T extends Express>(app: T) {
    const instance = LogsProvider.getInstance();
    instance.localStorage = new AsyncLocalStorage();
    app.use((req, _res, next) => {
      const store = new ContextGenerator();
      store.setContext({
        path: req.path,
        method: req.method,
      });
      instance.localStorage?.run(store, () => {
        next();
      });
    });
    return LogsProvider;
  }

  public static setApplicationName(appName: string) {
    LogsProvider.getInstance().applicationName = appName;
    return LogsProvider;
  }

  public static setLogOnUnhandledExceptions() {
    process.on("uncaughtException", (err: Error) => {
      const logger = LogsProvider.getLoggerInstance("uncaughtException");
      logger.fatal("UncaughtException", err);
    });
    process.on("unhandledRejection", (reason, promise) => {
      const logger = LogsProvider.getLoggerInstance("unhandledRejection");
      logger.fatal("UnhandledRejection", {
        reason,
        promise,
      });
    });

    return LogsProvider;
  }

  public static getLoggerInstance(ctxName: string): LoggerInstance {
    class LogInstance implements LoggerInstance {
      debug(...args: any[]): void {
        const provider = LogsProvider.getInstance();
        provider.dataParser(args);
        const metadata = provider.getLogsMetadata();
        provider.logger.log({
          level: "debug",
          message: args.join(" "),
          caller: ctxName,
          metadata,
        });
      }
      error(...args: any[]): void {
        const provider = LogsProvider.getInstance();
        provider.dataParser(args);
        const metadata = provider.getLogsMetadata();
        provider.logger.log({
          level: "error",
          message: args.join(" "),
          caller: ctxName,
          metadata,
        });
      }
      info(message: string, ...args: any[]): void {
        const provider = LogsProvider.getInstance();
        provider.dataParser(args);
        const metadata = provider.getLogsMetadata();
        provider.logger.log({
          level: "info",
          message: message,
          data: args.join(" "),
          caller: ctxName,
          metadata,
        });
      }
      fatal(message: string, ...args: any[]): void {
        const provider = LogsProvider.getInstance();
        provider.dataParser(args);
        const metadata = provider.getLogsMetadata();
        provider.logger.log({
          level: "fatal",
          message: message,
          data: args.join(" "),
          caller: ctxName,
          metadata,
        });
      }
      warn(message: string): void {
        const provider = LogsProvider.getInstance();
        const metadata = provider.getLogsMetadata();
        provider.logger.log({
          level: "warn",
          message: message,
          caller: ctxName,
          metadata,
        });
      }
    }

    return new LogInstance();
  }

  dataParser(data: any[]) {
    data.forEach((dt, idx) => {
      if (typeof dt === "object") {
        try {
          data[idx] = JSON.stringify(dt, Object.getOwnPropertyNames(dt));
        } catch (error) {
          // keep as it is.
        }
      }
    });
  }

  getLogsMetadata() {
    let metadata: Record<string, unknown> = {};
    if (this.localStorage) {
      const store = this.localStorage.getStore();
      if (store) {
        metadata = {
          ...metadata,
          ...store.getContext(),
        };
      }
    }

    if (this.applicationName) {
      metadata["applicationName"] = this.applicationName;
    }

    return JSON.stringify(metadata, Object.getOwnPropertyNames(metadata), 2);
  }
}
