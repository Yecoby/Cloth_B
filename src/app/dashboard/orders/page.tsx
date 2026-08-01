"use client";

import { useState } from "react";
import Link from "next/link";
import { useOrders, statusLabel } from "@/lib/hooks/use-orders";

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "WASHING", label: "Washing" },
  { value: "OUT_FOR_DELIVERY", label: "Out for delivery" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CANCELLED", label: "Cancelled" },
];

export default function OrdersListPage() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useOrders({
    page: String(page),
    pageSize: "10",
    sortBy: "createdAt",
    sortDir: "desc",
    ...(status ? { status } : {}),
  });

  const orders = data?.data ?? [];
  const totalPages = data?.pagination.totalPages ?? 1;

  return (
    <div>
      <h1 className="font-display font-semibold text-2xl text-ink">Orders</h1>

      <div className="mt-6 flex gap-2 flex-wrap">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => {
              setStatus(f.value);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              status === f.value
                ? "bg-ink text-paper border-ink"
                : "bg-white text-ink-soft border-line hover:border-ink"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {isLoading &&
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="ticket p-4 h-16 animate-pulse" />
          ))}

        {!isLoading && orders.length === 0 && (
          <p className="text-sm text-ink-soft">No orders match this filter.</p>
        )}

        {orders.map((order) => (
          <Link
            key={order.id}
            href={`/dashboard/orders/${order.id}`}
            className="flex items-center justify-between border border-line rounded-lg px-4 py-3 bg-white hover:border-water transition-colors"
          >
            <div>
              <p className="text-sm font-medium text-ink font-mono">
                #{order.orderNumber.slice(-6).toUpperCase()}
              </p>
              <p className="text-xs text-ink-soft mt-0.5">
                {order.items[0]?.service.name ?? "Laundry"} · {order.branch.name}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-mono text-ink">₱{order.totalAmount}</p>
              <p className="text-xs text-ink-soft mt-0.5">{statusLabel(order.status)}</p>
            </div>
          </Link>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex items-center gap-3">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="text-sm text-ink-soft disabled:opacity-30 hover:text-ink"
          >
            ← Previous
          </button>
          <span className="text-xs text-ink-soft">Page {page} of {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="text-sm text-ink-soft disabled:opacity-30 hover:text-ink"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
