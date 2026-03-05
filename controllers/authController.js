
const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

exports.login = async (req, res) => {
   try {

      const { email, password } = req.body;

      if (!email || !password) {
         return res.status(400).json({
            message: "Email and password are required"
         });
      }

      const [rows] = await db.query(`
         SELECT users.*, roles.role_name
         FROM users
         JOIN roles ON users.role_id = roles.id
         WHERE users.email = ?
      `, [email]);

      if (!rows.length) {
         return res.status(400).json({
            message: "Invalid credentials"
         });
      }

      const user = rows[0];

      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
         return res.status(400).json({
            message: "Invalid credentials"
         });
      }

      if (!user.is_approved) {
         return res.status(403).json({
            message: "Account pending admin approval"
         });
      }

      // if (user.status === "pending") {
      //    return res.status(403).json({
      //       message: "Account pending admin approval"
      //    });
      // }

      if (user.status === "disabled") {
         return res.status(403).json({
            message: "Account temporarily disabled. Contact admin."
         });
      }

      const token = jwt.sign(
         { id: user.id, role: user.role_name },
         process.env.JWT_SECRET,
         { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
      );

      res.json({
         token,
         user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role_name
         }
      });

   } catch (error) {

      console.error("Login Error:", error.message);

      res.status(500).json({
         message: "Server error"
      });

   }
};

// exports.register = async (req, res) => {
//    try {

//       const { name, email, password } = req.body;

//       if (!name || !email || !password) {
//          return res.status(400).json({
//             message: "All fields are required"
//          });
//       }

//       // 🔹 1️⃣ Get App Config
//       const [configRows] = await db.query(
//          "SELECT * FROM app_config LIMIT 1"
//       );

//       if (!configRows.length) {
//          return res.status(500).json({
//             message: "App config not initialized"
//          });
//       }

//       const { max_users, max_admin } = configRows[0];

//       // 🔹 2️⃣ Count Current Users
//       const [countRows] = await db.query(`
//          SELECT 
//             COUNT(*) AS totalUsers,
//             SUM(CASE WHEN roles.role_name = 'admin' THEN 1 ELSE 0 END) AS adminCount
//          FROM users
//          JOIN roles ON users.role_id = roles.id
//       `);

//       const totalUsers = countRows[0].totalUsers;
//       const adminCount = countRows[0].adminCount || 0;

//       if (totalUsers >= max_users) {
//          return res.status(400).json({
//             message: `Maximum ${max_users} users allowed`
//          });
//       }

//       // 🔹 3️⃣ Check Duplicate Email
//       const [existing] = await db.query(
//          "SELECT id FROM users WHERE email = ?",
//          [email]
//       );

//       if (existing.length > 0) {
//          return res.status(400).json({
//             message: "Email already exists"
//          });
//       }

//       // 🔹 4️⃣ Get Staff Role ID
//       const [roleRows] = await db.query(
//          "SELECT id FROM roles WHERE role_name = 'staff'"
//       );

//       if (!roleRows.length) {
//          return res.status(500).json({
//             message: "Default role not found"
//          });
//       }

//       const role_id = roleRows[0].id;

//       // 🔹 5️⃣ Hash Password
//       const hashedPassword = await bcrypt.hash(password, 10);

//       // 🔹 6️⃣ Insert User
//       await db.query(
//          "INSERT INTO users (name, email, password, role_id,is_approved) VALUES (?,?,?,?,0)",
//          [name, email, hashedPassword, role_id]
//       );

//       res.json({
//          message: "Registration submitted. Wait for admin approval."
//       });

//    } catch (error) {

//       console.error("Register Error:", error.message);

//       res.status(500).json({
//          message: "Server error"
//       });

//    }
// };


