const express = require("express");
const router = express.Router();

const { verifyToken } = require("../middleware/authMiddleware");
const { getAllSales } = require("../controllers/leadController");
const { getSalesStats } = require("../controllers/salesController");

// 🔥 Get All Sales
router.get("/sales", verifyToken, getAllSales);
router.get("/sales-stats", verifyToken, getSalesStats);


module.exports = router;
