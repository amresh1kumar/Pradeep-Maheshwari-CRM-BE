// const db = require("../config/db");

// exports.getNotifications = (req, res) => {

//    db.query(
//       "SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 10",
//       [req.user.id],
//       (err, result) => {
//          if (err) return res.status(500).json(err);
//          res.json(result);
//       }
//    );
// };

// exports.markAsRead = (req, res) => {

//    db.query(
//       "UPDATE notifications SET is_read=TRUE WHERE id=?",
//       [req.params.id],
//       (err) => {
//          if (err) return res.status(500).json(err);
//          res.json({ message: "Marked as read" });
//       }
//    );
// };


const db = require("../config/db");

exports.getNotifications = (req, res) => {

   db.query(
      `SELECT * FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [req.user.id],
      (err, result) => {
         if (err) return res.status(500).json(err);
         res.json(result);
      }
   );
};

exports.markAsRead = (req, res) => {

   const { id } = req.params;

   db.query(
      `UPDATE notifications
       SET is_read = 1
       WHERE id = ? AND user_id = ?`,
      [id, req.user.id],
      (err) => {
         if (err) return res.status(500).json(err);
         res.json({ message: "Marked as read" });
      }
   );
};

exports.clearAll = (req, res) => {

   db.query(
      `DELETE FROM notifications WHERE user_id = ?`,
      [req.user.id],
      (err) => {
         if (err) return res.status(500).json(err);
         res.json({ message: "All cleared" });
      }
   );
};
