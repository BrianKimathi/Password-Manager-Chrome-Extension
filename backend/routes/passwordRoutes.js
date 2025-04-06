const express = require("express");
const {
  savePassword,
  getPasswords,
} = require("../controllers/passwordController");
const authMiddleware = require("../middleware/authMiddleware");
const router = express.Router();

router.use(authMiddleware);
router.post("/save", savePassword);
router.get("/list", getPasswords);

module.exports = router;
