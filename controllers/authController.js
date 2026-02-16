const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");


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


exports.register = (req, res) => {
   const { name, email, password } = req.body;

   // 1️⃣ Check existing user
   db.query("SELECT * FROM users WHERE email = ?", [email], async (err, result) => {
      if (err) return res.status(500).json({ message: "Server error" });

      if (result.length > 0) {
         return res.status(400).json({ message: "Email already exists" });
      }

      // 2️⃣ Get staff role dynamically
      db.query("SELECT id FROM roles WHERE role_name = ?", ["staff"], async (err, roleResult) => {
         if (err) return res.status(500).json({ message: "Server error" });

         if (roleResult.length === 0) {
            return res.status(500).json({ message: "Default role not found" });
         }

         const role_id = roleResult[0].id;

         // 3️⃣ Hash password
         const hashedPassword = await bcrypt.hash(password, 10);

         // 4️⃣ Insert user
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
};
