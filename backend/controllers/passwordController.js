const pool = require("../config/db");
const crypto = require("crypto");

// Ensure ENCRYPTION_KEY is exactly 32 bytes
const ENCRYPTION_KEY = Buffer.from(process.env.JWT_SECRET, "utf-8")
  .toString("hex")
  .slice(0, 32)
  .padEnd(32, "0"); // Pad with zeros if shorter, truncate if longer
const IV_LENGTH = 16;

console.log(
  "Generated ENCRYPTION_KEY (first 8 chars for brevity):",
  ENCRYPTION_KEY.slice(0, 8) + "..."
);

const encrypt = (text) => {
  console.log("Encrypting text of length:", text?.length || "undefined");
  const iv = crypto.randomBytes(IV_LENGTH);
  console.log("Generated IV:", iv.toString("hex"));
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(ENCRYPTION_KEY, "utf-8"),
    iv
  );
  let encrypted = cipher.update(text, "utf-8", "hex");
  encrypted += cipher.final("hex");
  const result = iv.toString("hex") + ":" + encrypted;
  console.log(
    "Encrypted result (first 20 chars):",
    result.slice(0, 20) + "..."
  );
  return result;
};

const decrypt = (text) => {
  console.log("Decrypting text (first 20 chars):", text?.slice(0, 20) + "...");
  const [iv, encryptedText] = text.split(":");
  console.log("Extracted IV:", iv);
  console.log("Encrypted text length:", encryptedText?.length);
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    Buffer.from(ENCRYPTION_KEY, "utf-8"),
    Buffer.from(iv, "hex")
  );
  let decrypted = decipher.update(
    Buffer.from(encryptedText, "hex"),
    "hex",
    "utf-8"
  );
  decrypted += decipher.final("utf-8");
  console.log("Decrypted result length:", decrypted.length);
  return decrypted;
};

exports.savePassword = async (req, res) => {
  const { site_url, username, password } = req.body;
  const userId = req.user.userId;
  console.log("Saving password for userId:", userId);
  console.log("Request body:", {
    site_url,
    username,
    password: password ? "[hidden]" : "undefined",
  });
  try {
    const encryptedPassword = encrypt(password);
    console.log("Encrypted password length:", encryptedPassword.length);
    console.log("Executing query with params:", [
      userId,
      site_url,
      username,
      "[encrypted]",
    ]);
    await pool.query(
      "INSERT INTO passwords (user_id, site_url, username, password) VALUES ($1, $2, $3, $4)",
      [userId, site_url, username, encryptedPassword]
    );
    console.log("Password saved successfully for site:", site_url);
    res.status(201).json({ message: "Password saved" });
  } catch (err) {
    console.error("Save password error:", err.message, err.stack);
    res.status(500).json({ error: "Server error" });
  }
};

exports.getPasswords = async (req, res) => {
  const userId = req.user.userId;
  console.log("Fetching passwords for userId:", userId);
  try {
    console.log("Executing query with userId:", userId);
    const result = await pool.query(
      "SELECT * FROM passwords WHERE user_id = $1",
      [userId]
    );
    console.log("Query returned rows:", result.rows.length);
    const passwords = result.rows.map((row) => {
      console.log("Processing row for site:", row.site_url);
      const decryptedPassword = decrypt(row.password);
      return {
        ...row,
        password: decryptedPassword,
      };
    });
    console.log("Returning passwords count:", passwords.length);
    res.json(passwords);
  } catch (err) {
    console.error("Get passwords error:", err.message, err.stack);
    res.status(500).json({ error: "Server error" });
  }
};
