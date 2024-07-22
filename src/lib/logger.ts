import { Logger, LoggerOptions, transports } from "winston";
import type LoggerInstance from "../interfaces/log.interface";
import { Express } from "express";
import { AsyncLocalStorage } from "async_hooks";
import ContextGenerator from "./context-generator";
import { LogsProviderInterface } from "../interfaces/logs-provider.interface";
import StaticImplements from "../decorators/static-implements";
import { RequestContextCreatorFunction } from "../types/request-context";

@StaticImplements<LogsProviderInterface>()
export class LogsProvider {
  private static instance: LogsProvider;
  logger: Logger;
  localStorage?: AsyncLocalStorage<ContextGenerator>;
  applicationName?: string;

  constructor(config: LoggerOptions) {
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
    console.log(LogsProvider.instance.logger.format, "".padEnd(10, "\n"));
    return LogsProvider.instance;
  }

  public static addRequestScope<T extends Express>(
    app: T,
    requestContextBuilder?: RequestContextCreatorFunction
  ) {
    const instance = LogsProvider.getInstance();
    instance.localStorage = new AsyncLocalStorage();
    app.use((req, res, next) => {
      const store = new ContextGenerator();
      const newContext = requestContextBuilder
        ? requestContextBuilder(req, res)
        : {};
      store.setContext(newContext);
      if (store.getContext()?.requestId)
        res.setHeader("x-request-id", store.getContext()?.requestId || "");
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
      debug(message: string, ...args: any[]): void {
        const provider = LogsProvider.getInstance();
        const metadata = provider.getLogsMetadata();
        provider.logger.defaultMeta = metadata;
        provider.logger.log({
          level: "debug",
          message: message || "",
          caller: ctxName,
          data: args,
        });
      }
      error(message: string, ...args: any[]): void {
        const provider = LogsProvider.getInstance();
        const metadata = provider.getLogsMetadata();
        provider.logger.defaultMeta = metadata;
        provider.logger.log({
          level: "error",
          message: message || "",
          caller: ctxName,
          data: args,
        });
      }
      info(message: string, ...args: any[]): void {
        const provider = LogsProvider.getInstance();
        const metadata = provider.getLogsMetadata();
        provider.logger.defaultMeta = metadata;
        provider.logger.log({
          level: "info",
          message: message,
          data: args,
          caller: ctxName,
        });
      }
      fatal(message: string, ...args: any[]): void {
        const provider = LogsProvider.getInstance();
        const metadata = provider.getLogsMetadata();
        provider.logger.defaultMeta = metadata;
        provider.logger.log({
          level: "fatal",
          message: message,
          data: args,
          caller: ctxName,
        });
      }
      warn(message: string): void {
        const provider = LogsProvider.getInstance();
        const metadata = provider.getLogsMetadata();
        provider.logger.defaultMeta = metadata;
        provider.logger.log({
          level: "warn",
          message: message,
          caller: ctxName,
        });
      }
    }

    return new LogInstance();
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

    return metadata;
  }
}
