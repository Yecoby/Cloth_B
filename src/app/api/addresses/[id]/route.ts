import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, UnauthorizedError } from "@/server/middleware/require-session";
import { logger } from "@/lib/logger";

/**
 * DELETE /api/addresses/:id
 * Removes a saved address — only if it belongs to the requesting user and
 * isn't referenced by an existing order (to preserve order history integrity).
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireSession();
    const { id } = await params;

    const address = await prisma.address.findFirst({ where: { id, userId } });
    if (!address) {
      return NextResponse.json({ error: "Address not found." }, { status: 404 });
    }

    const referencedByOrder = await prisma.order.findFirst({
      where: { OR: [{ pickupAddressId: address.id }, { deliveryAddressId: address.id }] },
      select: { id: true },
    });
    if (referencedByOrder) {
      return NextResponse.json(
        { error: "This address is used by an existing order and can't be deleted." },
        { status: 409 }
      );
    }

    await prisma.address.delete({ where: { id: address.id } });
    return NextResponse.json({ data: { deleted: true } });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    logger.error({ err }, "failed to delete address");
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
