import { prisma } from "../db/client.js";
import { redis } from "../redis/client.js";

const prefix = process.argv[2];
if (!prefix) {
  console.error("Usage: npm run key:revoke -- <key_prefix>");
  process.exit(1);
}

const key = await prisma.apiKey.findFirst({ where: { keyPrefix: prefix, revokedAt: null } });
if (!key) {
  console.error("No active key with that prefix");
} else {
  await prisma.apiKey.update({ where: { id: key.id }, data: { revokedAt: new Date() } });
  await redis.del(`auth:${key.keyHash}`); // revoke takes effect immediately, not after the 60s TTL
  console.log(`Revoked ${key.name} (${key.keyPrefix}...)`);
}

await prisma.$disconnect();
redis.disconnect();