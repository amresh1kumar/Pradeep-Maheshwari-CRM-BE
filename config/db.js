
// const mysql = require("mysql2");

// const db = mysql.createConnection({
//    host: "localhost",
//    user: "root",
//    password: "",
//    database: "project_crm_db"
//    // database: "mydata"
// });

// db.connect(err => {
//    if (err) throw err;
//    console.log("MySQL Connected");
// });

// module.exports = db;


const mysql = require("mysql2");
require("dotenv").config();

const pool = mysql.createPool({
   host: process.env.DB_HOST,
   user: process.env.DB_USER,
   password: process.env.DB_PASSWORD,
   database: process.env.DB_NAME,
   waitForConnections: true,
   connectionLimit: process.env.DB_CONNECTION_LIMIT || 10,
   queueLimit: 0
});

pool.getConnection((err, connection) => {
   if (err) {
      console.error("MySQL Pool Error:", err.message);
      return;
   }
   console.log("MySQL Pool Connected");
   connection.release();
});

module.exports = pool;