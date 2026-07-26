/**
 * Custom application error with HTTP status code.
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global error-handling middleware.
 * Catches all errors thrown or passed via next(err) in controllers.
 */
function errorHandler(err, req, res, _next) {
  // Log the error for debugging (without exposing internals to the client)
  if (!err.isOperational) {
    console.error("Unexpected error:", err.message, err.stack);
  }

  // Determine status code
  const statusCode = err.statusCode || 500;

  // Build response payload
  const body = {
    error: statusCode === 500 ? "Internal server error" : err.message,
  };

  // Attach validation details if present
  if (err.details) {
    body.details = err.details;
  }

  res.status(statusCode).json(body);
}

module.exports = { AppError, errorHandler };
