import { z } from "zod";

const envSchema = z.object({
  ENTITYCORE_API_BASE: z.string().min(1, "ENTITYCORE_API_BASE is required"),
  ENTITYCORE_BEARER_TOKEN: z
    .string()
    .min(1, "ENTITYCORE_BEARER_TOKEN is required"),
  LOG_FILE: z.string().default("server.log"),
});

const env = envSchema.parse({
  ENTITYCORE_API_BASE: process.env.ENTITYCORE_API_BASE,
  ENTITYCORE_BEARER_TOKEN: process.env.ENTITYCORE_BEARER_TOKEN,
  LOG_FILE: process.env.LOG_FILE,
});

export const { ENTITYCORE_API_BASE, ENTITYCORE_BEARER_TOKEN, LOG_FILE } = env;
