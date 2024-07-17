export default interface LoggerInstance {
  debug(...args: any[]): void;
  error(...args: any[]): void;
  info(message: string, ...args: any[]): void;
  fatal(message: string, ...args: any[]): void;
  warn(message: string): void;
}