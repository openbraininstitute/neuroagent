import { z } from "zod";

const envSchema = z.object({
  // Server
  SERVER_SIDE_BACKEND_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().min(1),
  KEYCLOAK_ID: z.string().min(1),
  KEYCLOAK_SECRET: z.string().min(1),
  KEYCLOAK_ISSUER: z.string().url(),
  // Client
  NEXT_PUBLIC_BACKEND_URL: z.string().url(),
});

export const env = {
  // Server
  SERVER_SIDE_BACKEND_URL: process.env.SERVER_SIDE_BACKEND_URL,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  KEYCLOAK_ID: process.env.KEYCLOAK_ID,
  KEYCLOAK_SECRET: process.env.KEYCLOAK_SECRET,
  KEYCLOAK_ISSUER: process.env.KEYCLOAK_ISSUER,
  // Client
  NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
};
