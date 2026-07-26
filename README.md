# Password Manager - Chrome Extension

A full-stack password management solution with a Chrome extension for autofill and credential storage, paired with a Node.js backend and PostgreSQL database.

## Features

- User authentication with JWT-based login and registration
- Save, retrieve, and autofill website credentials
- Chrome extension popup for login and password management
- Content scripts for automatic form detection and autofill prompts
- Passwords hashed with bcrypt (user credentials) and encrypted with AES-256-CBC (site credentials)
- Dynamic database table creation on startup
- Input validation, CORS, and rate limiting for production readiness

## Tech Stack

- Frontend: Chrome Extension (HTML, CSS, JavaScript)
- Backend: Node.js, Express.js
- Database: PostgreSQL
- Security: bcrypt, JWT, AES-256-CBC encryption
- Tools: npm, nodemon, dotenv

## Project Structure

```
password-manager/
  backend/
    config/
      db.js             -- Database connection and initialization
    controllers/
      authController.js -- Register and login logic
      passwordController.js -- Save and retrieve encrypted passwords
    middleware/
      authMiddleware.js -- JWT verification
      validate.js       -- Input validation
    routes/
      authRoutes.js     -- Auth API routes
      passwordRoutes.js -- Password CRUD routes
    server.js           -- Express app entry point
  extension/
    popup/
      popup.html        -- Extension popup UI
      popup.js          -- Popup logic (login, register, logout)
      popup.css         -- Popup styling
      prompt.html       -- Save credential prompt
      prompt.js         -- Save prompt logic
    background.js       -- Service worker for autofill
    content.js          -- Form detection and autofill trigger
    manifest.json       -- Extension manifest (MV3)
  README.md
```

## Prerequisites

- Node.js (v16 or later)
- PostgreSQL (running locally or via a cloud service)
- Google Chrome (for extension testing)

## Setup

### Backend

1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in `backend/`:
   ```
   PORT=5000
   DB_USER=your_postgres_user
   DB_HOST=localhost
   DB_NAME=password_manager
   DB_PASSWORD=your_postgres_password
   DB_PORT=5432
   JWT_SECRET=your_random_jwt_secret_key_at_least_32_chars
   ENCRYPTION_KEY=your_64_char_hex_key_generated_below
   ```

   Generate a secure ENCRYPTION_KEY:
   ```
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

   **Important:** The ENCRYPTION_KEY must be exactly 64 hexadecimal characters (32 bytes for AES-256). Unlike JWT_SECRET, this key must never change once set, as it encrypts all stored passwords. Rotating it would make existing saved credentials unrecoverable.

4. Ensure PostgreSQL is running and the credentials in your `.env` match your database setup.

5. Start the backend:
   ```
   npm start
   ```
   The server runs on `http://localhost:5000` and initializes the database automatically.

### Chrome Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable Developer mode (toggle in the top-right corner)
3. Click "Load unpacked" and select the `extension/` folder
4. Click the extension icon in Chrome to open the popup
5. Register or log in using the backend API

## Usage

- **Register / Login:** Use the extension popup to create an account or sign in
- **Save Passwords:** When submitting a login form on any website, the extension prompts to save the credentials
- **Autofill:** On saved sites, the extension automatically fills in your username and password
- **View Passwords:** After logging in, the popup displays your saved passwords

## Security Measures

- User passwords are hashed with bcrypt (10 salt rounds) before storage
- Site credentials are encrypted with AES-256-CBC using a dedicated encryption key
- JWT tokens (1-hour expiration) secure all password API endpoints
- Rate limiting protects auth routes from brute-force attacks (10 attempts per 15 minutes)
- Input validation ensures data integrity on all API endpoints
- CORS is configured to allow only chrome extension and localhost origins

## Deployment

- Backend: Deploy to Heroku, Render, or AWS with a PostgreSQL add-on. Update API_URL in popup.js to match your deployed URL.
- Extension: Package and publish to the Chrome Web Store (requires a developer account).

## License

MIT
