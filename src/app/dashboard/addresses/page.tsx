"use client";

import { useState } from "react";
import { useAddresses, useCreateAddress } from "@/lib/hooks/use-booking-data";
import { Button } from "@/components/ui/button";

export default function AddressesPage() {
  const { data, isLoading } = useAddresses();
  const createAddress = useCreateAddress();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    label: "",
    line1: "",
    line2: "",
    city: "",
    latitude: "",
    longitude: "",
    isDefault: false,
  });
  const [error, setError] = useState<string | null>(null);

  const addresses = data?.data ?? [];

  function update<K extends keyof typeof form>(key: K) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const lat = parseFloat(form.latitude);
    const lng = parseFloat(form.longitude);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      setError("Latitude and longitude must be numbers. Tip: right-click a spot in Google Maps to copy its coordinates.");
      return;
    }

    try {
      await createAddress.mutateAsync({
        label: form.label,
        line1: form.line1,
        line2: form.line2 || undefined,
        city: form.city,
        latitude: lat,
        longitude: lng,
        isDefault: form.isDefault,
      } as any);
      setForm({ label: "", line1: "", line2: "", city: "", latitude: "", longitude: "", isDefault: false });
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save address.");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-semibold text-2xl text-ink">Addresses</h1>
          <p className="text-sm text-ink-soft mt-1">Save pickup and delivery spots to book faster.</p>
        </div>
        <Button onClick={() => setShowForm((s) => !s)} size="sm">
          {showForm ? "Cancel" : "Add address"}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-6 ticket p-6 max-w-md space-y-4" noValidate>
          <div>
            <label className="text-sm font-medium text-ink">Label</label>
            <input
              required
              placeholder="Home, Office…"
              value={form.label}
              onChange={update("label")}
              className="mt-1.5 w-full rounded-lg border border-line px-4 py-2.5 text-sm focus:border-water outline-none"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-ink">Street address</label>
            <input
              required
              value={form.line1}
              onChange={update("line1")}
              className="mt-1.5 w-full rounded-lg border border-line px-4 py-2.5 text-sm focus:border-water outline-none"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-ink">Unit / apartment <span className="text-ink-soft font-normal">(optional)</span></label>
            <input
              value={form.line2}
              onChange={update("line2")}
              className="mt-1.5 w-full rounded-lg border border-line px-4 py-2.5 text-sm focus:border-water outline-none"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-ink">City</label>
            <input
              required
              value={form.city}
              onChange={update("city")}
              className="mt-1.5 w-full rounded-lg border border-line px-4 py-2.5 text-sm focus:border-water outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-ink">Latitude</label>
              <input
                required
                inputMode="decimal"
                placeholder="10.3157"
                value={form.latitude}
                onChange={update("latitude")}
                className="mt-1.5 w-full rounded-lg border border-line px-4 py-2.5 text-sm focus:border-water outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-ink">Longitude</label>
              <input
                required
                inputMode="decimal"
                placeholder="123.8854"
                value={form.longitude}
                onChange={update("longitude")}
                className="mt-1.5 w-full rounded-lg border border-line px-4 py-2.5 text-sm focus:border-water outline-none"
              />
            </div>
          </div>
          <p className="text-xs text-ink-soft">
            An interactive map picker (Google Maps) is coming in a later update — for now, right-click
            your address in Google Maps and copy the coordinates shown.
          </p>

          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={form.isDefault} onChange={update("isDefault")} className="rounded" />
            Set as default address
          </label>

          {error && (
            <p role="alert" className="text-sm text-alert bg-alert/5 border border-alert/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <Button type="submit" disabled={createAddress.isPending} className="w-full">
            {createAddress.isPending ? "Saving…" : "Save address"}
          </Button>
        </form>
      )}

      <div className="mt-8 space-y-3">
        {isLoading && <div className="ticket p-6 h-20 animate-pulse" />}
        {!isLoading && addresses.length === 0 && !showForm && (
          <p className="text-sm text-ink-soft">No saved addresses yet. Add one to start booking.</p>
        )}
        {addresses.map((addr) => (
          <div key={addr.id} className="ticket p-4 flex items-center justify-between max-w-md">
            <div>
              <p className="text-sm font-medium text-ink">
                {addr.label} {addr.isDefault && <span className="text-xs text-water-deep ml-1">(default)</span>}
              </p>
              <p className="text-xs text-ink-soft mt-0.5">
                {addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}, {addr.city}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
