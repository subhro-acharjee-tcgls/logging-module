import { LogsProvider } from "./lib/logger";

export * from "./lib/log-builder";
export * from "./decorators/enable-class-logger";
export * from "./decorators/enable-method-logger";
export * from "./types/log-level";
export * as LoggerInstance from "./interfaces/log.interface";

export function getLogger(ctxName: string) {
  return LogsProvider.getLoggerInstance(ctxName);
}
