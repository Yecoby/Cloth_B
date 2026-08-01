import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, UnauthorizedError } from "@/server/middleware/require-session";
import { logger } from "@/lib/logger";

const CANCELLABLE_STATUSES = ["PENDING", "DRIVER_ASSIGNED", "DRIVER_EN_ROUTE_PICKUP"];

/**
 * GET /api/orders/:id
 * Fetches full order detail — only for the owning customer.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireSession(["CUSTOMER"]);
    const { id } = await params;

    const order = await prisma.order.findFirst({
      where: { id, customerId: userId },
      include: {
        items: { include: { service: true } },
        extras: { include: { extraOption: true } },
        branch: true,
        driver: { include: { user: true } },
        pickupAddress: true,
        deliveryAddress: true,
        payment: true,
        statusHistory: { orderBy: { createdAt: "asc" } },
        review: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    return NextResponse.json({ data: order });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    logger.error({ err }, "failed to fetch order");
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

/**
 * PATCH /api/orders/:id  { action: "cancel" }
 * Customer-initiated cancellation — only allowed before pickup begins.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireSession(["CUSTOMER"]);
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    if (body.action !== "cancel") {
      return NextResponse.json({ error: "Unsupported action." }, { status: 422 });
    }

    const order = await prisma.order.findFirst({ where: { id, customerId: userId } });
    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }
    if (!CANCELLABLE_STATUSES.includes(order.status)) {
      return NextResponse.json(
        { error: "This order can no longer be cancelled — it's already being processed." },
        { status: 409 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.order.update({
        where: { id: order.id },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancelReason: body.reason || "Cancelled by customer",
        },
      });
      await tx.orderStatusEvent.create({
        data: { orderId: order.id, status: "CANCELLED", actorId: userId, note: "Cancelled by customer" },
      });
      return result;
    });

    logger.info({ orderId: order.id, userId }, "order cancelled by customer");

    return NextResponse.json({ data: updated });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    logger.error({ err }, "failed to cancel order");
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
