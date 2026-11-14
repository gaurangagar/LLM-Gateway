import type { RequestHandler } from "express";
import { prisma } from "../db/client.js";
import { redis } from "../redis/client.js";
import { hashKey } from "../core/apiKeys.js";
import { GatewayError } from "./errors.js";

export interface AuthContext {
  keyId: string;
  name: string;
  rateLimitRpm: number;
  rateLimitTpm: number;
  monthlyBudgetUsd: number;
  allowedModels: string[];
}

const POSITIVE_TTL_S = 60;
const NEGATIVE_TTL_S = 30;

const unauthorized = (msg: string) =>
  new GatewayError(401, "authentication_error", msg, "invalid_api_key");

async function loadFromDb(hash: string): Promise<AuthContext | null> {
  const key = await prisma.apiKey.findUnique({ where: { keyHash: hash } });
  if (!key || key.revokedAt) return null;
  return {
    keyId: key.id,
    name: key.name,
    rateLimitRpm: key.rateLimitRpm,
    rateLimitTpm: key.rateLimitTpm,
    monthlyBudgetUsd: Number(key.monthlyBudgetUsd),
    allowedModels: key.allowedModels,
  };
}

export const authenticate: RequestHandler = async (req, _res, next) => {
  const header = req.headers.authorization;
  const raw = header?.startsWith("Bearer ") ? header.slice(7).trim() : "";

  // Cheap rejection before touching Redis or Postgres
  if (!raw.startsWith("gw_")) throw unauthorized("Missing or malformed API key");

  const hash = hashKey(raw);
  const cacheKey = `auth:${hash}`;

  let ctx: AuthContext | null | undefined;

  try {
    const cached = await redis.get(cacheKey);
    if (cached !== null) ctx = JSON.parse(cached); // the string "null" is a cached miss
  } catch {
    // Redis down: fall through to Postgres rather than failing every request
  }

  if (ctx === undefined) {
    ctx = await loadFromDb(hash);
    redis
      .set(cacheKey, JSON.stringify(ctx), "EX", ctx ? POSITIVE_TTL_S : NEGATIVE_TTL_S)
      .catch(() => {});
  }

  if (!ctx) throw unauthorized("Invalid or revoked API key");

  req.auth = ctx;
  next();
};