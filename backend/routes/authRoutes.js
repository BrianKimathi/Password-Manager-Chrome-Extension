const express = require("express");
const { register, login, refresh, logout } = require("../controllers/authController");
const { validateAuth } = require("../middleware/validate");
const authMiddleware = require("../middleware/authMiddleware");
const router = express.Router();

router.post("/register", validateAuth, register);
router.post("/login", validateAuth, login);
router.post("/refresh", refresh);
router.post("/logout", authMiddleware, logout);

module.exports = router;
