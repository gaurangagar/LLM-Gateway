import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";

export const requestId: RequestHandler = (req, res, next) => {
    const id = `req_${randomUUID()}`;
    res.setHeader("x-request-id", id);
    req.id = id;
    next();
}