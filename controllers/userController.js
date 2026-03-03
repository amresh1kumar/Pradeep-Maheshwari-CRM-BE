// const db = require("../config/db");

// exports.getUsers = (req, res) => {

//    const query = `
//       SELECT 
//          users.id,
//          users.name,
//          users.email,
//          roles.role_name
//       FROM users
//       JOIN roles ON users.role_id = roles.id
//       ORDER BY users.id DESC
//    `;

//    db.query(query, (err, result) => {
//       if (err) return res.status(500).json(err);
//       res.json(result);
//    });
// };

// exports.updateUser = (req, res) => {

//    const { id } = req.params;
//    const { name, email, role_id } = req.body;

//    db.query(
//       "UPDATE users SET name=?, email=?, role_id=? WHERE id=?",
//       [name, email, role_id, id],
//       (err) => {
//          if (err) return res.status(500).json(err);
//          res.json({ message: "User updated successfully" });
//       }
//    );
// };

// exports.deleteUser = (req, res) => {

//    db.query(
//       "DELETE FROM users WHERE id=?",
//       [req.params.id],
//       (err) => {
//          if (err) return res.status(500).json(err);
//          res.json({ message: "User deleted successfully" });
//       }
//    );
// };


const db = require("../config/db");


exports.getUsers = async (req, res) => {
   try {

      if (req.user.role !== "admin") {
         return res.status(403).json({ message: "Unauthorized" });
      }

      const query = `
         SELECT 
            users.id,
            users.name,
            users.email,
            roles.role_name
         FROM users
         JOIN roles ON users.role_id = roles.id
         ORDER BY users.id DESC
      `;

      const [rows] = await db.query(query);

      res.json(rows);

   } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
   }
};



exports.updateUser = async (req, res) => {
   try {

      if (req.user.role !== "admin") {
         return res.status(403).json({ message: "Unauthorized" });
      }

      const { id } = req.params;
      const { name, email, role_id } = req.body;

      if (!name || !email || !role_id) {
         return res.status(400).json({ message: "All fields required" });
      }

      // 🔒 Prevent self role downgrade
      if (req.user.id == id && role_id !== 1) {
         return res.status(400).json({
            message: "You cannot change your own admin role"
         });
      }

      // 🔍 Check duplicate email
      const [duplicate] = await db.query(
         "SELECT id FROM users WHERE email=? AND id!=?",
         [email, id]
      );

      if (duplicate.length) {
         return res.status(400).json({
            message: "Email already in use"
         });
      }

      await db.query(
         "UPDATE users SET name=?, email=?, role_id=? WHERE id=?",
         [name, email, role_id, id]
      );

      res.json({ message: "User updated successfully" });

   } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
   }
};


exports.deleteUser = async (req, res) => {
   try {

      if (req.user.role !== "admin") {
         return res.status(403).json({ message: "Unauthorized" });
      }

      const userId = req.params.id;

      // 🔒 Prevent self delete
      if (req.user.id == userId) {
         return res.status(400).json({
            message: "You cannot delete yourself"
         });
      }

      const [existing] = await db.query(
         "SELECT id FROM users WHERE id=?",
         [userId]
      );

      if (!existing.length) {
         return res.status(404).json({
            message: "User not found"
         });
      }

      await db.query(
         "DELETE FROM users WHERE id=?",
         [userId]
      );

      res.json({ message: "User deleted successfully" });

   } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
   }
};