import { z } from "zod";

const envSchema = z.object({
  BACKEND_URL: z.string().url().min(1),
});

type EnvSchema = z.infer<typeof envSchema>;

function validateEnv(): EnvSchema {
  try {
    const parsed = envSchema.parse({
      BACKEND_URL: process.env.BACKEND_URL,
    });

    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join("\n");

      throw new Error(`❌ Invalid environment variables:\n${errorMessages}`);
    }

    throw error;
  }
}

export const env = validateEnv();
