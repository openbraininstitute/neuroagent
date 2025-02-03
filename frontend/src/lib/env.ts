import { z } from "zod";

const envSchema = z.object({
  BACKEND_URL: z.string().url().min(1),
  KEYCLOAK_ID: z.string().min(1),
  KEYCLOAK_SECRET: z.string().min(1),
  KEYCLOAK_ISSUER: z.string().url().min(1),
  NEXTAUTH_SECRET: z.string().min(1).optional(), // optional since it's server-side only
  NEXTAUTH_URL: z.string().url().optional(), // optional for development
});

type EnvSchema = z.infer<typeof envSchema>;

function validateEnv(): EnvSchema {
  try {
    // Determine the backend URL based on context and available env vars
    const backendUrl = typeof window === 'undefined' && process.env.SERVER_SIDE_BACKEND_URL
      ? process.env.SERVER_SIDE_BACKEND_URL
      : process.env.NEXT_PUBLIC_BACKEND_URL;

    const parsed = envSchema.parse({
      BACKEND_URL: backendUrl,
      KEYCLOAK_ID: process.env.NEXT_PUBLIC_KEYCLOAK_ID,
      KEYCLOAK_SECRET: process.env.NEXT_PUBLIC_KEYCLOAK_SECRET,
      KEYCLOAK_ISSUER: process.env.NEXT_PUBLIC_KEYCLOAK_ISSUER,
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
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
