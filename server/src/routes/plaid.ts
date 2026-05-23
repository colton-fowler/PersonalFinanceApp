import { Router } from "express";
import { z } from "zod";
import type { PlaidApi } from "plaid";
import { validateBody, type ValidatedRequest } from "../middleware/validate.js";
import * as plaidClient from "../services/plaidClient.js";

const linkTokenSchema = z.object({
  clientUserId: z.string().min(1).max(128),
});

const exchangeTokenSchema = z.object({
  publicToken: z.string().min(1),
});

const transactionsSchema = z.object({
  accessToken: z.string().min(1),
});

const accountsBalancesSchema = z.object({
  accessToken: z.string().min(1),
});

/**
 * Plaid proxy routes — no database, no persistence, no response logging.
 */
export function createPlaidRouter(client: PlaidApi): Router {
  const router = Router();

  router.post(
    "/link-token",
    validateBody(linkTokenSchema),
    async (req, res, next) => {
      try {
        const body = (req as ValidatedRequest<z.infer<typeof linkTokenSchema>>)
          .validatedBody;
        const data = await plaidClient.createLinkToken(
          client,
          body.clientUserId,
        );
        res.json(data);
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/exchange-token",
    validateBody(exchangeTokenSchema),
    async (req, res, next) => {
      try {
        const body = (
          req as ValidatedRequest<z.infer<typeof exchangeTokenSchema>>
        ).validatedBody;
        const data = await plaidClient.exchangePublicToken(
          client,
          body.publicToken,
        );
        res.json(data);
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/accounts-balances",
    validateBody(accountsBalancesSchema),
    async (req, res, next) => {
      try {
        const body = (
          req as ValidatedRequest<z.infer<typeof accountsBalancesSchema>>
        ).validatedBody;
        const data = await plaidClient.fetchAccountsAndBalances(
          client,
          body.accessToken,
        );
        res.json(data);
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/transactions",
    validateBody(transactionsSchema),
    async (req, res, next) => {
      try {
        const body = (
          req as ValidatedRequest<z.infer<typeof transactionsSchema>>
        ).validatedBody;
        const data = await plaidClient.fetchRecentTransactions(
          client,
          body.accessToken,
        );
        res.json(data);
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
