export default interface LoggerInstance {
  debug(message?: string, ...args: any[]): void;
  error(message?: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  fatal(message: string, ...args: any[]): void;
  warn(message: string): void;
}
