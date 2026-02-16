const db = require("./db");
const bcrypt = require("bcryptjs");

const initTables = () => {

   // ROLES
   db.query(`
      CREATE TABLE IF NOT EXISTS roles (
         id INT AUTO_INCREMENT PRIMARY KEY,
         role_name VARCHAR(50) UNIQUE
      )
   `);

   db.query(`
      INSERT IGNORE INTO roles (role_name)
      VALUES ('admin'), ('staff')
   `);

   // USERS
   db.query(`
      CREATE TABLE IF NOT EXISTS users (
         id INT AUTO_INCREMENT PRIMARY KEY,
         name VARCHAR(100),
         email VARCHAR(100) UNIQUE,
         password VARCHAR(255),
         role_id INT,
         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
         FOREIGN KEY (role_id) REFERENCES roles(id)
      )
   `);

   // LEADS
   db.query(`
      CREATE TABLE IF NOT EXISTS leads (
         id INT AUTO_INCREMENT PRIMARY KEY,
         name VARCHAR(100),
         phone VARCHAR(20),
         email VARCHAR(100),
         source VARCHAR(100),
         status VARCHAR(50),
         assigned_to INT,
         created_by INT,
         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
         FOREIGN KEY (assigned_to) REFERENCES users(id),
         FOREIGN KEY (created_by) REFERENCES users(id)
      )
   `);

   // FOLLOWUPS
   db.query(`
      CREATE TABLE IF NOT EXISTS followups (
         id INT AUTO_INCREMENT PRIMARY KEY,
         lead_id INT,
         note TEXT,
         next_followup_date DATE,
         created_by INT,
         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
         FOREIGN KEY (lead_id) REFERENCES leads(id),
         FOREIGN KEY (created_by) REFERENCES users(id)
      )
   `);

   // SALE DETAILS
   db.query(`
      CREATE TABLE IF NOT EXISTS sale_details (
         id INT AUTO_INCREMENT PRIMARY KEY,
         lead_id INT,
         sale_amount DECIMAL(12,2),
         closing_date DATE,
         created_by INT,
         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
         FOREIGN KEY (lead_id) REFERENCES leads(id),
         FOREIGN KEY (created_by) REFERENCES users(id)
      )
   `);

   console.log("All tables checked/created");
};

module.exports = initTables;
