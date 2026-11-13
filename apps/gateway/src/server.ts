
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Health check
app.get("/healthz", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

// Start server
const server = app.listen(env.PORT, "0.0.0.0", () => {
  console.log(`Gateway running on port ${env.PORT}`);
});

// Graceful shutdown
const shutdown = (signal: string) => {
  console.log(`${signal} received. Shutting down...`);

  const force = setTimeout(() => {
    console.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10_000);
  force.unref();

  server.close((err) => {
    if (err) {
      console.error("Error during shutdown:", err);
      process.exit(1);
    }
    console.log("Server closed successfully.");
    process.exit(0);
  });
  server.closeIdleConnections();
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
