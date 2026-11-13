import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";
import { prisma } from "./db/client.js";

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Health check
// app.get("/healthz", (_req, res) => {
//   res.status(200).json({ status: "ok" });
// });

app.get("/readyz", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: "ready", db: "ok" });
  } catch {
    res.status(503).json({ status: "not_ready", db: "down" });
  }
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

  server.close(async(err) => {
    if (err) {
      console.error("Error during shutdown:", err);
      process.exit(1);
    }
    await prisma.$disconnect();
    console.log("Server closed successfully.");
    process.exit(0);
  });
  server.closeIdleConnections();
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
