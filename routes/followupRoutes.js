const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const { getFollowupSummary ,getAllFollowups } = require("../controllers/followupController");

const {
   addFollowup,
   getFollowupsByLead
} = require("../controllers/followupController");

router.post("/followups", verifyToken, addFollowup);
router.get("/followups/:leadId", verifyToken, getFollowupsByLead);
router.get("/followups-summary", verifyToken, getFollowupSummary);
router.get("/followups-all", verifyToken, getAllFollowups);


module.exports = router;
