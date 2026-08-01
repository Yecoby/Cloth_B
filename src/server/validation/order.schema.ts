import { z } from "zod";

export const createOrderItemSchema = z.object({
  serviceId: z.string().cuid(),
  quantity: z.number().positive().max(500, "Quantity looks unrealistically high."),
});

export const createOrderSchema = z.object({
  branchId: z.string().cuid(),
  pickupAddressId: z.string().cuid(),
  deliveryAddressId: z.string().cuid(),
  pickupDate: z.coerce.date().refine((d) => d.getTime() > Date.now() - 60_000, {
    message: "Pickup date must be in the future.",
  }),
  pickupTimeSlot: z.string().regex(/^\d{2}:\d{2}-\d{2}:\d{2}$/, "Use HH:MM-HH:MM format."),
  deliveryDate: z.coerce.date().optional(),
  deliveryTimeSlot: z.string().regex(/^\d{2}:\d{2}-\d{2}:\d{2}$/).optional(),
  items: z.array(createOrderItemSchema).min(1, "Add at least one laundry item or service."),
  extraOptionIds: z.array(z.string().cuid()).default([]),
  specialInstructions: z.string().max(1000).optional(),
  photoUrls: z.array(z.string().url()).max(10).default([]),
  couponCode: z.string().trim().toUpperCase().optional(),
  paymentMethod: z.enum(["STRIPE_CARD", "CASH_ON_DELIVERY", "GCASH", "MAYA", "WALLET"]),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const listOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().optional(),
  sortBy: z.enum(["createdAt", "totalAmount", "pickupDate"]).default("createdAt"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
  search: z.string().max(100).optional(),
});
