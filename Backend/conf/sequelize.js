require('dotenv').config()

module.exports = {
    database: process.env.RDB_DATABASE,
    username: process.env.RDB_USERNAME,
    password: process.env.RDB_PASSWORD,
    host: process.env.RDB_HOST,
    port: process.env.RDB_PORT,
    timezone: '+09:00'
};