const express = require("express");
const router = express.Router();

const { verifyToken } = require("../middleware/authMiddleware");

const { getProjects } = require("../controllers/projectController");

router.get("/", verifyToken, getProjects);

module.exports = router;