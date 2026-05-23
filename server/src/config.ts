import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PLAID_CLIENT_ID: z.string().min(1),
  PLAID_SECRET: z.string().min(1),
  PLAID_ENV: z.enum(["sandbox", "development", "production"]).default("sandbox"),
  API_SHARED_SECRET: z.string().min(16),
  HOST: z.string().default("127.0.0.1"),
  PORT: z.coerce.number().int().positive().default(3001),
  ALLOWED_ORIGIN: z.string().optional(),
});

export type AppConfig = z.infer<typeof envSchema>;

export function loadConfig(): AppConfig {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("[RMoney Server] Invalid environment configuration");
    throw new Error(parsed.error.message);
  }
  return parsed.data;
}
