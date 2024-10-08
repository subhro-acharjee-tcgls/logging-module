# @TCG/Logger

A logging module developed for all js/ts based service of TCG.

## Motivation

At present, each microservice operates with its own distinct logging module,
leading to noticeable inconsistencies in logging.
Improvement in this area has been a collaborative objective for our entire team.
The proposed solution we are working towards is the development of a unified
logging module.
This singular module would be applicable across all microservices,
and could also be integrated successfully with a variety of observability tools.

## Installation

```sh
npm i tcgre-logging
```

## Features

### File Transports

There are two file transports, one is `combined` and another is `separated`.

#### Combined

When all the logs are in same file called `combined.log`

```typescript
const logProvider = new LoggerBuilder()
  .setCallerPrefix(true)
  .addCombinedFileLogs("<dirName>")
  .build();
```

#### Separated

When all the logs are separated by their levels.

```typescript
const logProvider = new LoggerBuilder()
  .setCallerPrefix(true)
  .addSeparatedFileLogs("<dirName>")
  .build();
```

### Transports

By default it accepts the winstons transports as we are using winston under the
hood. So a usecase where we need to add transport for lets say grafana then we
will be using [winston-loki](https://www.npmjs.com/package/winston-loki), by
setting it up during application bootstrap and passing to addTransports.

```typescript
...
 const logProvider = new LoggerBuilder()
    .setCallerPrefix(true)
    .addTransports(
      new winston.transports.Http(),
      new winston.transports.LokiTransport(),
      new winston.transports.DbTransport(),
    )
    .build();
...
```

### Formats

We are using [LogForm](https://www.npmjs.com/package/logform) for formatting
our logs. By default, `json`, `errors`, `timestamp` is already setted up, in
case, if you want more please refer to the docs for logform.

```typescript
import {format} from 'logform'
...
const volumeFormat = format((info, opts) => {
  if (opts.yell) {
    info.message = info.message.toUpperCase();
  } else if (opts.whisper) {
    info.message = info.message.toLowerCase();
  }

  return info;
});
...
 const logProvider = new LoggerBuilder()
    .setCallerPrefix(true)
    .addFormats(
      format.cli(),
      volume(),
    )
    .build();
...
```

### LogLevels

So by default the log levels are as such.

```typescript
const defaultLogLevels = {
  fatal: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
};
```

And default Level is set to `debug`. Change it using.

```typescript
...
const loggerProvider = new LoggerBuilder().setLogLevel("info").build();
...
```

### Silencing Console Logs

use the env variable to silence the console logs.

```bash
export LOG_SILENT=true;
```

### Attach request ids to request scope

```typescript
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { LoggerBuilder } from "tcgre-logging";

async function bootstrap() {
  const logProvider = new LoggerBuilder().setCallerPrefix(true).build();
  const app = await NestFactory.create(AppModule);

  logProvider
    .addRequestScope(app as any) // attaches a request id to all the request.
    .setLogOnUnhandledExceptions() // attaches logger to unhandled rejections
    // and unhandled promised.
    // set application name in case all the logs are collected in the same
    //place.
    .setApplicationName("Pg-Backend apis");

  await app.listen(process.env.PORT || 9000);
}

bootstrap();
```

#### Add request context builder

You can add a method that will enable you to select the data related to a
request that can be added to the logs.

```typescript
 logProvider = new LoggerBuilder().setCallerPrefix(true).build();
  const app = await NestFactory.create(AppModule);

  logProvider
    .addRequestScope(app as any, (req, _res) => {
     return {
       path: req.path,
       method: req.method,
       someReallyUsefulHeader: req.headers['x-useful-header'],
     }
   }) // attaches a request id to all the request.
    .setLogOnUnhandledExceptions() // attaches logger to unhandled rejections
    // and unhandled promised.
    // set application name in case all the logs are collected in the same
    //place.
    .setApplicationName("Pg-Backend apis");

  await app.listen(process.env.PORT || 9000);
}

bootstrap();
```

### Add AutoLogs

This will proceed to document all of the methods encapsulated within this class,
specifically, it will record the instances of their initiation and termination.

```typescript
import { EnableClassLogger } from "tcgre-logging";

@EnableClassLogger()
class SomeClassWithMethod {
  method1() {
    return new Date();
  }
}
```

### Add Autologs with all params

This will proceed to document all of the methods encapsulated within this class,
specifically, it will record the instances of their initiation and termination
but this will also include all the params and return value for those methods

```typescript
import { EnableClassLogger } from "tcgre-logging";

@EnableClassLogger(true)
class SomeClassWithMethod {
  method1() {
    return new Date();
  }
}
```

### Get logger instance

```typescript
import { getLogger } from "tcgre-logging";

class SomeClassWithMethod {
  private logger = getLogger(SomeClassWithMethod.name);

  method1() {
    this.logger.debug(
      "Some message",
      new Date(),
      { foo: "bar" },
      "just like console log"
    );

    return;
  }
}
```

## TODO

- [ ] Add better documentation
- [ ] Add jsdocs
- [ ] Add axios interceptors
