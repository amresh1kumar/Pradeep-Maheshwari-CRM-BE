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
            roles.role_name,
            users.is_approved,
            users.status
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

      // ✅ NEW: Admin limit check
      // Pehle check karo ki user ka current role kya hai
      const [currentUser] = await db.query(
         "SELECT role_id FROM users WHERE id=?",
         [id]
      );

      if (!currentUser.length) {
         return res.status(404).json({ message: "User not found" });
      }

      // Agar role admin (1) set ho raha hai AUR user pehle se admin NAHI hai
      // tabhi count check karo
      const [adminRole] = await db.query(
         "SELECT id FROM roles WHERE role_name = 'admin'"
      );
      const adminRoleId = adminRole[0].id;

      if (role_id === adminRoleId && currentUser[0].role_id !== adminRoleId) {

         // App config se max_admin nikalo
         const [configRows] = await db.query(
            "SELECT max_admin FROM app_config LIMIT 1"
         );

         if (!configRows.length) {
            return res.status(500).json({
               message: "App config not initialized"
            });
         }

         const { max_admin } = configRows[0];

         // Current admin count nikalo
         const [countRows] = await db.query(
            `SELECT COUNT(*) AS adminCount 
             FROM users 
             JOIN roles ON users.role_id = roles.id 
             WHERE roles.role_name = 'admin'`
         );

         const adminCount = countRows[0].adminCount || 0;

         if (adminCount >= max_admin) {
            return res.status(400).json({
               message: `Maximum ${max_admin} admins allowed. Cannot add more admins.`
            });
         }
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

exports.getPendingUsers = async (req, res) => {
   try {

      const [users] = await db.query(`
         SELECT 
            id,
            name,
            email,
            created_at
         FROM users
         WHERE is_approved = 0
         ORDER BY created_at DESC
      `);

      res.json(users);

   } catch (error) {

      console.error("Pending Users Error:", error.message);

      res.status(500).json({
         message: "Server error"
      });

   }
};

exports.approveUser = async (req, res) => {
   try {

      const { id } = req.params;

      const [result] = await db.query(
         "UPDATE users SET is_approved = 1 WHERE id = ?",
         [id]
      );

      if (result.affectedRows === 0) {
         return res.status(404).json({
            message: "User not found"
         });
      }

      res.json({
         message: "User approved successfully"
      });

   } catch (error) {

      console.error("Approve User Error:", error.message);

      res.status(500).json({
         message: "Server error"
      });

   }
};

exports.updateUserStatus = async (req, res) => {
   try {

      const { id } = req.params;
      const { status } = req.body;

      if (!["active", "disabled"].includes(status)) {
         return res.status(400).json({
            message: "Invalid status"
         });
      }

      const [result] = await db.query(
         "UPDATE users SET status=? WHERE id=?",
         [status, id]
      );

      if (result.affectedRows === 0) {
         return res.status(404).json({
            message: "User not found"
         });
      }

      res.json({
         message: "User status updated"
      });

   } catch (error) {

      console.error("Update Status Error:", error.message);

      res.status(500).json({
         message: "Server error"
      });

   }
};

exports.getPendingUsersCount = async (req, res) => {
   try {

      const [rows] = await db.query(`
         SELECT COUNT(*) AS total
         FROM users
         WHERE is_approved = 0
      `);

      res.json({
         pendingUsers: rows[0].total
      });

   } catch (error) {

      res.status(500).json({
         message: "Failed to get pending users"
      });

   }
};