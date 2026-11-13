# LLM Gateway

OpenAI-compatible gateway that routes requests across multiple LLM providers
with rate limiting, failover, semantic caching and usage analytics.

## Status
Work in progress.

## Quick start
```bash
npm install
npm run infra:up
cp apps/gateway/.env.example apps/gateway/.env
npm run dev:gateway
```