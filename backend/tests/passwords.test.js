const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../app");

const { Pool } = require("pg");
const mockPool = new Pool();

// Generate a valid test token
const validToken = jwt.sign({ userId: 1 }, process.env.JWT_SECRET, {
  expiresIn: "1h",
});

const authHeader = `Bearer ${validToken}`;

describe("Password endpoints", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/passwords/save", () => {
    it("saves a password successfully", async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post("/api/passwords/save")
        .set("Authorization", authHeader)
        .send({
          site_url: "https://example.com",
          username: "user@example.com",
          password: "mypassword123",
        })
        .expect(201);

      expect(res.body).toEqual({ message: "Password saved" });

      // Verify the password was encrypted before storage
      const insertCall = mockPool.query.mock.calls[0];
      expect(insertCall[0]).toBe(
        "INSERT INTO passwords (user_id, site_url, username, password) VALUES ($1, $2, $3, $4)"
      );
      expect(insertCall[1][0]).toBe(1); // userId from token
      expect(insertCall[1][1]).toBe("https://example.com");
      expect(insertCall[1][2]).toBe("user@example.com");
      // Password should be in "iv:encrypted" format
      expect(insertCall[1][3]).toMatch(/^[0-9a-f]{32}:[0-9a-f]+$/);
    });

    it("rejects missing token", async () => {
      const res = await request(app)
        .post("/api/passwords/save")
        .send({
          site_url: "https://example.com",
          username: "user@example.com",
          password: "mypassword123",
        })
        .expect(401);

      expect(res.body).toEqual({ error: "No token provided" });
    });

    it("rejects invalid token", async () => {
      const res = await request(app)
        .post("/api/passwords/save")
        .set("Authorization", "Bearer invalidtoken")
        .send({
          site_url: "https://example.com",
          username: "user@example.com",
          password: "mypassword123",
        })
        .expect(401);

      expect(res.body).toEqual({ error: "Invalid token" });
    });

    it("rejects missing site_url", async () => {
      const res = await request(app)
        .post("/api/passwords/save")
        .set("Authorization", authHeader)
        .send({
          username: "user@example.com",
          password: "mypassword123",
        })
        .expect(400);

      expect(res.body).toHaveProperty("error", "Validation failed");
      expect(res.body.details).toContain("Site URL is required");
    });

    it("rejects invalid URL", async () => {
      const res = await request(app)
        .post("/api/passwords/save")
        .set("Authorization", authHeader)
        .send({
          site_url: "not-a-url",
          username: "user@example.com",
          password: "mypassword123",
        })
        .expect(400);

      expect(res.body).toHaveProperty("error", "Validation failed");
      expect(res.body.details).toContain("Site URL must be a valid URL");
    });

    it("rejects missing username", async () => {
      const res = await request(app)
        .post("/api/passwords/save")
        .set("Authorization", authHeader)
        .send({
          site_url: "https://example.com",
          password: "mypassword123",
        })
        .expect(400);

      expect(res.body).toHaveProperty("error", "Validation failed");
      expect(res.body.details).toContain("Username is required");
    });

    it("rejects missing password", async () => {
      const res = await request(app)
        .post("/api/passwords/save")
        .set("Authorization", authHeader)
        .send({
          site_url: "https://example.com",
          username: "user@example.com",
        })
        .expect(400);

      expect(res.body).toHaveProperty("error", "Validation failed");
      expect(res.body.details).toContain("Password is required");
    });
  });

  describe("GET /api/passwords/list", () => {
    it("returns decrypted passwords", async () => {
      // The encryption key is fixed: "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789"
      // To get a predictable encrypted value, we'd need to know the IV.
      // Instead, let's mock the query and verify the response shape.
      const crypto = require("crypto");
      const key = Buffer.from(process.env.ENCRYPTION_KEY, "hex");
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
      let encrypted = cipher.update("secretpass", "utf-8", "hex");
      encrypted += cipher.final("hex");
      const encryptedPassword = iv.toString("hex") + ":" + encrypted;

      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            user_id: 1,
            site_url: "https://example.com",
            username: "user@example.com",
            password: encryptedPassword,
          },
        ],
      });

      const res = await request(app)
        .get("/api/passwords/list")
        .set("Authorization", authHeader)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].password).toBe("secretpass");
      expect(res.body[0].site_url).toBe("https://example.com");
    });

    it("requires authentication", async () => {
      const res = await request(app)
        .get("/api/passwords/list")
        .expect(401);

      expect(res.body).toEqual({ error: "No token provided" });
    });
  });
});
