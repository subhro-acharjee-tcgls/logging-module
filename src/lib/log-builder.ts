import winston, { format, LoggerOptions, transports } from "winston";
import "winston-daily-rotate-file";
import { LogsProviderInterface } from "../interfaces/logs-provider.interface";
import { LogsProvider } from "./logger";
import { LogLevels, LogType } from "../types/log-level";
import { isNil } from "lodash";
import LokiTransport from "winston-loki";
/**
 * A builder class for LogsProvider
 * @class
 * @public
 */
export class LoggerBuilder {
  private timestampFormat: string;
  private defaultFormats: winston.Logform.Format[];
  private defaultTransport: winston.transport[];
  private defaultLogLevels: LogLevels;
  private defaultLogLevel: LogType;
  private separatedFileMeta?: {
    dirname: string;
    rotate?: string;
  };
  private tracingEnabled = false;

  constructor() {
    this.timestampFormat = "YYYY MMM DD HH:mm:ss Z";
    this.defaultFormats = [
      format.splat(),
      format.json(),
      format.errors(),
      format.printf((info) => {
        const message = info.message;
        const level = info.level;

        const options = {
          ...(info as any),
          message: `[${level.toUpperCase()}] ${message}`,
        };
        return JSON.stringify(options, this.getCircularReplacer());
      }),
    ];
    this.defaultTransport = [
      new transports.Console({
        silent: LogsProvider.isSilent(),
      }),
    ];
    this.defaultLogLevels = {
      fatal: 0,
      error: 1,
      warn: 2,
      info: 3,
      debug: 4,
    };
    this.defaultLogLevel = "debug";
  }

  getCircularReplacer() {
    const seen = new WeakSet();
    return (_key: any, value: object | null) => {
      if (typeof value === "object" && value !== null) {
        if (seen.has(value)) {
          return;
        }
        seen.add(value);
      }
      return value;
    };
  }

  /**
   * @deprecated
   * Sets addCallerNameToMessageAsPrefix property.
   * @param {boolean} [value] - New value.
   * @returns {LoggerBuilder} LoggerBuilder instance.
   */
  setCallerPrefix(_value?: boolean): LoggerBuilder {
    return this;
  }

  /**
   * Sets the format of the timestamp for log messages
   * @param {string} format - The timestamp format.
   * @returns {LoggerBuilder} LoggerBuilder instance.
   */
  setTimestampFormat(format: string): LoggerBuilder {
    this.timestampFormat = format;
    return this;
  }

  /**
   * Adds additional format(s) for the log
   * @param {...winston.Logform.Format[]} formats - The format(s) to add
   * @returns {LoggerBuilder} LoggerBuilder instance.
   */
  addFormats(...formats: winston.Logform.Format[]): LoggerBuilder {
    this.defaultFormats.push(...formats);
    return this;
  }

  /**
   * Adds transport(s) for the log
   * @param {...winston.transport[]} transports - The transport(s) to add
   * @returns {LoggerBuilder} LoggerBuilder instance.
   */
  addTransports(...transports: winston.transport[]): LoggerBuilder {
    this.defaultTransport.push(...transports);
    return this;
  }

  /**
   * Sets the default log level for the log. Default value is set to debug. If
   * set to `info` then no debug logs will be visible.
   * @param {LogType} level - The log level
   * @returns {LoggerBuilder} LoggerBuilder instance.
   */
  setLogLevel(level: LogType): LoggerBuilder {
    this.defaultLogLevel = level;
    return this;
  }

  /**
   * Adds a single file for all the logs called combined.log.
   * @param {string} [dirname=".logs"] - The directory name
   * @param {string} [rotate] - The rotation strategy
   * @returns {LoggerBuilder} LoggerBuilder instance.
   */
  addCombinedFileLogs(
    dirname: string = ".logs",
    rotate?: string
  ): LoggerBuilder {
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

  /**
   * Sets up separated logging for different levels in provided directory
   * @param {string} [dirname=".logs"] - The directory name
   * @param {string} [rotate] - The rotation strategy
   * @returns {LoggerBuilder} LoggerBuilder instance.
   */
  addSeparatedFileLogs(
    dirname: string = ".logs",
    rotate?: string
  ): LoggerBuilder {
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

  /**
   * Sets a callback to determine if tracing is enabled.
   * @param {() => boolean | Promise<boolean>}
   * @returns {LoggerBuilder} LoggerBuilder instance.
   */
  setTracingEnabled(isEnabled: boolean): LoggerBuilder {
    // only return boolean

    this.tracingEnabled = isEnabled;
    return this;
  }
  /**
   * Builds and returns a log provider
   * @returns {LogsProviderInterface} - The log provider.
   */
  build(): LogsProviderInterface {
    this.defaultFormats.unshift(
      format.timestamp({ format: this.timestampFormat })
    );
    this.handleSepartedFileLogs();
    if (this.tracingEnabled && !isNil(process.env["LOKI_URL"])) {
      this.addTransports(
        new LokiTransport({
          host: process.env["LOKI_URL"],
          format: format.combine(...this.defaultFormats),
          labels: {
            service_name: `${process.env["SERVICE_NAME"]}-${process.env["ENV"]}`,
          },
        })
      );
    }

    const config: LoggerOptions = {
      transports: this.defaultTransport,
      format: format.combine(...this.defaultFormats),
      levels: this.defaultLogLevels,
      level: this.defaultLogLevel,
    };

    LogsProvider.getInstance(config);

    if (this.tracingEnabled) {
      LogsProvider.initializeTracing();
    } else {
      console.log("Tracing is disabled.");
    }
    return LogsProvider;
  }
}
