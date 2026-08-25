import type { NextAuthConfig } from "next-auth"

export const authConfig: NextAuthConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isAdminRoute = nextUrl.pathname.startsWith("/admin")
      const isLoginPage = nextUrl.pathname === "/login"

      if (isAdminRoute && !isLoggedIn) {
        return Response.redirect(new URL("/login", nextUrl))
      }
      if (isLoginPage && isLoggedIn) {
        return Response.redirect(new URL("/admin", nextUrl))
      }
      return true
    },
  },
}
