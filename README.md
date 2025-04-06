Password Manager
A secure, full-stack password management solution featuring a Chrome extension for autofill and password saving, paired with a Node.js backend and PostgreSQL database. Built as a portfolio project to demonstrate expertise in web development, browser extensions, and security practices.

Features
User Authentication: Register and log in securely with JWT-based authentication.
Password Management: Save, retrieve, and autofill passwords for websites.
Chrome Extension: Intuitive popup UI for login and password management, with content scripts for autofill and save prompts.
Security: Passwords are hashed (bcrypt) for users and encrypted (AES-256-CBC) for stored site credentials.
Dynamic Database: Automatically creates required tables if they don’t exist.
Production-Ready: Modular architecture, environment variable configuration, and security best practices.
Tech Stack
Frontend: Chrome Extension (HTML, CSS, JavaScript)
Backend: Node.js, Express.js
Database: PostgreSQL
Security: bcrypt, JWT, AES-256-CBC encryption
Tools: npm, nodemon, dotenv
Project Structure
text

Collapse

Wrap

Copy
password-manager/
├── backend/ # Node.js backend
│ ├── config/ # Database configuration
│ │ └── db.js
│ ├── controllers/ # API logic
│ │ ├── authController.js
│ │ └── passwordController.js
│ ├── middleware/ # Authentication middleware
│ │ └── authMiddleware.js
│ ├── routes/ # API routes
│ │ ├── authRoutes.js
│ │ └── passwordRoutes.js
│ ├── .env # Environment variables
│ └── server.js # Entry point
├── extension/ # Chrome extension
│ ├── popup/ # Popup UI
│ │ ├── popup.html
│ │ ├── popup.js
│ │ └── popup.css
│ ├── background.js # Background script for autofill
│ ├── content.js # Content script for form detection
│ └── manifest.json # Extension manifest
└── README.md # Project documentation

Prerequisites
Node.js (v16+ recommended)
PostgreSQL (installed and running locally or via a service)
Google Chrome (for extension testing)
Setup Instructions
Backend
Navigate to the backend folder:
bash

Collapse

Wrap

Copy
cd backend
Install dependencies:
bash

Collapse

Wrap

Copy
npm install
Configure environment variables:
Create a .env file in backend/ with the following:
text

Collapse

Wrap

Copy
PORT=5000
DB_USER=your_postgres_user
DB_HOST=localhost
DB_NAME=password_manager
DB_PASSWORD=your_postgres_password
DB_PORT=5432
JWT_SECRET=your_random_secret_key_32_chars_long
Start PostgreSQL:
Ensure your PostgreSQL server is running and the credentials match your .env file.
Run the backend:
bash

Collapse

Wrap

Copy
npm start
The server will run on http://localhost:5000 and initialize the database automatically.
Chrome Extension
Navigate to the extension folder:
bash

Collapse

Wrap

Copy
cd extension
Load the extension in Chrome:
Open Chrome and go to chrome://extensions/.
Enable "Developer mode" (top right).
Click "Load unpacked" and select the extension/ folder.
Test the extension:
Click the extension icon in Chrome to open the popup.
Register or log in using the backend API.
Usage
Register/Login: Use the extension popup to create an account or log in.
Save Passwords: When submitting a login form on any website, the extension prompts to save the credentials.
Autofill: On saved sites, the extension automatically fills in your username and password.
View Passwords: After logging in, the popup displays your saved passwords.
Security Measures
User Passwords: Hashed with bcrypt before storage.
Site Passwords: Encrypted with AES-256-CBC using a key derived from the JWT secret.
Authentication: JWT tokens secure all API endpoints.
Future Enhancements: Add CORS, rate limiting, and HTTPS for production deployment.
Deployment
Backend: Deploy to Heroku, Render, or AWS with a PostgreSQL add-on. Update the API_URL in popup.js to your deployed URL.
Extension: Package and publish to the Chrome Web Store (requires a developer account).
Development Notes
Error Handling: Basic error responses are implemented; expand with custom middleware for production.
Scalability: The modular structure supports adding features like password categories or OAuth.
Learning Goals: This project taught me full-stack development, browser extension APIs, and security fundamentals.
Contributing
Feel free to fork this repository and submit pull requests with improvements! Suggestions for better security, UI, or features are welcome.

License
This project is licensed under the MIT License - see the file for details (create one if you wish to include it).

Acknowledgments
Built with guidance from online resources and the xAI Grok assistant.
Inspired by real-world password managers like LastPass and 1Password.
