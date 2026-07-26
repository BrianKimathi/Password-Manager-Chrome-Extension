const request = require("supertest");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const app = require("../app");

// Get the mocked pool so we can control its query responses
const { Pool } = require("pg");
const mockPool = new Pool();

describe("Auth endpoints", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/auth/register", () => {
    it("registers a new user successfully", async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 1 }],
      });

      const res = await request(app)
        .post("/api/auth/register")
        .send({ email: "test@example.com", password: "securepass123" })
        .expect("Content-Type", /json/)
        .expect(201);

      expect(res.body).toEqual({
        message: "User registered",
        userId: 1,
      });

      // Verify the password was hashed before storage
      const insertCall = mockPool.query.mock.calls[0];
      expect(insertCall[0]).toBe(
        "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id"
      );
      expect(insertCall[1][0]).toBe("test@example.com");
      const isHashed = await bcrypt.compare("securepass123", insertCall[1][1]);
      expect(isHashed).toBe(true);
    });

    it("rejects missing email", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ password: "securepass123" })
        .expect(400);

      expect(res.body).toHaveProperty("error", "Validation failed");
      expect(res.body.details).toContain("Email is required");
    });

    it("rejects invalid email format", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ email: "not-an-email", password: "securepass123" })
        .expect(400);

      expect(res.body).toHaveProperty("error", "Validation failed");
      expect(res.body.details).toContain("Invalid email format");
    });

    it("rejects short password", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ email: "test@example.com", password: "short" })
        .expect(400);

      expect(res.body).toHaveProperty("error", "Validation failed");
      expect(res.body.details).toContain(
        "Password must be at least 8 characters long"
      );
    });

    it("rejects duplicate email", async () => {
      // Simulate unique constraint violation (PostgreSQL code 23505)
      const pgError = new Error("duplicate key");
      pgError.code = "23505";
      mockPool.query.mockRejectedValueOnce(pgError);

      const res = await request(app)
        .post("/api/auth/register")
        .send({ email: "existing@example.com", password: "securepass123" })
        .expect(409);

      expect(res.body).toEqual({
        error: "An account with this email already exists",
      });
    });
  });

  describe("POST /api/auth/login", () => {
    const hashedPassword = bcrypt.hashSync("securepass123", 10);

    it("logs in with valid credentials and returns token + refreshToken", async () => {
      // First query: find user
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 1, password: hashedPassword }],
      });
      // Second query: insert refresh token
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "test@example.com", password: "securepass123" })
        .expect(200);

      expect(res.body).toHaveProperty("token");
      expect(res.body).toHaveProperty("refreshToken");
      const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
      expect(decoded.userId).toBe(1);
    });

    it("rejects invalid password", async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 1, password: hashedPassword }],
      });

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "test@example.com", password: "wrongpassword" })
        .expect(401);

      expect(res.body).toEqual({ error: "Invalid credentials" });
    });

    it("rejects non-existent email", async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "nobody@example.com", password: "securepass123" })
        .expect(401);

      expect(res.body).toEqual({ error: "Invalid credentials" });
    });
  });

  describe("POST /api/auth/refresh", () => {
    const validRefreshToken = "abcdef1234567890abcdef1234567890abcdef12";

    it("returns a new token pair with a valid refresh token", async () => {
      // First query: find active refresh tokens
      // bcrypt hash of our test token
      const hashedToken = bcrypt.hashSync(validRefreshToken, 10);
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { id: 99, user_id: 1, token_hash: hashedToken },
        ],
      });
      // Second query: revoke old token
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      // Third query: insert new refresh token
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post("/api/auth/refresh")
        .send({ refreshToken: validRefreshToken })
        .expect(200);

      expect(res.body).toHaveProperty("token");
      expect(res.body).toHaveProperty("refreshToken");
      expect(res.body.refreshToken).not.toBe(validRefreshToken); // rotated
    });

    it("rejects missing refresh token", async () => {
      const res = await request(app)
        .post("/api/auth/refresh")
        .send({})
        .expect(400);

      expect(res.body).toEqual({ error: "Refresh token is required" });
    });

    it("rejects invalid refresh token", async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post("/api/auth/refresh")
        .send({ refreshToken: "invalid-token" })
        .expect(401);

      expect(res.body).toEqual({ error: "Invalid or expired refresh token" });
    });
  });
});
