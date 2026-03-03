const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();
const { login, register,forgotPassword,resetPassword } = require("../controllers/authController");


const loginLimiter = rateLimit({
   windowMs: 15 * 60 * 1000,
   max: 10,
   message: {
      message: "Too many login attempts. Try again after 15 minutes."
   }
});

router.post("/login", loginLimiter, login);
router.post("/register", register);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);


module.exports = router;

