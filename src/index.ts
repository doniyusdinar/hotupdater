import express from "express";
import { toNodeHandler } from "@hot-updater/server/node";
import { hotUpdater } from "./hotUpdater.js";

const app = express();
const port = Number(process.env.PORT) || 3000;

// Convert Hot Updater's Web Standard handler to Express handler
const hotUpdaterHandler = toNodeHandler(hotUpdater);

// ============================================
// API Key Authentication Middleware
// ============================================
// This middleware protects admin endpoints (POST, DELETE on /api/*)
// Public endpoints (GET for checking updates) remain accessible
const authMiddleware = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "Missing authorization header" });
  }

  // Extract token from "Bearer <token>" format
  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Invalid authorization header format" });
  }

  // Validate token against environment variable
  if (token !== process.env.API_KEY) {
    return res.status(403).json({ error: "Invalid API key" });
  }

  next();
};

// ============================================
// Middleware
// ============================================

// Apply authentication middleware to admin API endpoints only
// Public update check endpoints don't require authentication
app.use("/hot-updater/api", authMiddleware);

// Optional: Enable CORS if needed
// import cors from "cors";
// app.use(cors());

// Optional: Request logging for debugging
// if (process.env.NODE_ENV === "development") {
//   app.use((req, res, next) => {
//     console.log(`${req.method} ${req.path}`);
//     next();
//   });
// }

// ============================================
// Routes
// ============================================

// Mount Hot Updater handler for all /hot-updater routes
// This handles both public and admin endpoints
app.all("/hot-updater/*", (req, res) => {
  hotUpdaterHandler(req, res);
});

// Health check endpoint (useful for load balancers, monitoring, etc.)
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    name: "Hot Updater Server",
    version: "1.0.0",
    status: "running",
  });
});

// ============================================
// Error Handling
// ============================================
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
  });
});

// ============================================
// Start Server
// ============================================
const server = app.listen(port, () => {
  console.log(`🚀 Hot Updater server running on port ${port}`);
  console.log(`📍 Health check: http://localhost:${port}/health`);
  console.log(`📍 API endpoint: http://localhost:${port}/hot-updater`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || "development"}`);
});

// ============================================
// Graceful Shutdown
// ============================================
const gracefulShutdown = (signal: string) => {
  console.log(`\n${signal} received: closing HTTP server`);
  server.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
