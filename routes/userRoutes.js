const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const { getUsers } = require("../controllers/userController");

// 🔥 Admin only users list
router.get(
   "/users",
   verifyToken,
   authorizeRoles("admin"),
   getUsers
);

module.exports = router;
