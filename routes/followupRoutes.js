// const express = require("express");
// const router = express.Router();
// const { verifyToken } = require("../middleware/authMiddleware");
// const { getFollowupSummary ,getAllFollowups } = require("../controllers/followupController");

// const {
//    addFollowup,
//    getFollowupsByLead
// } = require("../controllers/followupController");

// // router.post("/followups", verifyToken, addFollowup);
// // router.get("/followups/:leadId", verifyToken, getFollowupsByLead);
// // router.get("/followups-summary", verifyToken, getFollowupSummary);
// // router.get("/followups-all", verifyToken, getAllFollowups);

// router.post("/followups", verifyToken, addFollowup);

// router.get("/followups-summary", verifyToken, getFollowupSummary);
// router.get("/followups-all", verifyToken, getAllFollowups);

// // Dynamic route ALWAYS last
// router.get("/followups/:leadId", verifyToken, getFollowupsByLead);


// // router.post("/followups", verifyToken, createFollowup);
// // router.put("/followups/:id", verifyToken, updateFollowup);
// // router.delete("/followups/:id", verifyToken, deleteFollowup);
// // router.get("/followups-all", verifyToken, getAllFollowups);



// module.exports = router;


const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");

const {
   addFollowup,
   updateFollowup,
   deleteFollowup,
   getFollowupsByLead,
   getFollowupSummary,
   getAllFollowups
} = require("../controllers/followupController");


// Create
router.post("/followups", verifyToken, addFollowup);

// Summary
router.get("/followups-summary", verifyToken, getFollowupSummary);

// All followups (admin/staff filtered)
router.get("/followups-all", verifyToken, getAllFollowups);

// Update
router.put("/followups/:id", verifyToken, updateFollowup);

// Delete
router.delete("/followups/:id", verifyToken, deleteFollowup);

// Dynamic route ALWAYS last
router.get("/followups/:leadId", verifyToken, getFollowupsByLead);

module.exports = router;

