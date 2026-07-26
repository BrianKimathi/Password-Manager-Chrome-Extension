const pool = require("../config/db");
const crypto = require("crypto");
const { AppError } = require("../middleware/errorHandler");

// Validate ENCRYPTION_KEY: must be exactly 64 hex characters (32 bytes)
const ENCRYPTION_KEY_HEX = process.env.ENCRYPTION_KEY;
if (!ENCRYPTION_KEY_HEX) {
  throw new Error(
    "ENCRYPTION_KEY environment variable is required. Generate one with: crypto.randomBytes(32).toString('hex')"
  );
}
if (!/^[0-9a-f]{64}$/i.test(ENCRYPTION_KEY_HEX)) {
  throw new Error(
    "ENCRYPTION_KEY must be exactly 64 hexadecimal characters (32 bytes). " +
    "Generate one with: require('crypto').randomBytes(32).toString('hex')"
  );
}
const ENCRYPTION_KEY = Buffer.from(ENCRYPTION_KEY_HEX, "hex");
const IV_LENGTH = 16;

const encrypt = (text) => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, "utf-8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
};

const decrypt = (text) => {
  const [iv, encryptedText] = text.split(":");
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    ENCRYPTION_KEY,
    Buffer.from(iv, "hex")
  );
  let decrypted = decipher.update(
    Buffer.from(encryptedText, "hex"),
    "hex",
    "utf-8"
  );
  decrypted += decipher.final("utf-8");
  return decrypted;
};

exports.savePassword = async (req, res, next) => {
  const { site_url, username, password } = req.body;
  const userId = req.user.userId;
  try {
    const encryptedPassword = encrypt(password);
    await pool.query(
      "INSERT INTO passwords (user_id, site_url, username, password) VALUES ($1, $2, $3, $4)",
      [userId, site_url, username, encryptedPassword]
    );
    res.status(201).json({ message: "Password saved" });
  } catch (err) {
    next(err);
  }
};

exports.getPasswords = async (req, res, next) => {
  const userId = req.user.userId;
  try {
    const result = await pool.query(
      "SELECT * FROM passwords WHERE user_id = $1",
      [userId]
    );
    const passwords = result.rows.map((row) => {
      const decryptedPassword = decrypt(row.password);
      return {
        ...row,
        password: decryptedPassword,
      };
    });
    res.json(passwords);
  } catch (err) {
    next(err);
  }
};
