require("dotenv").config();
const fs = require("fs");
const http = require("http");
const https = require("https");
const app = require("./app");

const PORT = process.env.PORT || 5000;

// Optional HTTPS — enabled when SSL_CERT_PATH and SSL_KEY_PATH are set
const sslCertPath = process.env.SSL_CERT_PATH;
const sslKeyPath = process.env.SSL_KEY_PATH;

if (sslCertPath && sslKeyPath) {
  const credentials = {
    key: fs.readFileSync(sslKeyPath, "utf-8"),
    cert: fs.readFileSync(sslCertPath, "utf-8"),
  };
  const httpsServer = https.createServer(credentials, app);
  httpsServer.listen(PORT, () => {
    console.log(`HTTPS server running on port ${PORT}`);
  });
} else {
  http.createServer(app).listen(PORT, () => {
    console.log(`HTTP server running on port ${PORT}`);
  });
}