exports.register = async (req, res) => {
   try {

      const { name, email, password } = req.body;

      if (!name || !email || !password) {
         return res.status(400).json({
            message: "All fields are required"
         });
      }

      // 🔹 1️⃣ Get App Config
      const [configRows] = await db.query(
         "SELECT * FROM app_config LIMIT 1"
      );

      if (!configRows.length) {
         return res.status(500).json({
            message: "App config not initialized"
         });
      }

      const { max_users, max_admin } = configRows[0];

      // 🔹 2️⃣ Count Current Users
      const [countRows] = await db.query(`
         SELECT 
            COUNT(*) AS totalUsers,
            SUM(CASE WHEN roles.role_name = 'admin' THEN 1 ELSE 0 END) AS adminCount
         FROM users
         JOIN roles ON users.role_id = roles.id
      `);

      const totalUsers = countRows[0].totalUsers;
      const adminCount = countRows[0].adminCount || 0;

      if (totalUsers >= max_users) {
         return res.status(400).json({
            message: `Maximum ${max_users} users allowed`
         });
      }

      // 🔹 3️⃣ Check Duplicate Email
      const [existing] = await db.query(
         "SELECT id FROM users WHERE email = ?",
         [email]
      );

      if (existing.length > 0) {
         return res.status(400).json({
            message: "Email already exists"
         });
      }

      // 🔹 4️⃣ Get Staff Role ID
      const [roleRows] = await db.query(
         "SELECT id FROM roles WHERE role_name = 'staff'"
      );

      if (!roleRows.length) {
         return res.status(500).json({
            message: "Default role not found"
         });
      }

      const role_id = roleRows[0].id;

      // 🔹 5️⃣ Hash Password
      const hashedPassword = await bcrypt.hash(password, 10);

      // 🔹 6️⃣ Insert User (pending approval)
      await db.query(
         "INSERT INTO users (name, email, password, role_id, is_approved,status) VALUES (?,?,?,?,0,'active')",
         [name, email, hashedPassword, role_id]
      );

      // 🔔 7️⃣ Notify Admins
      const io = req.app.get("io");

      const message = `New user registration request: ${name}`;

      const [admins] = await db.query(`
         SELECT users.id
         FROM users
         JOIN roles ON users.role_id = roles.id
         WHERE roles.role_name = 'admin'
      `);

      for (const admin of admins) {

         // Insert notification
         await db.query(
            `INSERT INTO notifications (user_id, message, type)
             VALUES (?, ?, 'user_registration')`,
            [admin.id, message]
         );

         // Real-time notification
         io.to(`user_${admin.id}`).emit("newNotification", {
            message,
            type: "user_registration"
         });
      }

      res.json({
         message: "Registration submitted. Wait for admin approval."
      });

   } catch (error) {

      console.error("Register Error:", error.message);

      res.status(500).json({
         message: "Server error"
      });

   }
};

exports.forgotPassword = async (req, res) => {
   try {

      const { email } = req.body;

      if (!email) {
         return res.status(400).json({
            message: "Email is required"
         });
      }

      const [rows] = await db.query(
         "SELECT * FROM users WHERE email = ?",
         [email]
      );

      if (!rows.length) {
         return res.status(404).json({
            message: "User not found"
         });
      }

      const token = crypto.randomBytes(32).toString("hex");
      const expiry = new Date(Date.now() + 15 * 60 * 1000);

      await db.query(
         "UPDATE users SET reset_token=?, reset_token_expiry=? WHERE email=?",
         [token, expiry, email]
      );

      res.json({
         message: "Reset link generated",
         token
      });

   } catch (error) {

      console.error("Forgot Password Error:", error.message);

      res.status(500).json({
         message: "Server error"
      });

   }
};

exports.resetPassword = async (req, res) => {
   try {

      const { token } = req.params;
      const { password } = req.body;

      if (!token || !password) {
         return res.status(400).json({
            message: "Token and password are required"
         });
      }

      const [rows] = await db.query(
         "SELECT * FROM users WHERE reset_token=? AND reset_token_expiry > NOW()",
         [token]
      );

      if (!rows.length) {
         return res.status(400).json({
            message: "Invalid or expired token"
         });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      await db.query(
         "UPDATE users SET password=?, reset_token=NULL, reset_token_expiry=NULL WHERE id=?",
         [hashedPassword, rows[0].id]
      );

      res.json({
         message: "Password reset successfully"
      });

   } catch (error) {

      console.error("Reset Password Error:", error.message);

      res.status(500).json({
         message: "Server error"
      });

   }
};