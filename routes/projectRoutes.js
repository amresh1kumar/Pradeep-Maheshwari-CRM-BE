// const express = require("express");
// const router = express.Router();

// const { verifyToken } = require("../middleware/authMiddleware");

// const { getProjects } = require("../controllers/projectController");

// router.get("/", verifyToken, getProjects);

// module.exports = router;

const express = require("express");
const router = express.Router();

const { verifyToken } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

const {
   getProjects,
   createProject,
   updateProject,
   deleteProject
} = require("../controllers/projectController");

// View Projects (All logged users)
router.get("/", verifyToken, getProjects);

// Admin Only
router.post("/", verifyToken, authorizeRoles("admin"), createProject);
router.put("/:id", verifyToken, authorizeRoles("admin"), updateProject);
router.delete("/:id", verifyToken, authorizeRoles("admin"), deleteProject);

module.exports = router;