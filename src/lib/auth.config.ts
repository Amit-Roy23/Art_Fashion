import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = nextUrl;

      // Allow public assets and login
      if (
        pathname.startsWith("/login") ||
        pathname.startsWith("/api/auth") ||
        pathname.startsWith("/api/upload/sign") ||
        pathname.startsWith("/_next") ||
        pathname.includes("/favicon.ico") ||
        pathname.endsWith(".png") ||
        pathname.endsWith(".jpg")
      ) {
        return true;
      }

      if (!isLoggedIn) {
        return false;
      }

      const role = (auth.user as { role?: string }).role;

      // Karigar portal check: only KARIGAR role accesses /k
      if (pathname.startsWith("/k")) {
        if (role !== "KARIGAR" && role !== "OWNER") {
          return Response.redirect(new URL("/dashboard", nextUrl));
        }
      }

      // Main app check: KARIGAR cannot access staff pages
      if (
        !pathname.startsWith("/k") &&
        role === "KARIGAR"
      ) {
        return Response.redirect(new URL("/k/home", nextUrl));
      }

      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
        token.phone = (user as { phone?: string }).phone;
        token.artisanId = (user as { artisanId?: string }).artisanId;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
        (session.user as { phone?: string }).phone = token.phone as string;
        (session.user as { artisanId?: string }).artisanId = token.artisanId as string;
      }
      return session;
    },
  },
  providers: [],
};
