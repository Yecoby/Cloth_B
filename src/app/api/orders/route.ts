import { NextRequest, NextResponse } from "next/server";
import { requireSession, UnauthorizedError, ForbiddenError } from "@/server/middleware/require-session";
import { createOrderSchema, listOrdersQuerySchema } from "@/server/validation/order.schema";
import { orderService, BookingError } from "@/server/services/order.service";
import { orderRepository } from "@/server/repositories/order.repository";
import { assertWithinRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

function handleError(err: unknown) {
  if (err instanceof UnauthorizedError || err instanceof ForbiddenError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  if (err instanceof BookingError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  if ((err as any)?.status === 429) {
    return NextResponse.json({ error: (err as Error).message }, { status: 429 });
  }
  logger.error({ err }, "unhandled API error");
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}

/**
 * POST /api/orders
 * Creates a new laundry pickup booking for the authenticated customer.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId, role } = await requireSession(["CUSTOMER"]);
    await assertWithinRateLimit(`booking:${userId}`, 1);

    const body = await req.json();
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const order = await orderService.createOrder(userId, parsed.data);
    return NextResponse.json({ data: order }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}

/**
 * GET /api/orders?page=1&pageSize=20&status=PENDING&sortBy=createdAt&sortDir=desc
 * Lists the authenticated customer's own orders — paginated, filterable, sortable.
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await requireSession(["CUSTOMER"]);

    const url = new URL(req.url);
    const parsed = listOrdersQuerySchema.safeParse(Object.fromEntries(url.searchParams));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query params", details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const { items, total } = await orderRepository.listForCustomer(userId, parsed.data);

    return NextResponse.json({
      data: items,
      pagination: {
        page: parsed.data.page,
        pageSize: parsed.data.pageSize,
        total,
        totalPages: Math.ceil(total / parsed.data.pageSize),
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
