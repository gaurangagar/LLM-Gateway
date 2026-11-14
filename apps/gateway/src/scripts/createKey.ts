import { prisma } from "../db/client.js";
import { generateKey } from "../core/apiKeys.js";

const name = process.argv[2];
if (!name) {
  console.error("Usage: npm run key:create -- <name>");
  process.exit(1);
}

const { raw, hash, prefix } = generateKey();
await prisma.apiKey.create({ data: { name, keyHash: hash, keyPrefix: prefix } });

console.log("\nAPI key created. Copy it now, it will not be shown again:\n");
console.log(raw, "\n");

await prisma.$disconnect();