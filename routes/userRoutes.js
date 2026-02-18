const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const { getUsers,updateUser,deleteUser } = require("../controllers/userController");

// 🔥 Admin only users list
// router.get(
//    "/users",
//    verifyToken,
//    authorizeRoles("admin"),
//    getUsers
// );

router.get("/users", verifyToken, authorizeRoles("admin"), getUsers);
router.put("/users/:id", verifyToken, authorizeRoles("admin"), updateUser);
router.delete("/users/:id", verifyToken, authorizeRoles("admin"), deleteUser);


module.exports = router;
