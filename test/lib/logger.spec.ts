import { transports } from "winston";
import type LoggerInstance from "../../src/interfaces/log.interface";
import { LogsProvider } from "../../src/lib/logger";
import ContextGenerator from "../../src/lib/context-generator";
import { v4 } from "uuid";

describe("Logger", () => {
  describe("isSilent", () => {
    const originalEnv = process.env;
    let logSilent: string;
    beforeEach(() => {
      jest.resetModules();
      process.env = {
        ...originalEnv,
        LOG_SILENT: logSilent,
      };
      logSilent = "set";
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it("should return false when when LOG_SILENT is not set", () => {
      expect(LogsProvider.isSilent()).toBeFalsy();
    });
    it("should return true when when LOG_SILENT is set as true", () => {
      expect(LogsProvider.isSilent()).toBeTruthy();
    });
  });

  describe("getInstance", () => {
    let logs: LogsProvider;
    it("should create a temp logger with only console logger when getInstance is called witout opts and currently instance is undefined", () => {
      logs = LogsProvider.getInstance();
      expect(logs).toBeDefined();
      expect(logs.logger.transports).toBeDefined();
      expect(logs.logger.transports.length).toEqual(1);
    });

    it("should create a instance of logger with opts and override the existing instance", () => {
      logs = LogsProvider.getInstance({
        transports: [
          new transports.File({
            filename: "logs",
          }),
          new transports.Console(),
        ],
      });

      expect(logs).toBeDefined();
      expect(logs.logger).toBeDefined();
      expect(logs.logger.transports.length).toEqual(2);
    });

    it("should return same instance if getInstance is called without opts and when instance is defined to return existing one", () => {
      logs = LogsProvider.getInstance();

      expect(logs).toBeDefined();
      expect(logs.logger).toBeDefined();
      expect(logs.logger.transports.length).toEqual(2);
    });

    it("should create a instance of logger with opts and override the existing instance", () => {
      logs = LogsProvider.getInstance({
        transports: [
          new transports.File({
            filename: "logs",
          }),
          new transports.Console(),
          new transports.Console(),
        ],
      });

      expect(logs).toBeDefined();
      expect(logs.logger).toBeDefined();
      expect(logs.logger.transports.length).toEqual(3);
    });
  });

  describe("addRequestScope", () => {
    class MockApp {
      callback?: (
        req: { method: string; path: string },
        res: {
          setHeader: any;
        },
        next: Function
      ) => void;
      use(cb: any) {
        this.callback = cb;
      }
    }

    it("should add middleware for request tracking", () => {
      const mockApp = new MockApp();
      const instance = LogsProvider.addRequestScope(
        mockApp as any
      ).getInstance();
      expect(mockApp.callback).toBeDefined();
      if (mockApp.callback)
        mockApp.callback(
          {
            method: "mock",
            path: "mock-log",
          },
          {
            setHeader: jest.fn(),
          },
          () => {
            expect(instance.localStorage?.getStore()).toBeDefined();
            expect(instance.localStorage?.getStore()).toBeInstanceOf(
              ContextGenerator
            );
            const ctx = instance.localStorage?.getStore()?.getContext();
            expect(ctx).toBeDefined();
            expect(ctx?.requestId).toBeDefined();
          }
        );
    });

    it("should add middleware for request tracking with custom context builder", () => {
      const mockApp = new MockApp();
      const instance = LogsProvider.addRequestScope(
        mockApp as any,
        (req, _res) => {
          return {
            path: req.path,
            method: req.method,
          };
        }
      ).getInstance();
      expect(mockApp.callback).toBeDefined();
      if (mockApp.callback)
        mockApp.callback(
          {
            method: "mock",
            path: "mock-log",
          },
          {
            setHeader: jest.fn(),
          },
          () => {
            expect(instance.localStorage?.getStore()).toBeDefined();
            expect(instance.localStorage?.getStore()).toBeInstanceOf(
              ContextGenerator
            );
            const ctx = instance.localStorage?.getStore()?.getContext();
            expect(ctx).toBeDefined();
            expect(ctx?.requestId).toBeDefined();
            expect(ctx?.["path"]).toBeDefined();
            expect(ctx?.["method"]).toBeDefined();
          }
        );
    });
  });

  describe("setLogOnUnhandledExceptions", () => {
    let logger: LoggerInstance;

    beforeAll(() => {
      LogsProvider.setLogOnUnhandledExceptions();
    });

    beforeEach(() => {
      logger = {
        fatal: jest.fn(),
        debug: jest.fn(),
        error: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        span: jest.fn(),
      };
      jest.spyOn(LogsProvider, "getLoggerInstance").mockReturnValueOnce(logger);
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it("should properly log uncaughtException", () => {
      const fakeError = new Error("fake error");

      process.emit("uncaughtException", fakeError);

      expect(LogsProvider.getLoggerInstance).toHaveBeenCalledWith(
        "uncaughtException"
      );
      expect(logger.fatal).toHaveBeenCalledWith("UncaughtException", fakeError);
    });

    it("should properly log unhandledRejection", async () => {
      try {
        const reason = "fake reason";
        const promise = Promise.resolve(12);
        process.emit("unhandledRejection", reason, promise);

        expect(LogsProvider.getLoggerInstance).toHaveBeenCalledWith(
          "unhandledRejection"
        );
        expect(logger.fatal).toHaveBeenCalledWith("UnhandledRejection", {
          reason,
          promise,
        });
      } catch (error) {}
    });
  });

  describe("setApplicationName", () => {
    it("should be undefined when not initalized", () => {
      expect(LogsProvider.getInstance().applicationName).toBeUndefined();
    });

    it("should be set when called to set", () => {
      const instance = LogsProvider.setApplicationName("AppName").getInstance();
      expect(instance.applicationName).toEqual("AppName");
    });
  });

  describe("getLoggerInstance", () => {
    const ctxName = "TestCTX";
    const loggerInstance = LogsProvider.getLoggerInstance(ctxName);
    it("should return a object of LogInterface type", () => {
      const keysOfLogInterface: (keyof LoggerInstance)[] = [
        "warn",
        "info",
        "error",
        "debug",
        "fatal",
      ];
      for (const key of keysOfLogInterface) {
        expect(loggerInstance[key]).toBeDefined();
        expect(typeof loggerInstance[key] === "function").toBeTruthy();
      }
    });

    describe("test for each log fns", () => {
      const mockLogger = {
        log: jest.fn(),
        defaultMeta: undefined,
        level: "debug",
      };

      beforeEach(() => {
        mockLogger.log = jest.fn();

        LogsProvider.setLogger(mockLogger as any);
      });
      describe("debug", () => {
        it("should call log method of winston with all data", () => {
          const mockData = {
            foo: "bar",
            id: v4(),
          };
          const message = "Some Debug Data";
          loggerInstance.debug(message, mockData);
          expect(mockLogger["defaultMeta"]).toBeDefined();
          expect(mockLogger.log).toHaveBeenLastCalledWith({
            level: "debug",
            message: message,
            caller: ctxName,
            data: [mockData],
          });
        });
      });

      describe("error", () => {
        it("should call log method of winston with all data", () => {
          const mockData = {
            foo: "bar",
            id: v4(),
          };
          const message = "Some Debug Data";
          const error = new Error("ERROR!!");
          loggerInstance.error(message, mockData, error);
          const args = LogsProvider.processExtraArgs([mockData, error]);
          expect(mockLogger["defaultMeta"]).toBeDefined();
          expect(mockLogger.log).toHaveBeenLastCalledWith({
            level: "error",
            message: message,
            data: args,
            caller: ctxName,
          });
        });
      });

      describe("info", () => {
        it("should call log method of winston with all data", () => {
          const message = "Some Debug Data";
          loggerInstance.info(message);
          expect(mockLogger["defaultMeta"]).toBeDefined();
          expect(mockLogger.log).toHaveBeenLastCalledWith({
            level: "info",
            data: [],
            message,
            caller: ctxName,
          });
        });
      });

      describe("fatal", () => {
        it("should call log method of winston with all data", () => {
          const mockData = {
            foo: "bar",
            id: v4(),
          };
          const error = new Error("ERROR!");
          const message = "Some Debug Data";

          loggerInstance.fatal(message, mockData, error);
          const args = [mockData, error];
          expect(mockLogger["defaultMeta"]).toBeDefined();
          expect(mockLogger.log).toHaveBeenLastCalledWith({
            level: "fatal",
            message,
            data: args,
            caller: ctxName,
          });
        });
      });

      describe("warn", () => {
        it("should call log method of winston with all data", () => {
          const message = "Some Debug Data";
          loggerInstance.warn(message);
          expect(mockLogger["defaultMeta"]).toBeDefined();
          expect(mockLogger.log).toHaveBeenLastCalledWith({
            level: "warn",
            message: message,
            caller: ctxName,
          });
        });
      });
    });
  });

  describe("getLogsMetadata", () => {
    class MockApp {
      callback?: (
        req: { method: string; path: string },
        res: any,
        next: Function
      ) => void;
      use(cb: any) {
        this.callback = cb;
      }
    }

    it("should provide with request context in metadata", () => {
      const mockApp = new MockApp();
      LogsProvider.addRequestScope(mockApp as any);
      if (mockApp.callback)
        mockApp.callback(
          {
            path: "mock-path",
            method: "mock-method",
          },
          {
            setHeader: jest.fn(),
          },
          () => {
            const metadata = LogsProvider.getInstance().getLogsMetadata();
            expect(metadata).toBeDefined();
            expect(metadata["requestId"]).toEqual(expect.any(String));
          }
        );
    });

    it("should provide applicationName when set", () => {
      const appName = "appName";
      LogsProvider.setApplicationName(appName);
      const metadata = LogsProvider.getInstance().getLogsMetadata();
      expect(metadata).toBeDefined();
      expect(metadata["applicationName"]).toEqual(appName);
    });
  });
});
