import { z } from "zod";

const envSchema = z.object({
  BACKEND_URL: z.string().url().min(1),
  KEYCLOAK_ID: z.string().min(1),
  KEYCLOAK_SECRET: z.string().min(1),
  KEYCLOAK_ISSUER: z.string().url().min(1),
});

type EnvSchema = z.infer<typeof envSchema>;

function validateEnv(): EnvSchema {
  try {
    const parsed = envSchema.parse({
      BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
      KEYCLOAK_ID: process.env.NEXT_PUBLIC_KEYCLOAK_ID,
      KEYCLOAK_SECRET: process.env.NEXT_PUBLIC_KEYCLOAK_SECRET,
      KEYCLOAK_ISSUER: process.env.NEXT_PUBLIC_KEYCLOAK_ISSUER,
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
