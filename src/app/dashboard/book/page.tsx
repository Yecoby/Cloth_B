"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useBranches, useServiceCatalog, useAddresses } from "@/lib/hooks/use-booking-data";

const TIME_SLOTS = ["08:00-10:00", "10:00-12:00", "13:00-15:00", "15:00-17:00", "17:00-19:00"];
const PAYMENT_METHODS = [
  { value: "CASH_ON_DELIVERY", label: "Cash on delivery" },
  { value: "STRIPE_CARD", label: "Card (Stripe)" },
  { value: "GCASH", label: "GCash" },
  { value: "MAYA", label: "Maya" },
];

function todayPlus(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function BookPickupPage() {
  const router = useRouter();
  const { data: branchData, isLoading: branchesLoading } = useBranches();
  const { data: catalogData, isLoading: catalogLoading } = useServiceCatalog();
  const { data: addressData, isLoading: addressesLoading } = useAddresses();

  const branches = branchData?.data ?? [];
  const services = catalogData?.data.services ?? [];
  const extras = catalogData?.data.extras ?? [];
  const addresses = addressData?.data ?? [];

  const [branchId, setBranchId] = useState("");
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [extraIds, setExtraIds] = useState<Set<string>>(new Set());
  const [pickupAddressId, setPickupAddressId] = useState("");
  const [deliveryAddressId, setDeliveryAddressId] = useState("");
  const [pickupDate, setPickupDate] = useState(todayPlus(1));
  const [pickupTimeSlot, setPickupTimeSlot] = useState<string>(TIME_SLOTS[0] ?? "08:00-10:00");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH_ON_DELIVERY");
  const [couponCode, setCouponCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedItems = useMemo(
    () =>
      Object.entries(quantities)
        .filter(([, qty]) => Number(qty) > 0)
        .map(([serviceId, qty]) => ({ serviceId, quantity: Number(qty) })),
    [quantities]
  );

  const estimatedTotal = useMemo(() => {
    let total = 0;
    for (const item of selectedItems) {
      const service = services.find((s) => s.id === item.serviceId);
      if (service) total += Number(service.basePrice) * item.quantity;
    }
    for (const extraId of extraIds) {
      const extra = extras.find((e) => e.id === extraId);
      if (extra) total += Number(extra.extraPrice);
    }
    return total;
  }, [selectedItems, extraIds, services, extras]);

  function toggleExtra(id: string) {
    setExtraIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!branchId) return setError("Please select a branch.");
    if (selectedItems.length === 0) return setError("Add at least one item or service.");
    if (!pickupAddressId) return setError("Please select a pickup address.");
    if (!deliveryAddressId) return setError("Please select a delivery address.");

    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId,
          pickupAddressId,
          deliveryAddressId,
          pickupDate,
          pickupTimeSlot,
          items: selectedItems,
          extraOptionIds: Array.from(extraIds),
          specialInstructions: specialInstructions || undefined,
          couponCode: couponCode || undefined,
          paymentMethod,
        }),
      });

      const body = await res.json();
      if (!res.ok) {
        const detail = body?.details?.fieldErrors
          ? (Object.values(body.details.fieldErrors).flat()[0] as string)
          : body.error;
        throw new Error(detail || "Failed to place your order.");
      }

      router.push(`/dashboard/orders/${body.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  const loading = branchesLoading || catalogLoading || addressesLoading;

  if (!loading && addresses.length === 0) {
    return (
      <div>
        <h1 className="font-display font-semibold text-2xl text-ink">Book a pickup</h1>
        <div className="ticket p-8 mt-6 max-w-md text-center">
          <p className="text-sm text-ink-soft">
            You'll need a saved address before you can book a pickup.
          </p>
          <Link href="/dashboard/addresses" className="inline-block mt-4">
            <Button size="sm">Add an address</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display font-semibold text-2xl text-ink">Book a pickup</h1>
      <p className="text-sm text-ink-soft mt-1">Tell us what's in the bag and when to grab it.</p>

      {loading ? (
        <div className="mt-8 ticket p-8 h-64 animate-pulse" />
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 grid lg:grid-cols-3 gap-8" noValidate>
          <div className="lg:col-span-2 space-y-8">
            {/* Branch */}
            <section>
              <h2 className="text-sm font-semibold text-ink uppercase tracking-wide">Branch</h2>
              <div className="mt-3 grid sm:grid-cols-2 gap-3">
                {branches.map((b) => (
                  <button
                    type="button"
                    key={b.id}
                    onClick={() => setBranchId(b.id)}
                    className={`text-left p-4 rounded-lg border transition-colors ${
                      branchId === b.id ? "border-water bg-water/5" : "border-line bg-white hover:border-ink-soft"
                    }`}
                  >
                    <p className="text-sm font-medium text-ink">{b.name}</p>
                    <p className="text-xs text-ink-soft mt-0.5">{b.addressLine}</p>
                  </button>
                ))}
              </div>
            </section>

            {/* Services */}
            <section>
              <h2 className="text-sm font-semibold text-ink uppercase tracking-wide">Services</h2>
              <div className="mt-3 space-y-2">
                {services.map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border border-line bg-white">
                    <div>
                      <p className="text-sm font-medium text-ink">{s.name}</p>
                      <p className="text-xs text-ink-soft font-mono">₱{s.basePrice}/{s.unit ?? "unit"}</p>
                    </div>
                    <input
                      type="number"
                      min={0}
                      step={s.pricingModel === "PER_KG" ? 0.5 : 1}
                      placeholder="0"
                      value={quantities[s.id] ?? ""}
                      onChange={(e) => setQuantities((q) => ({ ...q, [s.id]: e.target.value }))}
                      className="w-20 rounded-lg border border-line px-3 py-1.5 text-sm text-right focus:border-water outline-none"
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* Extras */}
            {extras.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-ink uppercase tracking-wide">Extras</h2>
                <div className="mt-3 space-y-2">
                  {extras.map((extra) => (
                    <label
                      key={extra.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-line bg-white cursor-pointer"
                    >
                      <span className="flex items-center gap-3 text-sm text-ink">
                        <input
                          type="checkbox"
                          checked={extraIds.has(extra.id)}
                          onChange={() => toggleExtra(extra.id)}
                          className="rounded"
                        />
                        {extra.name}
                      </span>
                      <span className="text-xs font-mono text-ink-soft">+₱{extra.extraPrice}</span>
                    </label>
                  ))}
                </div>
              </section>
            )}

            {/* Addresses */}
            <section className="grid sm:grid-cols-2 gap-4">
              <div>
                <h2 className="text-sm font-semibold text-ink uppercase tracking-wide">Pickup address</h2>
                <select
                  value={pickupAddressId}
                  onChange={(e) => setPickupAddressId(e.target.value)}
                  className="mt-3 w-full rounded-lg border border-line px-4 py-2.5 text-sm bg-white focus:border-water outline-none"
                >
                  <option value="">Select…</option>
                  {addresses.map((a) => (
                    <option key={a.id} value={a.id}>{a.label} — {a.line1}</option>
                  ))}
                </select>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-ink uppercase tracking-wide">Delivery address</h2>
                <select
                  value={deliveryAddressId}
                  onChange={(e) => setDeliveryAddressId(e.target.value)}
                  className="mt-3 w-full rounded-lg border border-line px-4 py-2.5 text-sm bg-white focus:border-water outline-none"
                >
                  <option value="">Same as pickup / select…</option>
                  {addresses.map((a) => (
                    <option key={a.id} value={a.id}>{a.label} — {a.line1}</option>
                  ))}
                </select>
              </div>
            </section>

            {/* Schedule */}
            <section className="grid sm:grid-cols-2 gap-4">
              <div>
                <h2 className="text-sm font-semibold text-ink uppercase tracking-wide">Pickup date</h2>
                <input
                  type="date"
                  min={todayPlus(0)}
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                  className="mt-3 w-full rounded-lg border border-line px-4 py-2.5 text-sm bg-white focus:border-water outline-none"
                />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-ink uppercase tracking-wide">Time window</h2>
                <select
                  value={pickupTimeSlot}
                  onChange={(e) => setPickupTimeSlot(e.target.value)}
                  className="mt-3 w-full rounded-lg border border-line px-4 py-2.5 text-sm bg-white focus:border-water outline-none"
                >
                  {TIME_SLOTS.map((slot) => (
                    <option key={slot} value={slot}>{slot}</option>
                  ))}
                </select>
              </div>
            </section>

            {/* Instructions */}
            <section>
              <h2 className="text-sm font-semibold text-ink uppercase tracking-wide">Special instructions</h2>
              <textarea
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                rows={3}
                placeholder="Gate code, fabric notes, anything we should know…"
                className="mt-3 w-full rounded-lg border border-line px-4 py-2.5 text-sm bg-white focus:border-water outline-none resize-none"
              />
            </section>
          </div>

          {/* Summary sidebar */}
          <aside className="lg:col-span-1">
            <div className="ticket p-6 sticky top-8">
              <p className="text-xs uppercase tracking-widest text-ink-soft">Order summary</p>

              <div className="mt-4 space-y-1.5">
                {selectedItems.length === 0 && (
                  <p className="text-sm text-ink-soft">No items added yet.</p>
                )}
                {selectedItems.map((item) => {
                  const service = services.find((s) => s.id === item.serviceId);
                  if (!service) return null;
                  return (
                    <div key={item.serviceId} className="flex justify-between text-sm">
                      <span className="text-ink-soft">{service.name} × {item.quantity}</span>
                      <span className="font-mono text-ink">
                        ₱{(Number(service.basePrice) * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  );
                })}
                {Array.from(extraIds).map((id) => {
                  const extra = extras.find((e) => e.id === id);
                  if (!extra) return null;
                  return (
                    <div key={id} className="flex justify-between text-sm">
                      <span className="text-ink-soft">{extra.name}</span>
                      <span className="font-mono text-ink">₱{extra.extraPrice}</span>
                    </div>
                  );
                })}
              </div>

              <div className="ticket-perforation my-4 -mx-6" aria-hidden />

              <div>
                <label className="text-xs text-ink-soft">Promo code</label>
                <input
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="WELCOME50"
                  className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm bg-white focus:border-water outline-none"
                />
              </div>

              <div className="mt-4">
                <label className="text-xs text-ink-soft">Payment method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm bg-white focus:border-water outline-none"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-between mt-5 text-sm font-medium">
                <span className="text-ink">Estimated total</span>
                <span className="font-mono text-ink">₱{estimatedTotal.toFixed(2)}</span>
              </div>
              <p className="text-[11px] text-ink-soft mt-1">
                Final total (with tax and any discount) is confirmed after you submit.
              </p>

              {error && (
                <p role="alert" className="mt-4 text-sm text-alert bg-alert/5 border border-alert/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <Button type="submit" disabled={submitting} className="w-full mt-5" size="lg">
                {submitting ? "Booking…" : "Book pickup"}
              </Button>
            </div>
          </aside>
        </form>
      )}
    </div>
  );
}
