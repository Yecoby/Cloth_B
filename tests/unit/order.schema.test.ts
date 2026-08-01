import { describe, it, expect } from "vitest";
import { createOrderSchema } from "@/server/validation/order.schema";

describe("createOrderSchema", () => {
  const validBase = {
    branchId: "clx0000000000000000000000",
    pickupAddressId: "clx0000000000000000000001",
    deliveryAddressId: "clx0000000000000000000002",
    pickupDate: new Date(Date.now() + 86400000).toISOString(),
    pickupTimeSlot: "09:00-11:00",
    items: [{ serviceId: "clx0000000000000000000003", quantity: 3 }],
    paymentMethod: "CASH_ON_DELIVERY",
  };

  it("accepts a well-formed booking payload", () => {
    const result = createOrderSchema.safeParse(validBase);
    expect(result.success).toBe(true);
  });

  it("rejects a pickup date in the past", () => {
    const result = createOrderSchema.safeParse({
      ...validBase,
      pickupDate: new Date(Date.now() - 86400000).toISOString(),
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty items array", () => {
    const result = createOrderSchema.safeParse({ ...validBase, items: [] });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed time slot", () => {
    const result = createOrderSchema.safeParse({ ...validBase, pickupTimeSlot: "9am" });
    expect(result.success).toBe(false);
  });

  it("rejects an unrealistic quantity", () => {
    const result = createOrderSchema.safeParse({
      ...validBase,
      items: [{ serviceId: "clx0000000000000000000003", quantity: 10000 }],
    });
    expect(result.success).toBe(false);
  });
});
