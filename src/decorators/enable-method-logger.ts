import { trace, SpanStatusCode } from '@opentelemetry/api';
import "reflect-metadata";
import { LogsProvider } from "../lib/logger"; 
import { catchError, Observable } from "rxjs";

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

      // Initialize OpenTelemetry tracer
      const tracer = trace.getTracer("default");
      const span = tracer.startSpan(`${className ? className + "." : ""}${propertyName}`);

      let result: any;
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
              span.setStatus({ code: SpanStatusCode.OK });
              span.end();
              return res;
            })
            .catch((error) => {
              logger.error(`[${ctx}] Error occurred`, error);
              span.setStatus({
                code: SpanStatusCode.ERROR,
                message: error.message,
              });
              span.recordException(error); 
              span.end();
              throw error;
            });
        } else if (result instanceof Observable) {
          result.pipe(
            catchError((err, caught) => {
              logger.error(`[${ctx}] Error occurred`, err);
              span.setStatus({
                code: SpanStatusCode.ERROR,
                message: err.message,
              });
              span.recordException(err);
              span.end();
              return caught;
            })
          );
        } else {
          logger.info(`[${ctx}] Ended successfully`);
          if (logsArgs) {
            logger.debug(`[${ctx}] Returned value:`, result);
          }
          span.setStatus({ code: SpanStatusCode.OK });
          span.end();
        }
      } catch (error) {
        if (error instanceof Error) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error.message,
          });
          span.recordException(error); 
        } else {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: 'Unknown error occurred', 
          });
          span.recordException(new Error('Unknown error occurred'));
        }
        
      }

      return result;
    },
  };
}
