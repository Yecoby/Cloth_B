"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { OrderTicket } from "@/components/shared/order-ticket";
import { stageIndexForStatus, statusLabel } from "@/lib/hooks/use-orders";

const CANCELLABLE = ["PENDING", "DRIVER_ASSIGNED", "DRIVER_EN_ROUTE_PICKUP"];

interface OrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: string;
  deliveryFee: string;
  taxAmount: string;
  discountAmount: string;
  totalAmount: string;
  pickupDate: string;
  pickupTimeSlot: string;
  specialInstructions?: string | null;
  branch: { name: string; addressLine: string };
  pickupAddress: { label: string; line1: string; city: string };
  deliveryAddress: { label: string; line1: string; city: string };
  items: { id: string; quantity: number; lineTotal: string; service: { name: string } }[];
  extras: { id: string; price: string; extraOption: { name: string } }[];
  payment: { method: string; status: string } | null;
  statusHistory: { id: string; status: string; note?: string | null; createdAt: string }[];
}

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["order", params.id],
    queryFn: async () => {
      const res = await fetch(`/api/orders/${params.id}`);
      if (!res.ok) throw new Error("Failed to load order");
      return res.json() as Promise<{ data: OrderDetail }>;
    },
  });

  const order = data?.data;

  async function handleCancel() {
    if (!order) return;
    setCancelling(true);
    setCancelError(null);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to cancel order.");
      queryClient.invalidateQueries({ queryKey: ["order", order.id] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setCancelling(false);
    }
  }

  if (isLoading) {
    return <div className="ticket p-8 h-64 animate-pulse max-w-2xl" />;
  }

  if (!order) {
    return (
      <div>
        <p className="text-sm text-ink-soft">Order not found.</p>
        <Link href="/dashboard/orders" className="text-sm text-water-deep hover:underline mt-2 inline-block">
          ← Back to orders
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link href="/dashboard/orders" className="text-sm text-ink-soft hover:text-ink">
        ← Back to orders
      </Link>

      <div className="mt-4 grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <OrderTicket
            orderNumber={order.orderNumber.slice(-6).toUpperCase()}
            service={`${order.items[0]?.service.name ?? "Laundry"} · ${order.branch.name}`}
            currentStage={Math.max(stageIndexForStatus(order.status), 0)}
            etaLabel={statusLabel(order.status)}
          />

          {CANCELLABLE.includes(order.status) && (
            <div className="mt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={cancelling}
                onClick={handleCancel}
                className="w-full text-alert border-alert/30 hover:border-alert"
              >
                {cancelling ? "Cancelling…" : "Cancel order"}
              </Button>
              {cancelError && <p className="text-xs text-alert mt-2">{cancelError}</p>}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-6">
          <section className="ticket p-6">
            <p className="text-xs uppercase tracking-widest text-ink-soft">Items</p>
            <div className="mt-3 space-y-2">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-ink-soft">{item.service.name} × {item.quantity}</span>
                  <span className="font-mono text-ink">₱{item.lineTotal}</span>
                </div>
              ))}
              {order.extras.map((extra) => (
                <div key={extra.id} className="flex justify-between text-sm">
                  <span className="text-ink-soft">{extra.extraOption.name}</span>
                  <span className="font-mono text-ink">₱{extra.price}</span>
                </div>
              ))}
            </div>

            <div className="ticket-perforation my-4 -mx-6" aria-hidden />

            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-soft">Subtotal</span>
                <span className="font-mono text-ink">₱{order.subtotal}</span>
              </div>
              {Number(order.discountAmount) > 0 && (
                <div className="flex justify-between">
                  <span className="text-ink-soft">Discount</span>
                  <span className="font-mono text-water-deep">−₱{order.discountAmount}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-ink-soft">Tax</span>
                <span className="font-mono text-ink">₱{order.taxAmount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">Delivery fee</span>
                <span className="font-mono text-ink">₱{order.deliveryFee}</span>
              </div>
              <div className="flex justify-between font-medium pt-1 border-t border-line mt-1">
                <span className="text-ink">Total</span>
                <span className="font-mono text-ink">₱{order.totalAmount}</span>
              </div>
            </div>
          </section>

          <section className="ticket p-6">
            <p className="text-xs uppercase tracking-widest text-ink-soft">Pickup & delivery</p>
            <div className="mt-3 grid sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-ink-soft text-xs">Pickup</p>
                <p className="text-ink mt-0.5">{order.pickupAddress.label} — {order.pickupAddress.line1}</p>
                <p className="text-ink-soft text-xs mt-1">
                  {new Date(order.pickupDate).toLocaleDateString()} · {order.pickupTimeSlot}
                </p>
              </div>
              <div>
                <p className="text-ink-soft text-xs">Delivery</p>
                <p className="text-ink mt-0.5">{order.deliveryAddress.label} — {order.deliveryAddress.line1}</p>
              </div>
            </div>
            {order.specialInstructions && (
              <p className="mt-3 text-sm text-ink-soft italic">"{order.specialInstructions}"</p>
            )}
          </section>

          {order.statusHistory.length > 0 && (
            <section className="ticket p-6">
              <p className="text-xs uppercase tracking-widest text-ink-soft">Timeline</p>
              <div className="mt-3 space-y-3">
                {order.statusHistory.map((event) => (
                  <div key={event.id} className="flex justify-between text-sm">
                    <span className="text-ink">{statusLabel(event.status)}</span>
                    <span className="text-ink-soft text-xs">
                      {new Date(event.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
