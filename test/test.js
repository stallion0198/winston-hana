const assert = require('assert');
const { expect } = require('chai');
const winston = require('winston');
const util = require('util');
const cds = require('@sap/cds');
const conn = require('@sap/hana-client').createConnection();
const hana = require('@sap/hana-client/extension/Promise');
const winstonHANA = require('../lib/hana_transport');
const { setTimeout } = require('timers/promises');

// test config for database, you can change it with your configuration.
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

// get total log numbers
const getLogCount = async (options) => {
  try {
    // create the connection to database
    await hana.connect(
      conn,
      `serverNode=${options.serverNode};uid=${options.user};pwd=${options.password}`,
    );
    // simple query
    const rows = await hana.exec(
      conn,
      `SELECT COUNT(*) AS NUM FROM ${options.database}.${options.table}`,
    );
    // close the connection
    await hana.close(conn);
    return rows[0].NUM;
  } catch (err) {
    console.log(err.message);
    return 0;
  }
};

describe('Test HANA transport for winston', async function () {
  await describe('Log to database should pass', async function () {
    let beforeCount = 0;
    before(async function () {
      beforeCount = await getLogCount(options_default);
      console.log(`before test numbers: ${beforeCount}`);
    });

    await it('always pass', async function (done) {
      try {
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
              new winstonHANA(options_default),
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

        const LOG = cds.log('default-test', 'debug');
        const rnd = Math.floor(Math.random() * 1000);
        const msg = `test message ${rnd}`;

        LOG.debug(msg, { message: msg, type: 'demo' });
        LOG.error(msg, { message: msg, type: 'demo' });
        LOG.info(msg, { message: msg, type: 'demo' });
        LOG.warn(msg, { message: msg, type: 'demo' });

        done();
      } catch (err) {
        console.log(err.message);
        done(err);
        assert(false);
      }
    });

    after(async function () {
      await setTimeout(4000); // wait insert...HANA trial maybe very slow depend your region
      const afterCount = await getLogCount(options_default);
      console.log(`after test numbers: ${afterCount}`);
      expect(afterCount - beforeCount).to.be.equal(4);
    });
  });

  await describe('Log to database should pass', async function () {
    let beforeCount = 0;
    before(async function () {
      beforeCount = await getLogCount(options_custom);
      console.log(`before test numbers: ${beforeCount}`);
    });

    await it('always pass', async function (done) {
      try {
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
              new winstonHANA(options_custom),
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

        const LOG = cds.log('custom-test', 'debug');
        const rnd = Math.floor(Math.random() * 1000);
        const msg = `test message ${rnd}`;

        LOG.debug(msg, { message: msg, type: 'demo' });
        LOG.error(msg, { message: msg, type: 'demo' });
        LOG.info(msg, { message: msg, type: 'demo' });
        LOG.warn(msg, { message: msg, type: 'demo' });

        done();
      } catch (err) {
        console.log(err.message);
        done(err);
        assert(false);
      }
    });

    after(async function () {
      await setTimeout(4000); // wait insert...HANA trial maybe very slow depend your region
      const afterCount = await getLogCount(options_custom);
      console.log(`after test numbers: ${afterCount}`);
      expect(afterCount - beforeCount).to.be.equal(4);
    });
  });
});
