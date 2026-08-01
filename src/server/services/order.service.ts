import { prisma } from "@/lib/prisma";
import { orderRepository } from "@/server/repositories/order.repository";
import type { CreateOrderInput } from "@/server/validation/order.schema";
import { logger } from "@/lib/logger";

class BookingError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

const TAX_RATE = 0.12; // PH VAT — move to AppSetting for configurability in a later pass

export const orderService = {
  /**
   * Validates ownership, computes authoritative server-side pricing
   * (never trust client-submitted totals), applies coupon rules, and
   * persists the order + line items atomically.
   */
  async createOrder(customerId: string, input: CreateOrderInput) {
    // 1. Ownership checks — a customer may only book to their own saved addresses
    const [pickupAddr, deliveryAddr, branch] = await Promise.all([
      orderRepository.findAddressOwnedByUser(input.pickupAddressId, customerId),
      orderRepository.findAddressOwnedByUser(input.deliveryAddressId, customerId),
      orderRepository.findBranch(input.branchId),
    ]);

    if (!pickupAddr) throw new BookingError("Pickup address not found for this account.");
    if (!deliveryAddr) throw new BookingError("Delivery address not found for this account.");
    if (!branch || !branch.isActive) throw new BookingError("Selected branch is unavailable.");

    // 2. Resolve services & extras server-side (client sends IDs only, never prices)
    const services = await orderRepository.findServicesByIds(input.items.map((i) => i.serviceId));
    if (services.length !== new Set(input.items.map((i) => i.serviceId)).size) {
      throw new BookingError("One or more selected services are no longer available.");
    }

    const extras = input.extraOptionIds.length
      ? await orderRepository.findExtrasByIds(input.extraOptionIds)
      : [];

    // 3. Compute line items & subtotal
    const lineItems = input.items.map((item) => {
      const service = services.find((s) => s.id === item.serviceId)!;
      const unitPrice = Number(service.basePrice);
      const lineTotal = Math.round(unitPrice * item.quantity * 100) / 100;
      return { serviceId: service.id, quantity: item.quantity, unitPrice, lineTotal };
    });

    const itemsSubtotal = lineItems.reduce((sum, li) => sum + li.lineTotal, 0);
    const extrasTotal = extras.reduce((sum, e) => sum + Number(e.extraPrice), 0);
    const subtotal = Math.round((itemsSubtotal + extrasTotal) * 100) / 100;

    // 4. Delivery fee — placeholder flat distance-based fee; a follow-up phase
    //    wires this to the ServiceZone polygon + Google Distance Matrix.
    const deliveryFee = 0;

    // 5. Coupon validation & discount
    let discountAmount = 0;
    let couponId: string | undefined;
    if (input.couponCode) {
      const coupon = await orderRepository.findActiveCoupon(input.couponCode);
      if (!coupon) throw new BookingError("This promo code is invalid or has expired.");

      if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
        throw new BookingError("This promo code has reached its usage limit.");
      }
      if (coupon.perUserLimit) {
        const used = await orderRepository.countCouponUsageByUser(coupon.id, customerId);
        if (used >= coupon.perUserLimit) {
          throw new BookingError("You've already used this promo code.");
        }
      }
      if (coupon.minOrderValue && subtotal < Number(coupon.minOrderValue)) {
        throw new BookingError(`This code requires a minimum order of ₱${coupon.minOrderValue}.`);
      }

      if (coupon.type === "PERCENTAGE") {
        discountAmount = subtotal * (Number(coupon.value) / 100);
        if (coupon.maxDiscount) discountAmount = Math.min(discountAmount, Number(coupon.maxDiscount));
      } else if (coupon.type === "FIXED_AMOUNT") {
        discountAmount = Math.min(Number(coupon.value), subtotal);
      } else if (coupon.type === "FREE_DELIVERY") {
        discountAmount = 0; // deliveryFee already 0 in this placeholder
      }
      couponId = coupon.id;
    }

    const taxAmount = Math.round((subtotal - discountAmount) * TAX_RATE * 100) / 100;
    const totalAmount =
      Math.round((subtotal - discountAmount + taxAmount + deliveryFee) * 100) / 100;

    if (totalAmount <= 0) throw new BookingError("Order total must be greater than zero.");

    // 6. Persist atomically
    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          customer: { connect: { id: customerId } },
          branch: { connect: { id: input.branchId } },
          pickupAddress: { connect: { id: input.pickupAddressId } },
          deliveryAddress: { connect: { id: input.deliveryAddressId } },
          pickupDate: input.pickupDate,
          pickupTimeSlot: input.pickupTimeSlot,
          deliveryDate: input.deliveryDate,
          deliveryTimeSlot: input.deliveryTimeSlot,
          specialInstructions: input.specialInstructions,
          photoUrls: input.photoUrls,
          subtotal,
          deliveryFee,
          taxAmount,
          discountAmount,
          totalAmount,
          status: "PENDING",
          ...(couponId ? { coupon: { connect: { id: couponId } } } : {}),
          items: { create: lineItems },
          extras: {
            create: extras.map((e) => ({ extraOptionId: e.id, price: e.extraPrice })),
          },
          payment: {
            create: {
              method: input.paymentMethod,
              amount: totalAmount,
              status: input.paymentMethod === "CASH_ON_DELIVERY" ? "PENDING" : "PENDING",
            },
          },
        },
        include: { items: true, extras: true, payment: true },
      });

      await tx.orderStatusEvent.create({
        data: { orderId: created.id, status: "PENDING", actorId: customerId, note: "Order placed" },
      });

      if (couponId) {
        await tx.coupon.update({ where: { id: couponId }, data: { usageCount: { increment: 1 } } });
      }

      return created;
    });

    logger.info({ orderId: order.id, customerId, totalAmount }, "order created");

    return order;
  },
};

export { BookingError };
