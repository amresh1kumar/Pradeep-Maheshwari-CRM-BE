const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const { getSingleLead } = require("../controllers/leadController");

const {
   createLead,
   getLeads,
   updateLead,
   deleteLead
} = require("../controllers/leadController");

router.post("/leads", verifyToken, createLead);
router.get("/leads", verifyToken, getLeads);
router.put("/leads/:id", verifyToken, updateLead);
router.delete("/leads/:id", verifyToken, authorizeRoles("admin"), deleteLead);
router.get("/leads/:id", verifyToken, getSingleLead);
// router.get("/leads/stats", verifyToken, getLeadStats);

module.exports = router;
