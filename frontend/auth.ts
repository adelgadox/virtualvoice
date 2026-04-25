import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import type { User } from "next-auth";

interface ExtendedUser extends User {
  accessToken?: string;
}

// Server-side: use internal Docker network URL
// Client-side fetches use NEXT_PUBLIC_API_URL directly
const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const res = await fetch(`${API_URL}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: credentials.email,
            password: credentials.password,
          }),
        });

        if (!res.ok) return null;

        const data = await res.json();
        return { accessToken: data.access_token, email: credentials.email as string };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // For Google SSO: sync user with backend
      if (account?.provider === "google" && account.id_token) {
        const res = await fetch(`${API_URL}/auth/google`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // Forward the raw Google ID token — verified server-side by FastAPI
          body: JSON.stringify({ id_token: account.id_token }),
        });

        if (!res.ok) return false;

        const data = await res.json();
        (user as ExtendedUser).accessToken = data.access_token;
      }
      return true;
    },
    async jwt({ token, user }) {
      const extUser = user as ExtendedUser | undefined;
      if (extUser?.accessToken) {
        token.accessToken = extUser.accessToken;
        // Fetch role from backend on first sign-in
        const res = await fetch(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${extUser.accessToken}` },
        });
        if (res.ok) {
          const profile = await res.json();
          token.role = profile.role ?? "user";
        }
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      session.role = token.role as string | undefined;
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: { strategy: "jwt" },
});
