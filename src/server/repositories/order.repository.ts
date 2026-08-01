import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export const orderRepository = {
  findServicesByIds(ids: string[]) {
    return prisma.service.findMany({ where: { id: { in: ids }, isActive: true } });
  },

  findExtrasByIds(ids: string[]) {
    return prisma.extraOption.findMany({ where: { id: { in: ids }, isActive: true } });
  },

  findActiveCoupon(code: string) {
    return prisma.coupon.findFirst({
      where: {
        code,
        isActive: true,
        startsAt: { lte: new Date() },
        expiresAt: { gte: new Date() },
      },
    });
  },

  countCouponUsageByUser(couponId: string, userId: string) {
    return prisma.order.count({
      where: { couponId, customerId: userId, status: { not: "CANCELLED" } },
    });
  },

  async findAddressOwnedByUser(addressId: string, userId: string) {
    return prisma.address.findFirst({ where: { id: addressId, userId } });
  },

  findBranch(branchId: string) {
    return prisma.branch.findUnique({ where: { id: branchId } });
  },

  createOrder(data: Prisma.OrderCreateInput) {
    return prisma.order.create({ data, include: { items: true, extras: true, payment: true } });
  },

  async listForCustomer(
    customerId: string,
    opts: {
      page: number;
      pageSize: number;
      status?: string;
      sortBy: "createdAt" | "totalAmount" | "pickupDate";
      sortDir: "asc" | "desc";
    }
  ) {
    const where: Prisma.OrderWhereInput = {
      customerId,
      ...(opts.status ? { status: opts.status as any } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { [opts.sortBy]: opts.sortDir },
        skip: (opts.page - 1) * opts.pageSize,
        take: opts.pageSize,
        include: { items: { include: { service: true } }, branch: true, driver: { include: { user: true } } },
      }),
      prisma.order.count({ where }),
    ]);

    return { items, total };
  },

  incrementCouponUsage(couponId: string) {
    return prisma.coupon.update({ where: { id: couponId }, data: { usageCount: { increment: 1 } } });
  },

  recordStatusEvent(orderId: string, status: string, actorId?: string, note?: string) {
    return prisma.orderStatusEvent.create({
      data: { orderId, status: status as any, actorId, note },
    });
  },
};
