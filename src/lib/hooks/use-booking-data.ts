"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface Branch {
  id: string;
  name: string;
  city: string;
  addressLine: string;
  deliveryRadiusKm: number;
}

export interface ServiceOption {
  id: string;
  name: string;
  slug: string;
  pricingModel: "PER_KG" | "PER_ITEM" | "CUSTOM";
  basePrice: string;
  unit: string | null;
}

export interface ExtraOption {
  id: string;
  name: string;
  slug: string;
  extraPrice: string;
}

export interface SavedAddress {
  id: string;
  label: string;
  line1: string;
  line2?: string | null;
  city: string;
  isDefault: boolean;
  latitude: number;
  longitude: number;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Request failed");
  }
  return res.json();
}

export function useBranches() {
  return useQuery({
    queryKey: ["branches"],
    queryFn: () => fetchJson<{ data: Branch[] }>("/api/branches"),
  });
}

export function useServiceCatalog() {
  return useQuery({
    queryKey: ["services"],
    queryFn: () => fetchJson<{ data: { services: ServiceOption[]; extras: ExtraOption[] } }>("/api/services"),
  });
}

export function useAddresses() {
  return useQuery({
    queryKey: ["addresses"],
    queryFn: () => fetchJson<{ data: SavedAddress[] }>("/api/addresses"),
  });
}

export function useCreateAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<SavedAddress, "id">) => {
      const res = await fetch("/api/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to save address");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
    },
  });
}
