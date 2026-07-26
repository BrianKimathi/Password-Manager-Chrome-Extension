// Test setup — runs before each test file
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-jwt-secret-at-least-32-characters-long!!";
process.env.ENCRYPTION_KEY =
  "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";
process.env.DB_USER = "test";
process.env.DB_HOST = "localhost";
process.env.DB_NAME = "test";
process.env.DB_PASSWORD = "test";
process.env.DB_PORT = "5432";

// Mock pg Pool globally
jest.mock("pg", () => {
  const mPool = {
    query: jest.fn(),
    on: jest.fn(),
  };
  return { Pool: jest.fn(() => mPool) };
});
