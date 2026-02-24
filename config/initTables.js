const db = require("./db");

const initTables = () => {

   // ---------------- ROLES ----------------
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

   // ---------------- USERS ----------------
   db.query(`
   CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100),
      email VARCHAR(100) UNIQUE,
      password VARCHAR(255),
      role_id INT,
      reset_token VARCHAR(255),
      reset_token_expiry DATETIME,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (role_id) REFERENCES roles(id)
   )
`);

   // ---------------- PROJECTS ----------------
   db.query(`
      CREATE TABLE IF NOT EXISTS projects (
         id INT AUTO_INCREMENT PRIMARY KEY,
         name VARCHAR(255) UNIQUE,
         location VARCHAR(255),
         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
   `);

   // ---------------- LEADS ----------------
   db.query(`
      CREATE TABLE IF NOT EXISTS leads (
         id INT AUTO_INCREMENT PRIMARY KEY,
         name VARCHAR(100),
         phone VARCHAR(20),
         email VARCHAR(100),
         source VARCHAR(100),
         status VARCHAR(50),
         project_id INT,
         assigned_to INT,
         created_by INT,
         is_converted BOOLEAN DEFAULT FALSE,
         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
         FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
         FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
         FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      )
   `);

   // ---------------- FOLLOWUPS ----------------
   db.query(`
      CREATE TABLE IF NOT EXISTS followups (
         id INT AUTO_INCREMENT PRIMARY KEY,
         lead_id INT,
         note TEXT,
         next_followup_date DATE,
         created_by INT,
         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
         FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
         FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      )
   `);

   // ---------------- SALE DETAILS ----------------
   db.query(`
      CREATE TABLE IF NOT EXISTS sale_details (
         id INT AUTO_INCREMENT PRIMARY KEY,
         lead_id INT,
         sale_amount DECIMAL(12,2),
         closing_date DATE,
         created_by INT,
         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
         FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
         FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      )
   `);

   // ---------------- NOTIFICATIONS ----------------
   db.query(`
      CREATE TABLE IF NOT EXISTS notifications (
         id INT AUTO_INCREMENT PRIMARY KEY,
         user_id INT,
         message TEXT,
         type VARCHAR(50),
         is_read BOOLEAN DEFAULT FALSE,
         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
         FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
   `);

   // ---------------- LEAD ACTIVITIES ----------------
   db.query(`
      CREATE TABLE IF NOT EXISTS lead_activities (
         id INT AUTO_INCREMENT PRIMARY KEY,
         lead_id INT,
         user_id INT,
         action VARCHAR(255),
         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
         FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
         FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
   `);

   console.log("All tables checked/created successfully");
};

module.exports = initTables;