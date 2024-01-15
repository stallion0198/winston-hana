/**
 * winston을 위한 MySQL transport module을 SAP HANA에서 동작할 수 있도록 Port 하였습니다.
 * https://github.com/winstonjs/winston
 * https://github.com/charles-zh/winston-mysql
 * https://github.com/stallion0198/winston-hana
 * Notice: 사용하기 전에 우선 Table을 작성합니다.
 * 기본 Field는 (HANA는 대문자가 기본) 'LEVEL', 'META', 'MESSAGE', 'TIMESTAMP' 이지만,
 * 사용자 Table Field를 정의하여 적용할 수 있습니다. options.fields에 정의하면 됩니다.
 * 사용 예: options.fields = { level: 'mylevel', meta: 'metadata', message: 'source', timestamp: 'addDate'}
 * Table 생성 예시:
 *
 CREATE TABLE "WINSTONTEST"."SYS_LOGS_DEFAULT" (
 "ID" INT NOT NULL GENERATED ALWAYS AS IDENTITY,
 "LEVEL" VARCHAR(16) NOT NULL,
 "MESSAGE" VARCHAR(2048) NOT NULL,
 "META" VARCHAR(2048) NOT NULL,
 "TIMESTAMP" TIMESTAMP NOT NULL,
 PRIMARY KEY ("ID"));
 *
 CREATE TABLE "WINSTONTEST"."SYS_LOGS_CUSTOM" (
 "ID" INT NOT NULL GENERATED ALWAYS AS IDENTITY,
 "MYLEVEL" VARCHAR(16) NOT NULL,
 "SOURCE" VARCHAR(1024) NOT NULL,
 "METADATA" VARCHAR(2048) NOT NULL,
 "ADDDATE" TIMESTAMP NOT NULL,
 PRIMARY KEY ("ID"));
 */

const transport = require('winston-transport');
const hana = require('@sap/hana-client');

/**
 * @constructor
 * @param {Object} options Options for the HANA & log plugin
 * @param {String} options.level **Optional** target logging level
 * @param {String} options.serverNode Database serverNode(host:port)
 * @param {String} options.user Database username
 * @param {String} options.password Database password
 * @param {String} options.database Database name
 * @param {String} options.table Database table for the logs
 * @param {Object} **Optional** options.fields Log object, set custom fields for the log table
 */
module.exports = class HANATransport extends transport {
  constructor(options = {}) {
    super(options);

    this.name = 'HANA';

    this.options = options || {};

    // check parameters
    if (!options.serverNode) {
      throw new Error('The database serverNode is required');
    }
    if (!options.user) {
      throw new Error('The database username is required');
    }
    if (!options.password) {
      throw new Error('The database password is required');
    }
    if (!options.database) {
      throw new Error('The database name is required');
    }
    if (!options.table) {
      throw new Error('The database table is required');
    }

    //check custom table fields - protect
    if (!options.fields) {
      this.options.fields = {};
      //use default names
      this.fields = {
        level: 'LEVEL',
        meta: 'META',
        message: 'MESSAGE',
        timestamp: 'TIMESTAMP',
      };
    } else {
      //use custom table field names
      this.fields = {
        level: this.options.fields.level,
        meta: this.options.fields.meta,
        message: this.options.fields.message,
        timestamp: this.options.fields.timestamp,
      };
    }

    const connOpts = {
      serverNode: options.serverNode,
      user: options.user,
      password: options.password,
    };

    const poolProps = {
      poolCapacity: 10, //max # of connections in the pool waiting to be used
      maxConnectedOrPooled: 20, //max # of connections in the pool + the # of connections in use
      pingCheck: false,
      allowSwitchUser: false, //requires SAP HANA Client 2.17
      maxPooledIdleTime: 3600, //1 hour (in seconds)
    };

    this.pool = hana.createPool(connOpts, poolProps);
  }

  /**
   * function log (info, callback)
   * {level, msg, [meta]} = info
   * @level {string} Level at which to log the message.
   * @msg {string} Message to log
   * @meta {Object} **Optional** Additional metadata to attach
   * @callback {function} Continuation to respond to when complete.
   * Core logging method exposed to Winston. Metadata is optional.
   */

  log(info, callback) {
    // get log content
    const { level, message, ...winstonMeta } = info;

    // Logging Level을 지정하였을 경우, 지정한 Level Log가 아니면 건너뛴다.
    if (this.options.level && this.options.level !== level) {
      return;
    }

    process.nextTick(() => {
      // protect
      if (!callback) {
        callback = () => {};
      }

      this.pool.getConnection((err, connection) => {
        if (err) {
          // connect error
          return callback(err, null);
        }

        // Save the log
        connection.exec(
          `INSERT INTO ${this.options.database}.${this.options.table} VALUES (?, ?, ?, ?)`,
          [
            level,
            message,
            JSON.stringify(winstonMeta),
            new Date().toISOString(), // HANA TIMESTAMP DataType에 대응
          ],
          (err, results, fields) => {
            if (err) {
              setImmediate(() => {
                this.emit('error', err);
              });
              return callback(err, null);
            }
            // finished
            connection.disconnect();
            setImmediate(() => {
              this.emit('logged', info);
            });

            callback(null, true);
          },
        );
      });
    });
  }
};
