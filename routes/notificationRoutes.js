// const express = require("express");
// const router = express.Router();
// const db = require("../config/db");
// const { verifyToken } = require("../middleware/authMiddleware");
// const {
//    getNotifications,
//    markAsRead
// } = require("../controllers/notificationController");


// router.get("/", verifyToken, (req, res) => {
//    db.query(
//       "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC",
//       [req.user.id],
//       (err, result) => {
//          if (err) return res.status(500).json(err);
//          res.json(result);
//       }
//    );
// });
// router.get("/notifications", verifyToken, getNotifications);
// router.put("/notifications/:id/read", verifyToken, markAsRead);

// router.put("/:id/read", verifyToken, (req, res) => {
//    db.query(
//       "UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?",
//       [req.params.id, req.user.id],
//       (err) => {
//          if (err) return res.status(500).json(err);
//          res.json({ message: "Marked as read" });
//       }
//    );
// });

// router.delete("/clear-all", verifyToken, (req, res) => {
//    db.query(
//       "DELETE FROM notifications WHERE user_id = ?",
//       [req.user.id],
//       (err) => {
//          if (err) return res.status(500).json(err);
//          res.json({ message: "All notifications cleared" });
//       }
//    );
// });


// module.exports = router;



const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { verifyToken } = require("../middleware/authMiddleware");

// Get all notifications
router.get("/", verifyToken, (req, res) => {
   db.query(
      "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC",
      [req.user.id],
      (err, result) => {
         if (err) return res.status(500).json(err);
         res.json(result);
      }
   );
});

// Mark single as read
router.put("/:id/read", verifyToken, (req, res) => {
   db.query(
      "UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?",
      [req.params.id, req.user.id],
      (err) => {
         if (err) return res.status(500).json(err);
         res.json({ message: "Marked as read" });
      }
   );
});

// Clear all
router.delete("/clear-all", verifyToken, (req, res) => {
   db.query(
      "DELETE FROM notifications WHERE user_id = ?",
      [req.user.id],
      (err) => {
         if (err) return res.status(500).json(err);
         res.json({ message: "All notifications cleared" });
      }
   );
});

module.exports = router;
