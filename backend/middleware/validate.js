/**
 * Input validation middleware.
 * Provides reusable validation chains for request bodies.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates registration / login request body.
 */
function validateAuth(req, res, next) {
  const { email, password } = req.body;
  const errors = [];

  if (!email || typeof email !== "string") {
    errors.push("Email is required");
  } else if (!EMAIL_REGEX.test(email.trim())) {
    errors.push("Invalid email format");
  }

  if (!password || typeof password !== "string") {
    errors.push("Password is required");
  } else if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: "Validation failed", details: errors });
  }

  // Trim email for downstream use
  req.body.email = email.trim();
  next();
}

/**
 * Validates save-password request body.
 */
function validateSavePassword(req, res, next) {
  const { site_url, username, password } = req.body;
  const errors = [];

  if (!site_url || typeof site_url !== "string") {
    errors.push("Site URL is required");
  } else {
    try {
      new URL(site_url);
    } catch {
      errors.push("Site URL must be a valid URL");
    }
  }

  if (!username || typeof username !== "string") {
    errors.push("Username is required");
  }

  if (!password || typeof password !== "string") {
    errors.push("Password is required");
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: "Validation failed", details: errors });
  }

  next();
}

module.exports = { validateAuth, validateSavePassword };
