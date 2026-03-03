const db = require("../config/db");


exports.getNotifications = async (req, res) => {
   try {

      const userId = req.user.id;

      const [rows] = await db.query(`
         SELECT id, message, type, is_read, created_at
         FROM notifications
         WHERE user_id = ? AND is_deleted = 0
         ORDER BY created_at DESC
         LIMIT 100
      `, [userId]);

      res.json(rows);

   } catch (error) {
      console.error("Get Notifications Error:", error);
      res.status(500).json({ message: "Server error" });
   }
};

exports.markAsRead = async (req, res) => {
   try {

      const { id } = req.params;
      const userId = req.user.id;

      const [result] = await db.query(`
         UPDATE notifications
         SET is_read = 1
         WHERE id = ? AND user_id = ? AND is_deleted = 0
      `, [id, userId]);

      if (!result.affectedRows) {
         return res.status(404).json({ message: "Notification not found" });
      }

      res.json({ message: "Marked as read" });

   } catch (error) {
      console.error("Mark As Read Error:", error);
      res.status(500).json({ message: "Server error" });
   }
};

exports.clearAll = async (req, res) => {
   try {

      const userId = req.user.id;

      await db.query(`
         UPDATE notifications
         SET is_deleted = 1
         WHERE user_id = ?
      `, [userId]);

      res.json({ message: "All cleared" });

   } catch (error) {
      console.error("Clear Notifications Error:", error);
      res.status(500).json({ message: "Server error" });
   }
};


exports.getUnreadCount = async (req, res) => {
   try {

      const userId = req.user.id;

      const [rows] = await db.query(`
         SELECT COUNT(*) AS unread
         FROM notifications
         WHERE user_id = ? 
         AND is_read = 0 
         AND is_deleted = 0
      `, [userId]);

      res.json({ unread: rows[0].unread });

   } catch (error) {
      console.error("Unread Count Error:", error);
      res.status(500).json({ message: "Server error" });
   }
};