import { Logger, LoggerOptions, transports } from "winston";
import type LoggerInstance from "../interfaces/log.interface";
import { Express } from "express";
import { AsyncLocalStorage } from "async_hooks";
import ContextGenerator from "./context-generator";
import { LogsProviderInterface } from "../interfaces/logs-provider.interface";
import StaticImplements from "../decorators/static-implements";
import { RequestContextCreatorFunction } from "../types/request-context";
import _ from "lodash";
import { bootstrapTracing } from "../../tracing";
import { Span } from "@opentelemetry/api";

@StaticImplements<LogsProviderInterface>()
export class LogsProvider {
  private static instance: LogsProvider;
  private static tracingSdk: any; 
  
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

  // Set the tracing SDK 
  static setTracingSdk(sdk: any) {
    this.tracingSdk = sdk;
  }

  // Access the tracing SDK
  static getTracingSdk() {
    return this.tracingSdk;
  }

  // Initialize Tracing SDK after bootstrap
  static initializeTracing() {
    bootstrapTracing().then(({ tracer }) => {
      this.setTracingSdk(tracer);
    }).catch((error) => {
      console.error("Failed to initialize tracing", error);
    });
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
        if (provider.logger.level !== "debug") {
          return;
        }
        const metadata = provider.getLogsMetadata();
        provider.logger.defaultMeta = metadata;
        const data = LogsProvider.processExtraArgs(args);
        provider.logger.log({
          level: "debug",
          message: message || "",
          caller: ctxName,
          data,
        });
      }
      error(message: string, ...args: any[]): void {
        const provider = LogsProvider.getInstance();
        const metadata = provider.getLogsMetadata();
        provider.logger.defaultMeta = metadata;
        const data = LogsProvider.processExtraArgs(args);

        provider.logger.log({
          level: "error",
          message: message || "",
          caller: ctxName,
          data,
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
      
      // Span-related methods using the tracing SDK
      span(name: string, context?: any, ...args: any[]): Span{
        if (LogsProvider.getTracingSdk()) {
          const span = LogsProvider.getTracingSdk().startSpan(name, context);
          return span
          }
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

  static processObjects(obj: any, depth: number): any {
    if (depth === 0) {
      return "[REDACTED]";
    }
    const newObj: any = {};
    for (let key in obj) {
      if (typeof obj[key] === "object" && obj[key] !== null) {
        newObj[key] = this.processObjects(obj[key], depth - 1);
      } else {
        newObj[key] = obj[key];
      }
    }
    return newObj;
  }

  static processExtraArgs(args: any[]) {
    const processedArgs: any[] = [];
    for (let data of args) {
      if (_.isError(data)) {
        processedArgs.push(`[${data.name}]: ${data.message}`);
      } else if (typeof data === "object" && data !== null) {
        processedArgs.push(this.processObjects(data, 2));
      } else {
        processedArgs.push(`${data}`);
      }
    }

    return processedArgs;
  }
}
