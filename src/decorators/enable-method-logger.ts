import { LogsProvider } from "../lib/logger";
import { catchError, Observable } from "rxjs";
import "reflect-metadata";

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
  logsArgs: boolean | undefined,
  originalMethod: any
) {
  return {
    [propertyName]: function (...args: any[]) {
      const ctx = `${className ? className + "." + propertyName : propertyName}`;
      const logger = LogsProvider.getLoggerInstance(ctx);

      let result: any;
      const spanName = `${className ? className + "." : ""}${propertyName}`;
      const spanContext = { className, propertyName, args };
      const span = logger.span(spanName, spanContext); 

      try {
        logger.info(`[${ctx}] Starting execution`);
        if (logsArgs) {
          logger.debug(`[${ctx}] Arguments:`, args);
        }

        result = originalMethod.apply(this, args);

        if (result instanceof Promise) {
          result = result
            .then((res) => {
              logger.info(`[${ctx}] Ended successfully`);
              if (logsArgs) {
                logger.debug(`[${ctx}] Returned value:`, res);
              }
              // Log span with result
              if (span) span.end(); 
              logger.span(spanName, spanContext, { status: 'OK', result: res });
              return res;
            })
            .catch((error) => {
              logger.error(`[${ctx}] Error occurred`, error);
              span.end();
              logger.span(spanName, spanContext, { status: 'ERROR', error });
              throw error;
            });
        } else if (result instanceof Observable) {
          result = result.pipe(
            catchError((err) => {
              logger.error(`[${ctx}] Error occurred`, err);
              span.end();
              logger.span(spanName, spanContext, { status: 'ERROR', error: err });
              throw err;
            })
          );
        } else {
          logger.info(`[${ctx}] Ended successfully`);
          if (logsArgs) {
            logger.debug(`[${ctx}] Returned value:`, result);
          }
          // Log span with result
          span.end();
          logger.span(spanName, spanContext, { status: 'OK', result });
        }
      } catch (error) {
        if (error instanceof Error) {
          logger.error(`[${ctx}] Error occurred`, error);
          span.end(); 
  
          logger.span(`${ctx} Error`, spanContext, { status: 'ERROR', error });
        } else {
          logger.error(`[${ctx}] Unknown error occurred`);
          span.end(); 
          // Log span with error
          logger.span(`${ctx} Error`, spanContext, { status: 'ERROR', error: new Error('Unknown error occurred') });
        }
      }

      return result;
    },
  };
}
