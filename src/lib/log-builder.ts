import winston, { format, LoggerOptions, transports } from "winston";
import "winston-daily-rotate-file";
import { LogsProviderInterface } from "../interfaces/logs-provider.interface";
import { LogsProvider } from "./logger";
import { LogLevels } from "../types/log-level";
import { LogType } from "../../dist";

/**
 * A builder class for LogsProvider
 * @class
 * @public
 */
export class LoggerBuilder {
  private timestampFormat: string;
  private addCallerNameToMessageAsPrefix: boolean;
  private defaultFormats: winston.Logform.Format[];
  private defaultTransport: winston.transport[];
  private defaultLogLevels: LogLevels;
  private defaultLogLevel: LogType;
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
      info: 3,
      debug: 4,
    };
    this.defaultLogLevel = "debug";
  }

  /**
   * Sets addCallerNameToMessageAsPrefix property.
   * @param {boolean} [value] - New value.
   * @returns {LoggerBuilder} LoggerBuilder instance.
   */
  setCallerPrefix(value?: boolean): LoggerBuilder {
    this.addCallerNameToMessageAsPrefix = value ?? true;
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
   * Builds and returns a log provider
   * @returns {LogsProviderInterface} - The log provider.
   */
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
      level: this.defaultLogLevel,
    };

    LogsProvider.getInstance(config);
    return LogsProvider;
  }
}
