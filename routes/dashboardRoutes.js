const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const { getDashboardStats,getRevenueStats,getConversionStats,getReportSummary,getReportStats,getProjectStats,getUnassignedCount,getLicenseStats} = require("../controllers/dashboardController");
const { authorizeRoles } = require("../middleware/roleMiddleware");

router.get("/dashboard-stats", verifyToken, getDashboardStats);
router.get("/dashboard/revenue", verifyToken, getRevenueStats);
router.get("/dashboard/conversion", verifyToken, getConversionStats);
router.get("/dashboard", verifyToken, (req, res) => {
   res.json({
      message: "Welcome to Dashboard",
      user: req.user
   });
});

router.get("/dashboard/report-summary", verifyToken, getReportSummary);
router.get("/dashboard/report-stats", verifyToken, getReportStats);
router.get("/dashboard/project-stats", verifyToken, getProjectStats);
router.get("/dashboard/unassigned-count", verifyToken, getUnassignedCount);
router.get("/license-stats", verifyToken, authorizeRoles("admin"), getLicenseStats);

module.exports = router;
