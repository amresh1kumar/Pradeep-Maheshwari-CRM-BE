const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const { getReport } = require("../controllers/reportController");

router.get("/reports", verifyToken, getReport);

module.exports = router;
