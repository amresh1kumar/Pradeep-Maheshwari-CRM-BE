// const express = require("express");
// const router = express.Router();
// const { verifyToken } = require("../middleware/authMiddleware");
// const { getReport } = require("../controllers/reportController");

// router.get("/reports", verifyToken, getReport);

// module.exports = router;


const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const {
   getReport,
   exportReport
} = require("../controllers/reportController");

router.get("/reports", verifyToken, getReport);
router.get("/reports/export", verifyToken, exportReport);

module.exports = router;
