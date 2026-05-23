import rateLimit from "express-rate-limit";

/** Basic abuse protection for a private single-user proxy. */
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests" },
});
