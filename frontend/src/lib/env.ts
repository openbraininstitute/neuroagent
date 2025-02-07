import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    SERVER_SIDE_BACKEND_URL: z.string().url().optional(),
    NEXTAUTH_SECRET: z.string().min(1),
    KEYCLOAK_ID: z.string().min(1),
    KEYCLOAK_SECRET: z.string().min(1),
    KEYCLOAK_ISSUER: z.string().url(),
  },
  client: {
    NEXT_PUBLIC_BACKEND_URL: z.string().url(),
  },
  runtimeEnv: {
    // Server vars
    SERVER_SIDE_BACKEND_URL: process.env.SERVER_SIDE_BACKEND_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    KEYCLOAK_ID: process.env.KEYCLOAK_ID,
    KEYCLOAK_SECRET: process.env.KEYCLOAK_SECRET,
    KEYCLOAK_ISSUER: process.env.KEYCLOAK_ISSUER,
    // Client vars
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
  },
  skipValidation: true,
});
