// import "reflect-metadata";
// import { LogsProvider } from "../lib/logger";
// import { catchError, Observable } from "rxjs";
// function copyAllMetaDataToWrapper(
//   originalMethod: any,
//   descriptorWithNewMethod: PropertyDescriptor
// ) {
//   const metadataKeys = Reflect.getOwnMetadataKeys(originalMethod);
//   metadataKeys.forEach((key) => {
//     const metadata = Reflect.getMetadata(key, originalMethod);
//     Reflect.defineMetadata(key, metadata, descriptorWithNewMethod.value);
//   });
// }

// export function EnableMethodLogger(logsArgs?: boolean, className?: string) {
//   return function (
//     _target: any,
//     propertyName: string,
//     descriptor: PropertyDescriptor
//   ) {
//     const originalMethod = descriptor.value;
//     const fnObj = createFunctionWrapper(
//       propertyName,
//       className,
//       logsArgs,
//       originalMethod
//     );

//     descriptor.value = fnObj[propertyName];
//     copyAllMetaDataToWrapper(originalMethod, descriptor);

//     return descriptor;
//   };
// }
// function createFunctionWrapper(
//   propertyName: string,
//   className: string | undefined,
//   logsArgs: boolean | undefined,
//   originalMethod: any
// ) {
//   return {
//     [propertyName]: function (...args: []) {
//       const ctx = `${
//         className ? className + "." + propertyName : propertyName
//       }`;
//       const logger = LogsProvider.getLoggerInstance(ctx);
//       let result: any;
//       try {
//         logger.info("starting");
//         if (logsArgs) {
//           logger.debug("function was called with", args);
//         }
//         result = originalMethod.apply(this, args);

//         if (result instanceof Promise) {
//           result = result
//             .then((res) => {
//               logger.info(`Ending of method ${propertyName}`);
//               if (logsArgs) {
//                 logger.debug(`${propertyName} returned`, res);
//               }
//               return res;
//             })
//             .catch((error) => {
//               logger.error(`Error in method ${propertyName}`, error);
//               throw error;
//             });
//         } else if (result instanceof Observable) {
//           result.pipe(
//             catchError((err, caught) => {
//               logger.error(`Error in method ${propertyName}`, err);
//               return caught;
//             })
//           );
//         } else {
//           logger.info(`Ending of method ${propertyName}`);
//           if (logsArgs) {
//             logger.debug(`${propertyName} returned`, result);
//           }
//         }
//       } catch (error) {
//         logger.error(`Error in method ${propertyName}`, error);
//         throw error;
//       }
//       return result;
//     },
//   };
// }
