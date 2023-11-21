const mysql = require('mysql2/promise');
var config = require('./db_info').local;

var connection_info = {
    init: function () {
      //return mysql.createConnection({
      if (process.env.NODE_ENV === "production") {
        config = require('./db_info').local;
      }
      return mysql.createPool({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        database: config.database,
        connectionLimit: 30
      });
    }
  };

module.exports = connection_info;