import { Redis } from "ioredis";
import { env } from "../config/env.js";

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 2, 
  enableOfflineQueue: false // fail fast when Redis is down instead of hanging requests
});

redis.on("error", (err) => console.error("redis error:", err.message));