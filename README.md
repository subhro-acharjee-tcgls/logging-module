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

### Usage

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
