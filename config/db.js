const mysql = require("mysql2/promise");
require("dotenv").config();

const dbPassword =
  process.env.DB_PASSWORD ??
  process.env.MYSQL_PASSWORD ??
  process.env.MYSQL_PWD ??
  "";

// A connection pool lets many requests reuse a small number of database connections.
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: dbPassword,
  database: process.env.DB_NAME || "farmconnect",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;
