const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");

const { getDashboardStats } = require("../controllers/dashboardController");
router.get("/dashboard-stats", verifyToken, getDashboardStats);
router.get("/dashboard", verifyToken, (req, res) => {
   res.json({
      message: "Welcome to Dashboard",
      user: req.user
   });
});

module.exports = router;
