import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { assertWithinAuthRateLimit } from "@/lib/rate-limit";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 }, // 30 days
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
    error: "/login",
    verifyRequest: "/verify-email",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
    CredentialsProvider({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required.");
        }

        // Brute-force protection, keyed by IP (falls back to email if IP unknown)
        const ip =
          (req?.headers as any)?.["x-forwarded-for"]?.split(",")[0] ?? credentials.email;
        await assertWithinAuthRateLimit(ip);

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        });

        // Constant-shape response to avoid user-enumeration timing attacks
        if (!user || !user.passwordHash) {
          await bcrypt.compare(credentials.password, "$2a$10$invalidsaltinvalidsaltinvalidsa");
          throw new Error("Invalid email or password.");
        }

        if (user.isSuspended || !user.isActive) {
          throw new Error("This account has been suspended. Contact support.");
        }

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) {
          throw new Error("Invalid email or password.");
        }

        if (!user.emailVerified) {
          throw new Error("Please verify your email before logging in.");
        }

        logger.info({ userId: user.id }, "user login success");

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          role: user.role,
          image: user.avatarUrl,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.uid = (user as any).id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.uid;
        (session.user as any).role = token.role;
      }
      return session;
    },
    async signIn({ user, account }) {
      // For social logins, auto-provision + verify email since the provider
      // already confirmed ownership of the address.
      if (account?.provider === "google" && user.email) {
        await prisma.user.updateMany({
          where: { email: user.email, emailVerified: null },
          data: { emailVerified: new Date() },
        });
      }
      return true;
    },
  },
  events: {
    async signIn({ user }) {
      await prisma.user.update({
        where: { id: (user as any).id },
        data: { lastLoginAt: new Date() },
      });
    },
  },
};
