import type { ErrorRequestHandler } from "express";
import { GatewayError } from "./errors.js";

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const requestId = res.getHeader("x-request-id");

  if (err instanceof GatewayError) {
    res.status(err.status).json({
      error: { message: err.message, type: err.type, code: err.code ?? null, request_id: requestId },
    });
    return;
  }

  // body-parser errors (malformed JSON, payload too large) carry a 4xx status
  if (typeof err?.status === "number" && err.status < 500) {
    res.status(err.status).json({
      error: { message: err.message, type: "invalid_request_error", code: null, request_id: requestId },
    });
    return;
  }

  console.error(`[${requestId}]`, err);
  res.status(500).json({
    error: { message: "Internal server error", type: "server_error", code: null, request_id: requestId },
  });
};