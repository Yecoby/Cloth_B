"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { OrderTicket } from "@/components/shared/order-ticket";
import { useOrders, stageIndexForStatus, statusLabel } from "@/lib/hooks/use-orders";

const ACTIVE_STATUSES = [
  "PENDING",
  "DRIVER_ASSIGNED",
  "DRIVER_EN_ROUTE_PICKUP",
  "PICKUP_COMPLETED",
  "RECEIVED_AT_BRANCH",
  "WASHING",
  "DRYING",
  "IRONING",
  "QUALITY_CHECK",
  "READY_FOR_DELIVERY",
  "OUT_FOR_DELIVERY",
];

export default function DashboardOverviewPage() {
  const { data, isLoading } = useOrders({ pageSize: "10", sortBy: "createdAt", sortDir: "desc" });

  const orders = data?.data ?? [];
  const activeOrder = orders.find((o) => ACTIVE_STATUSES.includes(o.status));
  const recent = orders.filter((o) => o.id !== activeOrder?.id).slice(0, 5);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-semibold text-2xl text-ink">Overview</h1>
          <p className="text-sm text-ink-soft mt-1">Track your current wash and start a new one.</p>
        </div>
        <Link href="/dashboard/book">
          <Button>Book a pickup</Button>
        </Link>
      </div>

      <div className="mt-8 grid md:grid-cols-2 gap-8">
        <div>
          <p className="text-xs uppercase tracking-widest text-ink-soft font-medium mb-3">
            Active order
          </p>

          {isLoading && (
            <div className="ticket p-8 animate-pulse h-64" aria-label="Loading active order" />
          )}

          {!isLoading && activeOrder && (
            <OrderTicket
              orderNumber={activeOrder.orderNumber.slice(-6).toUpperCase()}
              service={`${activeOrder.items[0]?.service.name ?? "Laundry"} · ${activeOrder.branch.name}`}
              currentStage={Math.max(stageIndexForStatus(activeOrder.status), 0)}
              etaLabel={statusLabel(activeOrder.status)}
            />
          )}

          {!isLoading && !activeOrder && (
            <div className="ticket p-8 text-center">
              <p className="text-sm text-ink-soft">
                Nothing in the wash right now.
              </p>
              <Link href="/dashboard/book" className="inline-block mt-4">
                <Button size="sm">Book your first pickup</Button>
              </Link>
            </div>
          )}
        </div>

        <div>
          <p className="text-xs uppercase tracking-widest text-ink-soft font-medium mb-3">
            Recent orders
          </p>

          {!isLoading && recent.length === 0 && !activeOrder && (
            <p className="text-sm text-ink-soft">Your order history will show up here.</p>
          )}

          <div className="space-y-3">
            {recent.map((order) => (
              <Link
                key={order.id}
                href={`/dashboard/orders/${order.id}`}
                className="flex items-center justify-between border border-line rounded-lg px-4 py-3 bg-white hover:border-water transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-ink font-mono">
                    #{order.orderNumber.slice(-6).toUpperCase()}
                  </p>
                  <p className="text-xs text-ink-soft mt-0.5">{statusLabel(order.status)}</p>
                </div>
                <span className="font-mono text-sm text-ink-soft">₱{order.totalAmount}</span>
              </Link>
            ))}
          </div>

          {recent.length > 0 && (
            <Link
              href="/dashboard/orders"
              className="inline-block mt-4 text-sm font-medium text-water-deep hover:underline"
            >
              View all orders →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
