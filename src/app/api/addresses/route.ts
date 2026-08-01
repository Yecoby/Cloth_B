import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, UnauthorizedError } from "@/server/middleware/require-session";
import { createAddressSchema } from "@/server/validation/address.schema";
import { logger } from "@/lib/logger";

/**
 * GET /api/addresses
 * Lists the authenticated user's saved addresses.
 */
export async function GET() {
  try {
    const { userId } = await requireSession();

    const addresses = await prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ data: addresses });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    logger.error({ err }, "failed to list addresses");
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

/**
 * POST /api/addresses
 * Creates a new saved address for the authenticated user.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireSession();

    const body = await req.json();
    const parsed = createAddressSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    // If this is marked default, clear the flag on any existing default first.
    if (parsed.data.isDefault) {
      await prisma.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
    }

    const address = await prisma.address.create({
      data: { ...parsed.data, userId },
    });

    return NextResponse.json({ data: address }, { status: 201 });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    logger.error({ err }, "failed to create address");
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
