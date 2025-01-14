import { LogsProvider } from "../lib/logger";
import { catchError, Observable } from "rxjs";
import "reflect-metadata";
import { isNil } from "lodash";
import { SpanStatusCode } from "@opentelemetry/api";

function copyAllMetaDataToWrapper(
  originalMethod: any,
  descriptorWithNewMethod: PropertyDescriptor
) {
  const metadataKeys = Reflect.getOwnMetadataKeys(originalMethod);
  metadataKeys.forEach((key) => {
    const metadata = Reflect.getMetadata(key, originalMethod);
    Reflect.defineMetadata(key, metadata, descriptorWithNewMethod.value);
  });
}

export function EnableMethodLogger(logArgs?: boolean, className?: string) {
  return function (
    _target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    const wrappedMethod = createFunctionWrapper(
      propertyKey,
      className,
      logArgs,
      originalMethod
    );

    descriptor.value = wrappedMethod[propertyKey];
    copyAllMetaDataToWrapper(originalMethod, descriptor);
    return descriptor;
  };
}

function createFunctionWrapper(
  propertyName: string,
  className: string | undefined,
  logArgs: boolean | undefined,
  originalMethod: any
) {
  return {
    [propertyName]: function (...args: any[]) {
      const ctx = `${
        className ? className + "." + propertyName : propertyName
      }`;
      const logger = LogsProvider.getLoggerInstance(ctx);

      let result: any;
      const spanName = `${className ? className + "." : ""}${propertyName}`;
      const spanContext = { className, propertyName, args };
      const span = logger.span(spanName, spanContext);
      let attributes: Record<string, any> = {};

      try {
        logger.info(`[${ctx}] Starting execution`);
        attributes = {
          ...attributes,
          className: className || "UnknownClass",
          propertyName: propertyName || "UnknownProperty",
          context: ctx,
        };

        if (logArgs) {
          logger.debug(`[${ctx}] Arguments:`, args);
          attributes["arguments"] = args;
        }

        result = originalMethod.apply(this, args);

        if (result instanceof Promise) {
          result = result
            .then((res) => {
              logger.info(`[${ctx}] Ended successfully`);
              if (logArgs) {
                logger.debug(`[${ctx}] Returned value:`, res);
              }
              if (!isNil(span)) {
                span.addEvent(`Function ${spanName} ended successfully`, {
                  result,
                });

                attributes = {
                  ...attributes,
                  resultType: typeof res,
                  result: res,
                };

                span.setStatus({
                  code: SpanStatusCode.OK,
                  message: "ended successfully",
                });
                span.setAttributes(attributes);

                span.end();
              }
              return res;
            })
            .catch((error) => {
              logger.error(`[${ctx}] Error occurred`, error);
              if (!isNil(span)) {
                span.addEvent(`Function ${spanName} ended with error`);

                attributes = {
                  ...attributes,
                  errorName: error.name || "Error",
                  errorMessage: error.message || `${error}`,
                  errorStack: error.stack || "",
                };
                span.setStatus({
                  code: SpanStatusCode.ERROR,
                  message: "ended with error",
                });
                span.setAttributes(attributes);

                span.end();
              }
              throw error;
            });
        } else if (result instanceof Observable) {
          result = result.pipe(
            catchError((err) => {
              logger.error(`[${ctx}] Error occurred`, err);
              if (!isNil(span)) {
                span.addEvent(`Function ${spanName} ended with error`, {
                  error: err,
                });
                attributes = {
                  ...attributes,
                  errorName: err.name || "Error",
                  errorMessage: err.message || `${err}`,
                };
                span.setStatus({
                  code: SpanStatusCode.ERROR,
                  message: "ended with error",
                });
                span.setAttributes(attributes);

                span.end();
              }
              throw err;
            })
          );
        } else {
          logger.info(`[${ctx}] Ended successfully`);
          if (logArgs) {
            logger.debug(`[${ctx}] Returned value:`, result);
          }
          if (!isNil(span)) {
            span.addEvent(`Function ${spanName} ended successfully`);
            attributes = {
              ...attributes,
              resultType: typeof result,
              result,
            };
            span.setStatus({
              code: SpanStatusCode.OK,
              message: "ended successfully",
            });
            span.setAttributes(attributes);

            span.end();
          }
        }
      } catch (error) {
        if (error instanceof Error) {
          logger.error(`[${ctx}] Error occurred`, error);
          if (!isNil(span)) {
            span.addEvent(`Function ${spanName} ended with error`);
            attributes = {
              ...attributes,

              errorName: error.name || "Error",
              errorMessage: error.message || `${error}`,
              errorStack: error.stack || "",
            };

            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: "ended with error",
            });
            span.setAttributes(attributes);
            span.end();
          }
        } else {
          logger.error(`[${ctx}] Unknown error occurred`);
          if (!isNil(span)) {
            span.addEvent(`Function ${spanName} ended with error`);
            attributes = {
              ...attributes,
              error: error,
            };
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: "ended with error",
            });
            span.setAttributes(attributes);
            span.end();
          }
        }
      }

      return result;
    },
  };
}
