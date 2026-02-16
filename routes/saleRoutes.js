const express = require("express");
const router = express.Router();

const { verifyToken } = require("../middleware/authMiddleware");
const { getAllSales } = require("../controllers/leadController");

// 🔥 Get All Sales
router.get("/sales", verifyToken, getAllSales);

module.exports = router;
