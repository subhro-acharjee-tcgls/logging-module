import { LoggerOptions } from "winston";
import type { Express } from "express";
import LoggerInstance from "./log.interface";
export interface LogsProviderInstanceInterface {}
export interface LogsProviderInterface {
  new (config: LoggerOptions): LogsProviderInstanceInterface;
  getInstance(opts: LoggerOptions): LogsProviderInstanceInterface;
  addRequestScope<T extends Express>(app: T): LogsProviderInterface;
  setApplicationName(name: string): LogsProviderInterface;
  setLogOnUnhandledExceptions(): LogsProviderInterface;
  getLoggerInstance(ctxName: string): LoggerInstance;
}
