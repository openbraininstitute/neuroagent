import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    SERVER_SIDE_BACKEND_URL: z.string().url().optional(),
    NEXTAUTH_SECRET: z.string().min(1),
    NEXTAUTH_URL: z.string().url(),
  },
  client: {
    NEXT_PUBLIC_BACKEND_URL: z.string().url(),
    NEXT_PUBLIC_KEYCLOAK_ID: z.string().min(1),
    NEXT_PUBLIC_KEYCLOAK_SECRET: z.string().min(1),
    NEXT_PUBLIC_KEYCLOAK_ISSUER: z.string().url(),
  },
  runtimeEnv: {
    // Server vars - fallback to client URL if server URL not provided
    SERVER_SIDE_BACKEND_URL:
      process.env.SERVER_SIDE_BACKEND_URL ||
      process.env.NEXT_PUBLIC_BACKEND_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    // Client vars
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
    NEXT_PUBLIC_KEYCLOAK_ID: process.env.NEXT_PUBLIC_KEYCLOAK_ID,
    NEXT_PUBLIC_KEYCLOAK_SECRET: process.env.NEXT_PUBLIC_KEYCLOAK_SECRET,
    NEXT_PUBLIC_KEYCLOAK_ISSUER: process.env.NEXT_PUBLIC_KEYCLOAK_ISSUER,
  },
});
