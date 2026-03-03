
const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");

const {
   getNotifications,
   markAsRead,
   clearAll
} = require("../controllers/notificationController");

router.get("/", verifyToken, getNotifications);
router.put("/:id/read", verifyToken, markAsRead);
router.delete("/clear-all", verifyToken, clearAll);

module.exports = router;
