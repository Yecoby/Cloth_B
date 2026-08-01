"use client";

import { useQuery } from "@tanstack/react-query";

export interface OrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: string;
  pickupDate: string;
  createdAt: string;
  items: { quantity: number; service: { name: string } }[];
  branch: { name: string };
}

async function fetchOrders(params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`/api/orders?${qs}`);
  if (!res.ok) throw new Error("Failed to load orders");
  return res.json() as Promise<{ data: OrderSummary[]; pagination: { total: number } }>;
}

export function useOrders(params: Record<string, string> = {}) {
  return useQuery({
    queryKey: ["orders", params],
    queryFn: () => fetchOrders(params),
  });
}

export const STAGES = [
  "Picked up",
  "Received",
  "Washing",
  "Drying",
  "Quality check",
  "Out for delivery",
] as const;

export function stageIndexForStatus(status: string): number {
  switch (status) {
    case "PICKUP_COMPLETED":
      return 0;
    case "RECEIVED_AT_BRANCH":
      return 1;
    case "WASHING":
      return 2;
    case "DRYING":
    case "IRONING":
      return 3;
    case "QUALITY_CHECK":
    case "READY_FOR_DELIVERY":
      return 4;
    case "OUT_FOR_DELIVERY":
      return 5;
    case "DELIVERED":
      return 6;
    default:
      return -1; // PENDING, DRIVER_ASSIGNED, DRIVER_EN_ROUTE_PICKUP — before pickup
  }
}

export function statusLabel(status: string): string {
  return status
    .toLowerCase()
    .split("_")
    .map((w) => (w ? w[0]?.toUpperCase() + w.slice(1) : w))
    .join(" ");
}
