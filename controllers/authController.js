const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

exports.login = (req, res) => {
   const { email, password } = req.body;

   const query = `
      SELECT users.*, roles.role_name
      FROM users
      JOIN roles ON users.role_id = roles.id
      WHERE users.email = ?
   `;

   db.query(query, [email], async (err, result) => {
      if (err) return res.status(500).json({ message: "Server error" });

      if (result.length === 0) {
         return res.status(400).json({ message: "User not found" });
      }

      const user = result[0];

      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
         return res.status(400).json({ message: "Invalid credentials" });
      }

      const token = jwt.sign(
         { id: user.id, role: user.role_name },
         process.env.JWT_SECRET,
         { expiresIn: "1d" }
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
   });
};


// exports.register = (req, res) => {
//    const { name, email, password } = req.body;

//    db.query("SELECT * FROM users WHERE email = ?", [email], async (err, result) => {
//       if (err) return res.status(500).json({ message: "Server error" });

//       if (result.length > 0) {
//          return res.status(400).json({ message: "Email already exists" });
//       }

//       db.query("SELECT id FROM roles WHERE role_name = ?", ["staff"], async (err, roleResult) => {
//          if (err) return res.status(500).json({ message: "Server error" });

//          if (roleResult.length === 0) {
//             return res.status(500).json({ message: "Default role not found" });
//          }

//          const role_id = roleResult[0].id;

//          const hashedPassword = await bcrypt.hash(password, 10);

//          db.query(
//             "INSERT INTO users (name,email,password,role_id) VALUES (?,?,?,?)",
//             [name, email, hashedPassword, role_id],
//             (err) => {
//                if (err) return res.status(500).json({ message: "Server error" });

//                res.json({ message: "User registered successfully" });
//             }
//          );
//       });
//    });
// };


exports.register = (req, res) => {

   const { name, email, password } = req.body;

   // 🔹 1. Check config limits
   db.query("SELECT * FROM app_config LIMIT 1", async (err, configResult) => {

      if (err) return res.status(500).json({ message: "Server error" });

      if (!configResult.length) {
         return res.status(500).json({ message: "App config not set" });
      }

      const maxUsers = configResult[0].max_users;
      const maxAdmin = configResult[0].max_admin;

      // 🔹 2. Count current users + admins
      db.query(`
         SELECT 
            COUNT(*) AS totalUsers,
            SUM(CASE WHEN roles.role_name = 'admin' THEN 1 ELSE 0 END) AS adminCount
         FROM users
         JOIN roles ON users.role_id = roles.id
      `, async (err, countResult) => {

         if (err) return res.status(500).json({ message: "Server error" });

         const totalUsers = countResult[0].totalUsers;
         const adminCount = countResult[0].adminCount || 0;

         // 🔥 Max users limit
         if (totalUsers >= maxUsers) {
            return res.status(400).json({
               message: `Maximum ${maxUsers} users allowed`
            });
         }

         // 🔹 3. Check duplicate email
         db.query("SELECT * FROM users WHERE email = ?", [email], async (err, result) => {

            if (err) return res.status(500).json({ message: "Server error" });

            if (result.length > 0) {
               return res.status(400).json({ message: "Email already exists" });
            }

            // 🔹 4. Default role = staff
            db.query("SELECT id FROM roles WHERE role_name = ?", ["staff"], async (err, roleResult) => {

               if (err) return res.status(500).json({ message: "Server error" });

               if (roleResult.length === 0) {
                  return res.status(500).json({ message: "Default role not found" });
               }

               const role_id = roleResult[0].id;

               const hashedPassword = await bcrypt.hash(password, 10);

               // 🔹 5. Insert user
               db.query(
                  "INSERT INTO users (name,email,password,role_id) VALUES (?,?,?,?)",
                  [name, email, hashedPassword, role_id],
                  (err) => {

                     if (err) return res.status(500).json({ message: "Server error" });

                     res.json({ message: "User registered successfully" });
                  }
               );
            });
         });
      });
   });
};


exports.forgotPassword = (req, res) => {

   const { email } = req.body;

   db.query(
      "SELECT * FROM users WHERE email=?",
      [email],
      (err, result) => {

         if (err) return res.status(500).json(err);

         if (result.length === 0) {
            return res.status(404).json({ message: "User not found" });
         }

         const token = crypto.randomBytes(32).toString("hex");
         const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 min

         db.query(
            "UPDATE users SET reset_token=?, reset_token_expiry=? WHERE email=?",
            [token, expiry, email],
            (err) => {

               if (err) return res.status(500).json(err);

               res.json({
                  message: "Reset link generated",
                  token   // Temporary (later remove for email version)
               });
            }
         );
      }
   );
};

exports.resetPassword = async (req, res) => {

   const { token } = req.params;
   const { password } = req.body;

   db.query(
      "SELECT * FROM users WHERE reset_token=? AND reset_token_expiry > NOW()",
      [token],
      async (err, result) => {

         if (err) return res.status(500).json(err);

         if (result.length === 0) {
            return res.status(400).json({ message: "Invalid or expired token" });
         }

         const hashedPassword = await bcrypt.hash(password, 10);

         db.query(
            "UPDATE users SET password=?, reset_token=NULL, reset_token_expiry=NULL WHERE id=?",
            [hashedPassword, result[0].id],
            (err) => {
               if (err) return res.status(500).json(err);

               res.json({ message: "Password reset successfully" });
            }
         );
      }
   );
};

