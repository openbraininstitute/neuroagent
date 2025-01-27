import NextAuth, { NextAuthOptions } from "next-auth";
import { env } from "@/lib/env";

export const authOptions: NextAuthOptions = {
  providers: [
    {
      id: "keycloak",
      name: "Keycloak",
      type: "oauth",
      clientId: env.KEYCLOAK_ID,
      clientSecret: env.KEYCLOAK_SECRET,
      wellKnown: `${env.KEYCLOAK_ISSUER}/.well-known/openid-configuration`,
      authorization: {
        params: {
          scope: "openid profile email",
          response_type: "code",
          client_id: env.KEYCLOAK_ID,
        },
      },
      async authorize(credentials) {
        console.log("Authorize called", credentials);
        return null;
      },
      token: `${env.KEYCLOAK_ISSUER}/protocol/openid-connect/token`,
      idToken: true,
      checks: ["pkce", "state"],
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          username: profile.preferred_username,
        };
      },
    },
  ],
  callbacks: {
    async jwt({ token, account, user }) {
      // Initial sign in
      if (account && user) {
        console.log("Initial sign in:", { user });
        return {
          ...token,
          accessToken: account.access_token,
          accessTokenExpires: account.expires_at
            ? account.expires_at * 1000
            : null,
          refreshToken: account.refresh_token,
          user,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 10 * 60 * 60, // 10 hours
        };
      }

      // Return previous token if the access token has not expired yet
      if (Date.now() < (token.accessTokenExpires as number)) {
        console.log("Token still valid, reusing existing token");
        return token;
      }

      console.log("Token expired, attempting refresh");
      // Access token has expired, try to refresh it
      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      console.log("Session callback:", {
        username: token.sub,
        expires: token.accessTokenExpires,
      });
      return {
        ...session,
        user: {
          ...session.user,
          username: token.sub,
        },
        accessToken: token.accessToken,
        expires: token.accessTokenExpires,
      };
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 10 * 60 * 60, // 10 hours
    updateAge: 60 * 60, // 1 hour
  },
  pages: {
    signIn: "/login",
  },
  secret: env.NEXTAUTH_SECRET,
  debug: true,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

// Add server-side auth helper
import type {
  GetServerSidePropsContext,
  NextApiRequest,
  NextApiResponse,
} from "next";
import { getServerSession } from "next-auth";

export function auth(
  ...args:
    | [GetServerSidePropsContext["req"], GetServerSidePropsContext["res"]]
    | [NextApiRequest, NextApiResponse]
    | []
) {
  return getServerSession(...args, authOptions);
}

async function refreshAccessToken(token: any) {
  try {
    console.log("Refreshing access token");
    const response = await fetch(
      `${env.KEYCLOAK_ISSUER}/protocol/openid-connect/token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: env.KEYCLOAK_ID,
          client_secret: env.KEYCLOAK_SECRET,
          grant_type: "refresh_token",
          refresh_token: token.refreshToken,
        }),
      },
    );

    const refreshedTokens = await response.json();

    if (!response.ok) {
      throw refreshedTokens;
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + (refreshedTokens.expires_in ?? 0) * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
    };
  } catch (error) {
    console.error("Error refreshing token:", error);
    throw error;
  }
}
