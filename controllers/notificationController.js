const db = require("../config/db");

exports.getNotifications = (req, res) => {

   db.query(
      "SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 10",
      [req.user.id],
      (err, result) => {
         if (err) return res.status(500).json(err);
         res.json(result);
      }
   );
};

exports.markAsRead = (req, res) => {

   db.query(
      "UPDATE notifications SET is_read=TRUE WHERE id=?",
      [req.params.id],
      (err) => {
         if (err) return res.status(500).json(err);
         res.json({ message: "Marked as read" });
      }
   );
};
