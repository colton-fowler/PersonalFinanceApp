import type { NextFunction, Request, Response } from "express";

/**
 * Shared secret between your mobile app and this private proxy only.
 * Compares Authorization: Bearer <API_SHARED_SECRET> — never log the header value.
 */
export function requireApiSecret(expectedSecret: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const header = req.header("authorization");
    const token =
      header?.startsWith("Bearer ") === true ? header.slice(7).trim() : null;

    if (!token || token !== expectedSecret) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    next();
  };
}
