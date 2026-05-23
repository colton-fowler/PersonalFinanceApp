import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";

export type ValidatedRequest<T> = Request & { validatedBody: T };

/**
 * Validates JSON bodies before Plaid calls.
 * Rejects oversize or malformed payloads early.
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: "Invalid request body" });
      return;
    }
    (req as ValidatedRequest<T>).validatedBody = result.data;
    next();
  };
}
