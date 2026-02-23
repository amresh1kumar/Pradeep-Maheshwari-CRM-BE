const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const { getSingleLead, getLeadsPipeline,getPipelineLeads , getLeadActivities} = require("../controllers/leadController");
const {
   createLead,
   getLeads,
   updateLead,
   deleteLead,
   importLeadsFromExcel,
   exportLeads,
   convertLeadToSale
} = require("../controllers/leadController");
const multer = require("multer")
const upload = multer({ dest: "uploads/" });


router.post("/leads/import", verifyToken, upload.single("file"), importLeadsFromExcel)
router.post("/leads", verifyToken, createLead);
router.get("/leads", verifyToken, getLeads);
router.put("/leads/:id", verifyToken, updateLead);
router.delete("/leads/:id", verifyToken, authorizeRoles("admin"), deleteLead);
router.get("/leads/export", verifyToken, exportLeads);
router.post("/leads/:id/convert", verifyToken, convertLeadToSale);
router.get("/leads/:id", verifyToken, getSingleLead);
router.get("/leads/:id/activities", verifyToken, getLeadActivities);

module.exports = router;
