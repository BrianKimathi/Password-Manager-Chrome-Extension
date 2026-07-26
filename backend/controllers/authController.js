const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const { AppError } = require("../middleware/errorHandler");

const ACCESS_TOKEN_EXPIRY = "1h";
const REFRESH_TOKEN_EXPIRY_DAYS = 7;
const REFRESH_TOKEN_BYTES = 40;

/**
 * Generate a cryptographically random refresh token and return
 * both the raw token (to send to the client) and its hash (to store).
 */
function generateRefreshToken() {
  const raw = crypto.randomBytes(REFRESH_TOKEN_BYTES).toString("hex");
  const hash = bcrypt.hashSync(raw, 10);
  return { raw, hash };
}

/**
 * Issue an access token + refresh token pair for a given userId.
 * Stores the refresh token hash in the database.
 */
async function issueTokenPair(userId) {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });

  const { raw, hash } = generateRefreshToken();

  const expiry = new Date();
  expiry.setDate(expiry.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  await pool.query(
    "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
    [userId, hash, expiry]
  );

  return { accessToken, refreshToken: raw };
}

exports.register = async (req, res, next) => {
  const { email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id",
      [email, hashedPassword]
    );
    res
      .status(201)
      .json({ message: "User registered", userId: result.rows[0].id });
  } catch (err) {
    if (err.code === "23505") {
      return next(
        new AppError("An account with this email already exists", 409)
      );
    }
    next(err);
  }
};

exports.login = async (req, res, next) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return next(new AppError("Invalid credentials", 401));
    }

    const tokens = await issueTokenPair(user.id);
    res.json({
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (err) {
    next(err);
  }
};

exports.refresh = async (req, res, next) => {
  const { refreshToken } = req.body;
  if (!refreshToken || typeof refreshToken !== "string") {
    return next(new AppError("Refresh token is required", 400));
  }

  try {
    // Find all non-revoked, non-expired refresh tokens for comparison
    const result = await pool.query(
      `SELECT id, user_id, token_hash FROM refresh_tokens
       WHERE revoked = FALSE AND expires_at > NOW()`
    );

    let matchedToken = null;
    for (const row of result.rows) {
      const isValid = await bcrypt.compare(refreshToken, row.token_hash);
      if (isValid) {
        matchedToken = row;
        break;
      }
    }

    if (!matchedToken) {
      return next(new AppError("Invalid or expired refresh token", 401));
    }

    // Revoke the old refresh token (rotation)
    await pool.query("UPDATE refresh_tokens SET revoked = TRUE WHERE id = $1", [
      matchedToken.id,
    ]);

    // Issue a new token pair
    const tokens = await issueTokenPair(matchedToken.user_id);
    res.json({
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (err) {
    next(err);
  }
};

exports.logout = async (req, res, next) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.json({ message: "Logged out" });
  }

  try {
    // Revoke all matching refresh tokens for this user
    const result = await pool.query(
      "SELECT id, token_hash FROM refresh_tokens WHERE user_id = $1 AND revoked = FALSE",
      [req.user.userId]
    );

    for (const row of result.rows) {
      const isValid = await bcrypt.compare(refreshToken, row.token_hash);
      if (isValid) {
        await pool.query("UPDATE refresh_tokens SET revoked = TRUE WHERE id = $1", [
          row.id,
        ]);
        break;
      }
    }

    res.json({ message: "Logged out" });
  } catch (err) {
    next(err);
  }
};
