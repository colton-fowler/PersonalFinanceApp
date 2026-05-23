import cors from "cors";
import express from "express";
import helmet from "helmet";
import { loadConfig } from "./config.js";
import { requireApiSecret } from "./middleware/auth.js";
import { apiRateLimiter } from "./middleware/rateLimit.js";
import { createPlaidRouter } from "./routes/plaid.js";
import { createPlaidClient } from "./services/plaidClient.js";

/**
 * Private Plaid proxy — memory-only handling, no database.
 * PLAID_SECRET and tokens must never appear in logs.
 */

const config = loadConfig();
const plaid = createPlaidClient(config);
const app = express();

app.use(helmet());
app.use(express.json({ limit: "32kb" }));
app.use(apiRateLimiter);

if (config.ALLOWED_ORIGIN) {
  app.use(
    cors({
      origin: config.ALLOWED_ORIGIN,
      methods: ["POST", "GET"],
    }),
  );
} else {
  app.use(cors({ origin: false }));
}

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use(
  "/plaid",
  requireApiSecret(config.API_SHARED_SECRET),
  createPlaidRouter(plaid),
);

app.use(
  (
    _err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error("[RMoney Server] Request failed");
    res.status(500).json({ error: "Internal server error" });
  },
);

app.listen(config.PORT, config.HOST, () => {
  console.info(
    `[RMoney Server] Plaid proxy listening on http://${config.HOST}:${config.PORT}`,
  );
});
