import winston from "winston";
import { LoggerBuilder } from "../../src";
import { LogsProvider } from "../../src/lib/logger";

describe("LoggerBuilder", () => {
  let loggerBuilder: LoggerBuilder;
  beforeEach(() => {
    loggerBuilder = new LoggerBuilder();
  });

  describe("setCallerPrefix", () => {
    it("should set the addCallerNameToMessageAsPrefix flag", () => {
      loggerBuilder.setCallerPrefix(false);
      expect(loggerBuilder["addCallerNameToMessageAsPrefix"]).toEqual(false);
    });
  });

  describe("setTimestampFormat", () => {
    it("should set the timestampFormat", () => {
      const format = "YYYY MM DD HH:mm:ss Z";
      loggerBuilder.setTimestampFormat(format);
      expect(loggerBuilder["timestampFormat"]).toEqual(format);
    });
  });

  describe("addFormats", () => {
    it("should add a log format to defaultFormats", () => {
      const format = winston.format.json();
      loggerBuilder.addFormats(format);
      expect(loggerBuilder["defaultFormats"]).toContain(format);
    });
  });

  describe("addTransports", () => {
    it("should add a transport to defaultTransport", () => {
      const transports = new winston.transports.Console();
      loggerBuilder.addTransports(transports);
      expect(loggerBuilder["defaultTransport"]).toContain(transports);
    });
  });

  describe("addCombinedFileLogs", () => {
    it("should add file log transport without rotate", () => {
      loggerBuilder.addCombinedFileLogs("test-dir");
      expect(loggerBuilder["defaultTransport"]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            dirname: "test-dir",
            filename: "combined.log",
          }),
        ])
      );
    });

    it("should add file log transport with rotate", () => {
      loggerBuilder.addCombinedFileLogs("test-dir", "rotate");
      expect(loggerBuilder["defaultTransport"]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            dirname: "test-dir",
            filename: `combined-%DATE%.log`,
          }),
        ])
      );
    });
  });

  describe("addSeparatedFileLogs", () => {
    it("should set separatedFileMeta", () => {
      loggerBuilder.addSeparatedFileLogs("test-dir");
      expect(loggerBuilder["separatedFileMeta"]).toEqual({
        dirname: "test-dir",
      });
    });
  });

  describe("handleSepartedFileLogs", () => {
    it("should handle separated file logs without rotate", () => {
      loggerBuilder.addSeparatedFileLogs("test-dir");
      loggerBuilder.handleSepartedFileLogs();
      expect(loggerBuilder["defaultTransport"]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            filename: expect.stringContaining(".log"),
            dirname: "test-dir",
          }),
        ])
      );
    });

    it("should handle separated file logs with rotate", () => {
      loggerBuilder.addSeparatedFileLogs("test-dir", "rotate");
      (loggerBuilder as any).handleSepartedFileLogs();
      expect(loggerBuilder["defaultTransport"]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            filename: expect.stringContaining("-%DATE%.log"),
            dirname: "test-dir",
          }),
        ])
      );
    });

    it("should do nothing if separatedFileMeta is not set", () => {
      const previousTransports = loggerBuilder["defaultTransport"];
      (loggerBuilder as any).handleSepartedFileLogs();
      expect(loggerBuilder["defaultTransport"]).toEqual(previousTransports);
    });
  });

  describe("build", () => {
    it("should add timestamp and label formats", () => {
      loggerBuilder.build();
      expect(loggerBuilder["defaultFormats"]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            format: loggerBuilder["timestampFormat"],
          }),
          expect.objectContaining({
            label: "caller",
            message: loggerBuilder["addCallerNameToMessageAsPrefix"],
          }),
        ])
      );
    });

    it("should handle separated file logs", () => {
      loggerBuilder.addSeparatedFileLogs("test-dir");
      loggerBuilder.build();
      expect(loggerBuilder["defaultTransport"]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            filename: expect.stringContaining(".log"),
            dirname: "test-dir",
          }),
        ])
      );
    });

    it("should return an instance of LogsProvider", () => {
      const logsProvider = loggerBuilder.build();
      expect(logsProvider).toBeInstanceOf(LogsProvider);
    });
  });
});
