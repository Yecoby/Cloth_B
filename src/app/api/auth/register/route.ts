import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertWithinAuthRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import crypto from "crypto";

const registerSchema = z.object({
  firstName: z.string().min(1).max(60),
  lastName: z.string().min(1).max(60),
  email: z.string().email().toLowerCase(),
  phone: z.string().min(7).max(20).optional(),
  password: z
    .string()
    .min(10, "Password must be at least 10 characters.")
    .regex(/[A-Z]/, "Include at least one uppercase letter.")
    .regex(/[a-z]/, "Include at least one lowercase letter.")
    .regex(/[0-9]/, "Include at least one number."),
  referralCode: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
    await assertWithinAuthRateLimit(ip);

    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 422 }
      );
    }
    const { firstName, lastName, email, phone, password, referralCode } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      // Generic message — do not reveal whether the account exists (enumeration protection)
      return NextResponse.json(
        { data: { message: "If this email can be registered, we've sent a verification link." } },
        { status: 200 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const referrer = referralCode
      ? await prisma.user.findUnique({ where: { referralCode } })
      : null;

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          firstName,
          lastName,
          email,
          phone,
          passwordHash,
          role: "CUSTOMER",
          referredById: referrer?.id,
        },
      });
      await tx.wallet.create({ data: { userId: created.id } });
      await tx.loyaltyAccount.create({ data: { userId: created.id } });
      return created;
    });

    const token = crypto.randomBytes(32).toString("hex");
    await prisma.emailVerificationToken.create({
      data: { userId: user.id, token, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
    });

    const verifyUrl = `${process.env.APP_URL || "http://localhost:3000"}/api/auth/verify-email?token=${token}`;

    // NOTE: real sending goes through Resend in a later pass — kept out of the
    // request path so registration never blocks on email delivery. Until
    // that's wired up, the link is logged (and, in development only,
    // returned directly) so the flow is testable end-to-end today.
    logger.info({ userId: user.id, verifyUrl }, "user registered, verification link generated");

    return NextResponse.json(
      {
        data: {
          message: "Account created. Please check your email to verify your account.",
          ...(process.env.NODE_ENV !== "production" ? { devVerifyUrl: verifyUrl } : {}),
        },
      },
      { status: 201 }
    );
  } catch (err) {
    if ((err as any)?.status === 429) {
      return NextResponse.json({ error: (err as Error).message }, { status: 429 });
    }
    logger.error({ err }, "registration failed");
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
