const express = require("express");
const router = express.Router();
const { authorizeRoles } = require("../middleware/roleMiddleware");

const { verifyToken } = require("../middleware/authMiddleware");
const { getAllSales } = require("../controllers/leadController");
const { getSalesStats,updateSale } = require("../controllers/salesController");

// 🔥 Get All Sales
router.get("/sales", verifyToken, getAllSales);
router.get("/sales-stats", verifyToken, getSalesStats);
router.put("/sales/:id", verifyToken, authorizeRoles("admin"), updateSale);


module.exports = router;
