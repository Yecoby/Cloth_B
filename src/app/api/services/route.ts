import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, UnauthorizedError } from "@/server/middleware/require-session";

/**
 * GET /api/services
 * Lists active laundry services and extras for the booking form.
 */
export async function GET() {
  try {
    await requireSession();

    const [services, extras] = await Promise.all([
      prisma.service.findMany({
        where: { isActive: true },
        select: { id: true, name: true, slug: true, pricingModel: true, basePrice: true, unit: true },
        orderBy: { name: "asc" },
      }),
      prisma.extraOption.findMany({
        where: { isActive: true },
        select: { id: true, name: true, slug: true, extraPrice: true },
        orderBy: { name: "asc" },
      }),
    ]);

    return NextResponse.json({ data: { services, extras } });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
