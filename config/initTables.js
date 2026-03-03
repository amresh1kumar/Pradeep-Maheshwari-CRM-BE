const db = require("./db");

const initTables = async () => {
   try {

      // ROLES
      await db.query(`
         CREATE TABLE IF NOT EXISTS roles (
            id INT AUTO_INCREMENT PRIMARY KEY,
            role_name VARCHAR(50) UNIQUE
         )
      `);

      await db.query(`
         INSERT IGNORE INTO roles (role_name)
         VALUES ('admin'), ('staff')
      `);

      // USERS
      await db.query(`
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

      // PROJECTS
      await db.query(`
         CREATE TABLE IF NOT EXISTS projects (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) UNIQUE,
            location VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
         )
      `);

      // LEADS
      await db.query(`
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

      // FOLLOWUPS
      await db.query(`
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

      // SALE DETAILS
      await db.query(`
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

      // NOTIFICATIONS
      await db.query(`
      CREATE TABLE IF NOT EXISTS notifications (
         id INT AUTO_INCREMENT PRIMARY KEY,

         user_id INT NOT NULL,
         message TEXT NOT NULL,
         type VARCHAR(50) NOT NULL,

         reference_id INT,
         reference_type VARCHAR(50),

         is_read BOOLEAN DEFAULT FALSE,
         is_deleted BOOLEAN DEFAULT FALSE,

         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

         FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

         UNIQUE KEY unique_notification (user_id, reference_id, reference_type),
         INDEX idx_user_notifications (user_id, is_deleted, created_at)
   )
`);

      // LEAD ACTIVITIES
      await db.query(`
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

      // APP CONFIG
      await db.query(`
         CREATE TABLE IF NOT EXISTS app_config (
            id INT PRIMARY KEY AUTO_INCREMENT,
            max_users INT DEFAULT 10,
            max_admin INT DEFAULT 2
         )
      `);

      await db.query(`
         INSERT IGNORE INTO app_config (id, max_users, max_admin)
         VALUES (1, 10, 2)
      `);

      console.log("✅ All tables initialized successfully");

   } catch (error) {

      console.error("Table initialization failed:", error.message);
      process.exit(1); // stop server if DB structure fails

   }
};

module.exports = initTables;