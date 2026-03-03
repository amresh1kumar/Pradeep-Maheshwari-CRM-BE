const db = require("../config/db");

exports.getNotifications = async (req, res) => {
   try {

      const userId = req.user.id;

      const [result] = await db.query(`
         SELECT *
         FROM notifications
         WHERE user_id = ?
         ORDER BY created_at DESC
      `, [userId]);

      res.json(result);

   } catch (error) {

      console.error("Get Notifications Error:", error.message);

      res.status(500).json({
         message: "Server error"
      });
   }
};

exports.markAsRead = async (req, res) => {
   try {

      const { id } = req.params;
      const userId = req.user.id;

      const [result] = await db.query(`
         UPDATE notifications
         SET is_read = 1
         WHERE id = ? AND user_id = ?
      `, [id, userId]);

      if (result.affectedRows === 0) {
         return res.status(404).json({
            message: "Notification not found"
         });
      }

      res.json({
         message: "Marked as read"
      });

   } catch (error) {

      console.error("Mark As Read Error:", error.message);

      res.status(500).json({
         message: "Server error"
      });
   }
};

exports.clearAll = async (req, res) => {
   try {

      const userId = req.user.id;

      await db.query(`
         DELETE FROM notifications
         WHERE user_id = ?
      `, [userId]);

      res.json({
         message: "All cleared"
      });

   } catch (error) {

      console.error("Clear Notifications Error:", error.message);

      res.status(500).json({
         message: "Server error"
      });
   }
};