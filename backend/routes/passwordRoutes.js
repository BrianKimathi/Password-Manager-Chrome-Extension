const express = require("express");
const {
  savePassword,
  getPasswords,
} = require("../controllers/passwordController");
const authMiddleware = require("../middleware/authMiddleware");
const { validateSavePassword } = require("../middleware/validate");
const router = express.Router();

router.use(authMiddleware);
router.post("/save", validateSavePassword, savePassword);
router.get("/list", getPasswords);

module.exports = router;
