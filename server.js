import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

import studentRoutes from "./routes/studentRoutes.js";
import classRoutes from "./routes/classRoutes.js";
import lastCertificatesRouter from "./routes/lastCertificates.js";
import { authenticateToken } from "./middleware/authMiddleware.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ------------------------------------------------------
// 🔧 GLOBAL MIDDLEWARE
// ------------------------------------------------------
app.use(cors());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// ------------------------------------------------------
// 📁 PUBLIC STATIC FILE ACCESS (NO TOKEN REQUIRED)
// ------------------------------------------------------
app.use("/uploads/profile-images", express.static(path.join(__dirname, "uploads/profile-images")));
app.use("/uploads/documents", express.static(path.join(__dirname, "uploads/documents")));

// ------------------------------------------------------
// 🩺 HEALTH CHECK (PUBLIC)
// ------------------------------------------------------
app.get("/", (req, res) => {
  res.send("✅ NICE International Consultancy API is running successfully.");
});

// ------------------------------------------------------
// 🔐 PROTECTED API ROUTES (AUTH REQUIRED)
// ------------------------------------------------------
app.use("/api/students", authenticateToken, studentRoutes);
app.use("/api/classes", authenticateToken, classRoutes);
app.use("/api", lastCertificatesRouter);

// ------------------------------------------------------
// ❌ REMOVE /uploads/:type/:filename route
// (static folders already cover this)
// ------------------------------------------------------

// ------------------------------------------------------
// ⚠ GLOBAL ERROR HANDLER
// ------------------------------------------------------
app.use((err, req, res, next) => {
  if (err.name === "InvalidRequestError") {
    return res.status(401).json({ error: "Invalid or missing token" });
  }
  console.error("❌ Error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// ------------------------------------------------------
// 🚀 CONNECT TO DATABASE & START SERVER
// ------------------------------------------------------
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    const PORT = process.env.PORT || 5001;
    app.listen(PORT, () =>
      console.log(`✅ Server running on port ${PORT}`)
    );
  })
  .catch((err) => console.error("MongoDB connection error:", err));
