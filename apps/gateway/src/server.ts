import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";
import { prisma } from "./db/client.js";
import { requestId } from "./middleware/requestId.js";
import { authenticate } from "./middleware/auth.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { redis } from "./redis/client.js";

const app = express();

// Middleware
app.use(requestId);
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Health check
// app.get("/healthz", (_req, res) => {
//   res.status(200).json({ status: "ok" });
// });

app.get("/readyz", async (_req, res) => {
  const [db, cache] = await Promise.allSettled([
    prisma.$queryRaw`SELECT 1`,
    redis.ping(),
  ]);
  const ok = db.status === "fulfilled" && cache.status === "fulfilled";
  res.status(ok ? 200 : 503).json({
    status: ok ? "ready" : "not_ready",
    db: db.status === "fulfilled" ? "ok" : "down",
    redis: cache.status === "fulfilled" ? "ok" : "down",
  });
});

app.use("/v1", authenticate);

app.get("/v1/models", async (req, res) => {
  const rows = await prisma.modelPricing.findMany({ select: { model: true, provider: true } });
  const allowed = req.auth!.allowedModels;
  const data = rows
    .filter((r) => allowed.length === 0 || allowed.includes(r.model))
    .map((r) => ({ id: r.model, object: "model", owned_by: r.provider }));
  res.json({ object: "list", data });
});

app.use(errorHandler)

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

  server.close(async (err) => {
    if (err) {
      console.error("Error during shutdown:", err);
      process.exit(1);
    }
    await prisma.$disconnect();
    console.log("Server closed successfully.");
    process.exit(0);
  });
  server.closeIdleConnections();
  redis.disconnect();
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
