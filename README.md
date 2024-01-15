# winston-hana

SAP HANA transport plugin for winston@3.x logger

#### <https://github.com/stallion0198/winston-hana>

## introduction

This SAP HANA transport module is a plugin for winston@3.x logger running in node.js.

Current version plugin supports Winston@3.x.

This module is ported from winston-mysql<<https://github.com/charles-zh/winston-mysql>>.

SAP HANA has some different features(options, syntax, limite, etc.) with MySQL, this port applied that.

Thanks to [charles-zh](https://github.com/charles-zh).

## synopsis

Please check test/test.js for demo usage

```js
const cds = require('@sap/cds');
const util = require('util');
const HANATransport = require('winston-hana');

const options_default = {
  serverNode: '<your-db-servernode>:<your-db-port>',
  user: '<your-username>',
  password: '<your-password>',
  database: '<your-schema>',
  table: 'SYS_LOGS_DEFAULT',
};

// custom log table fields
const options_custom = {
  serverNode: '<your-db-servernode>:<your-db-port>',
  user: '<your-username>',
  password: '<your-password>',
  database: '<your-schema>',
  table: 'SYS_LOGS_CUSTOM',
  fields: {
    level: 'MYLEVEL',
    message: 'SOURCE',
    meta: 'METADATA',
    timestamp: 'ADDDATE',
  },
};

cds.log.Logger = (label, level) => {
  // construct winston logger
  const logger = winston.createLogger({
    levels: cds.log.levels, // use cds.log's levels
    level: Object.keys(cds.log.levels)[level],
    format: winston.format.json(),
    defaultMeta: { service: 'user-service' },
    transports: [
      new winston.transports.Console({
        format: winston.format.simple(),
      }),
      // or use: options_custom
      new HANATransport(options_default),
    ],
  });
  // winston's log methods expect single message strings
  const _fmt = (args) =>
    util.formatWithOptions({ colors: false }, `[${label}] -`, ...args);
  // map to cds.log's API
  return Object.assign(logger, {
    trace: (...args) => logger.TRACE(_fmt(args)),
    debug: (...args) => logger.DEBUG(_fmt(args)),
    log: (...args) => logger.INFO(_fmt(args)),
    info: (...args) => logger.INFO(_fmt(args)),
    warn: (...args) => logger.WARN(_fmt(args)),
    error: (...args) => logger.ERROR(_fmt(args)),
  });
};

const LOG = cds.log('test', 'debug'); // log level: debug
const rnd = Math.floor(Math.random() * 1000);
const msg = `test message ${rnd}`;

LOG.debug(msg, { message: msg, type: 'demo' });
LOG.error(msg, { message: msg, type: 'demo' });
LOG.info(msg, { message: msg, type: 'demo' });
LOG.warn(msg, { message: msg, type: 'demo' });
```

## installation

You should create a table in the database first.

Demos:

```SQL
 CREATE TABLE "WINSTONTEST"."SYS_LOGS_DEFAULT" (
 "ID" INT NOT NULL GENERATED ALWAYS AS IDENTITY,
 "LEVEL" VARCHAR(16) NOT NULL,
 "MESSAGE" VARCHAR(2048) NOT NULL,
 "META" VARCHAR(2048) NOT NULL,
 "TIMESTAMP" TIMESTAMP NOT NULL,
 PRIMARY KEY ("ID"));

 # or
 CREATE TABLE "WINSTONTEST"."SYS_LOGS_CUSTOM" (
 "ID" INT NOT NULL GENERATED ALWAYS AS IDENTITY,
 "MYLEVEL" VARCHAR(16) NOT NULL,
 "SOURCE" VARCHAR(1024) NOT NULL,
 "METADATA" VARCHAR(2048) NOT NULL,
 "ADDDATE" TIMESTAMP NOT NULL,
 PRIMARY KEY ("ID"));

```

If you already have the log table, you can set custom fields for this module.

```js
// custom log table fields
const options_custom = {
  serverNode: '<your-db-servernode>:<your-db-port>',
  user: '<your-username>',
  password: '<your-password>',
  database: '<your-schema>',
  table: 'SYS_LOGS_CUSTOM',
  fields: {
    level: 'MYLEVEL',
    message: 'SOURCE',
    meta: 'METADATA',
    timestamp: 'ADDDATE',
  },
};
```

Install via npm:

```sh
$ npm install --save winston-hana
```

## documentation

Head over to <https://github.com/stallion0198/winston-hana>

## run tests

Register SAP ID and Trial account<<https://account.hanatrial.ondemand.com>>.

Create HANA Cloud Free Tier instance to your Trial account.

Maybe SAP Developer Tutorial<<https://developers.sap.com/group.hana-cloud-get-started-1-trial.html>> is helpful.

Then, create Tables using SQL commands above.

```sh
$ npm test
```
