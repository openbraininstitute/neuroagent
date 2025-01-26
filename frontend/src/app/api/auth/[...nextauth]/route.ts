import NextAuth from 'next-auth';
import KeycloakProvider from "next-auth/providers/keycloak";
import { env } from '@/lib/env';

export const authOptions = {
  providers: [
    KeycloakProvider({
      clientId: env.KEYCLOAK_ID,
      clientSecret: env.KEYCLOAK_SECRET,
      issuer: env.KEYCLOAK_ISSUER,
    }),
  ],
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
