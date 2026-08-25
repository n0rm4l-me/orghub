import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import Credentials from "next-auth/providers/credentials"
import Okta from "next-auth/providers/okta"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"

/**
 * A valid bcrypt hash of a value nothing will ever match.
 *
 * Compared against when no usable account was found, purely so every failed
 * sign-in costs the same amount of time. See the comment in `authorize`.
 */
const DUMMY_HASH = "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            active: true,
            passwordHash: true,
          },
        })

        // A missing user, a deactivated one, and an SSO-only account are all run
        // through a comparison against a throwaway hash. Returning early instead
        // would make those three cases measurably faster than a wrong password,
        // which turns the login form into an account-enumeration oracle.
        const hash = user?.active && user.passwordHash ? user.passwordHash : DUMMY_HASH
        const matches = await bcrypt.compare(credentials.password as string, hash)

        if (!matches || !user || !user.active || !user.passwordHash) return null

        return { id: user.id, email: user.email, name: user.name, role: user.role }
      },
    }),
    ...(process.env.AUTH_OKTA_ID
      ? [
          Okta({
            clientId: process.env.AUTH_OKTA_ID,
            clientSecret: process.env.AUTH_OKTA_SECRET!,
            issuer: process.env.AUTH_OKTA_ISSUER!,
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        token.role = (user as any).role ?? "VIEWER"
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    },
  },
})
