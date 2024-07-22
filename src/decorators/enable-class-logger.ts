import { EnableMethodLogger } from "./enable-method-logger";

type Constructor = { new (...args: any[]): any };
export function EnableClassLogger(logArgs?: boolean) {
  return function <T extends Constructor>(constructor: T) {
    const methodDecorator = EnableMethodLogger(logArgs, constructor.name);
    for (const key of Object.getOwnPropertyNames(constructor.prototype)) {
      if (key !== "constructor") {
        const descriptor = Object.getOwnPropertyDescriptor(
          constructor.prototype,
          key
        );
        if (descriptor && typeof descriptor.value === "function") {
          Object.defineProperty(
            constructor.prototype,
            key,
            methodDecorator(constructor.prototype, key, descriptor)
          );
        }
      }
    }
  };
}
