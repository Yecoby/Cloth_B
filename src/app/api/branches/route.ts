import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, UnauthorizedError } from "@/server/middleware/require-session";

/**
 * GET /api/branches
 * Lists active branches — used to populate the "which branch" step of booking.
 */
export async function GET() {
  try {
    await requireSession();

    const branches = await prisma.branch.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        city: true,
        addressLine: true,
        deliveryRadiusKm: true,
        businessHours: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ data: branches });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
