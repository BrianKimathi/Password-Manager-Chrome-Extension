// File: backend/server.js
const express = require("express");
const authRoutes = require("./routes/authRoutes");
const passwordRoutes = require("./routes/passwordRoutes");
require("dotenv").config();

console.log("authRoutes:", authRoutes); // Debug: Check if routes are loaded
console.log("passwordRoutes:", passwordRoutes);

const app = express();
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/passwords", passwordRoutes);

app.get("/", (req, res) => res.send("Hello from the backend!"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
