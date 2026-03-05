const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const { getUsers, updateUser, deleteUser,getPendingUsers,approveUser,updateUserStatus,getPendingUsersCount} = require("../controllers/userController");

router.get("/users", verifyToken, authorizeRoles("admin"), getUsers);
router.put("/users/:id", verifyToken, authorizeRoles("admin"), updateUser);
router.delete("/users/:id", verifyToken, authorizeRoles("admin"), deleteUser);
router.get("/users/pending",verifyToken,authorizeRoles("admin"),getPendingUsers);
router.put("/users/approve/:id",verifyToken,authorizeRoles("admin"),approveUser);
router.put("/users/status/:id",verifyToken,authorizeRoles("admin"),updateUserStatus);
router.get("/users/pending-count",verifyToken,authorizeRoles("admin"),getPendingUsersCount);


module.exports = router;
