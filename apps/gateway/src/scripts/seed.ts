import { prisma } from "../db/client.js";

/**
 * Prices verified on 2026-11-13 against official pages:
 *  - Groq:      console.groq.com/docs/models
 *  - Anthropic: platform.claude.com/docs/en/about-claude/pricing
 *  - OpenAI:    developers.openai.com/api/docs/pricing  (Standard tier, <=272K context)
 *  - Google:    ai.google.dev/gemini-api/docs/pricing   (Standard tier, paid)
 *
 * Source prices are USD per 1M tokens; the schema stores per 1K, so we divide by 1000.
 * Re-run this seed whenever a provider changes prices (upsert makes it idempotent).
 */

const per1M = (usd: number) => usd / 1000;

const m = (provider: string, model: string, inputPer1M: number, outputPer1M: number) => ({
  provider,
  model,
  inputPricePer1k: per1M(inputPer1M),
  outputPricePer1k: per1M(outputPer1M),
});

const providers = [
  { name: "groq", baseUrl: "https://api.groq.com/openai/v1", priority: 1 },
  { name: "google", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", priority: 2 },
  { name: "openai", baseUrl: "https://api.openai.com/v1", priority: 3 },
  { name: "anthropic", baseUrl: "https://api.anthropic.com/v1", priority: 4 },
];

const pricing = [
  // Groq (self-serve). llama-3.3-70b-versatile and llama-3.1-8b-instant are now
  // Enterprise / "Contact Sales" only, so they are intentionally NOT seeded.
  m("groq", "openai/gpt-oss-120b", 0.15, 0.6),
  m("groq", "openai/gpt-oss-20b", 0.075, 0.3),

  // Anthropic
  m("anthropic", "claude-fable-5-2", 8, 40),
  m("anthropic", "claude-opus-5-5", 4, 20),
  m("anthropic", "claude-sonnet-5-5", 2, 10),
  // Haiku 5.5: these are the rates for prompts <= 100K tokens.
  // Prompts > 100K are $0.50 in / $2.50 out; a flat table can't express that tier.
  m("anthropic", "claude-haiku-5-5", 0.1, 0.5),

  // OpenAI (short context, <= 272K input tokens)
  m("openai", "gpt-6-astra", 10, 50),
  m("openai", "gpt-6.1-sol", 2, 10),
  m("openai", "gpt-6.1-terra", 1, 5),
  m("openai", "gpt-6-luna", 0.1, 0.5),
  m("openai", "gpt-5.4-mini", 0.75, 4.5),
  m("openai", "gpt-4o-mini", 0.15, 0.6),

  // Google Gemini (paid tier, Standard)
  // gemini-4-carbon: promo $2/$10 through 2026-11-30, then $4/$20 from 2026-12-01.
  m("google", "gemini-4-carbon", 2, 10),
  m("google", "gemini-4-hydrogen", 1.5, 7.5),
  // gemini-3.8-flash: promo $0.75/$3.75 through 2026-12-31, then $1.50/$7.50 from 2027-01-01.
  m("google", "gemini-3.8-flash", 0.75, 3.75),
  m("google", "gemini-3.5-flash-lite", 0.3, 2.5),
];

async function main() {
  for (const p of providers) {
    await prisma.provider.upsert({
      where: { name: p.name },
      update: { baseUrl: p.baseUrl, priority: p.priority },
      create: p,
    });
  }

  for (const p of pricing) {
    await prisma.modelPricing.upsert({
      where: { provider_model: { provider: p.provider, model: p.model } },
      update: p,
      create: p,
    });
  }

  console.log(`Seed complete: ${providers.length} providers, ${pricing.length} models`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());