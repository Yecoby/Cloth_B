"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [devVerifyUrl, setDevVerifyUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        const detail = data?.details?.fieldErrors
          ? Object.values(data.details.fieldErrors).flat()[0]
          : data.error;
        throw new Error((detail as string) || "Something went wrong. Please try again.");
      }

      setDevVerifyUrl(data?.data?.devVerifyUrl ?? null);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <main className="min-h-screen bg-paper flex items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <div className="ticket p-8">
            <p className="font-display font-semibold text-xl text-ink">Check your inbox</p>
            <p className="mt-2 text-sm text-ink-soft">
              We've sent a verification link to <strong>{form.email}</strong>. Click it to
              activate your account, then log in.
            </p>
            {devVerifyUrl && (
              <div className="mt-4 text-left bg-paper-dim rounded-lg p-3 border border-line">
                <p className="text-xs font-medium text-ink-soft uppercase tracking-wide">
                  Dev mode — email sending isn't wired up yet
                </p>
                <a
                  href={devVerifyUrl}
                  className="mt-1 block text-xs text-water-deep break-all hover:underline"
                >
                  {devVerifyUrl}
                </a>
              </div>
            )}
            <Link href="/login" className="inline-block mt-6">
              <Button size="md">Go to log in</Button>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-paper flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="font-display font-bold text-lg text-ink">
          Laundry<span className="text-water">OS</span>
        </Link>

        <h1 className="font-display font-semibold text-2xl text-ink mt-8">Create your account</h1>
        <p className="text-sm text-ink-soft mt-1">Book your first pickup in the next two minutes.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="firstName" className="text-sm font-medium text-ink">First name</label>
              <input
                id="firstName"
                required
                value={form.firstName}
                onChange={update("firstName")}
                className="mt-1.5 w-full rounded-lg border border-line px-4 py-2.5 text-sm text-ink bg-white focus:border-water outline-none"
              />
            </div>
            <div>
              <label htmlFor="lastName" className="text-sm font-medium text-ink">Last name</label>
              <input
                id="lastName"
                required
                value={form.lastName}
                onChange={update("lastName")}
                className="mt-1.5 w-full rounded-lg border border-line px-4 py-2.5 text-sm text-ink bg-white focus:border-water outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="text-sm font-medium text-ink">Email</label>
            <input
              id="email"
              type="email"
              required
              value={form.email}
              onChange={update("email")}
              className="mt-1.5 w-full rounded-lg border border-line px-4 py-2.5 text-sm text-ink bg-white focus:border-water outline-none"
            />
          </div>

          <div>
            <label htmlFor="phone" className="text-sm font-medium text-ink">Phone <span className="text-ink-soft font-normal">(optional)</span></label>
            <input
              id="phone"
              type="tel"
              value={form.phone}
              onChange={update("phone")}
              className="mt-1.5 w-full rounded-lg border border-line px-4 py-2.5 text-sm text-ink bg-white focus:border-water outline-none"
            />
          </div>

          <div>
            <label htmlFor="password" className="text-sm font-medium text-ink">Password</label>
            <input
              id="password"
              type="password"
              required
              value={form.password}
              onChange={update("password")}
              className="mt-1.5 w-full rounded-lg border border-line px-4 py-2.5 text-sm text-ink bg-white focus:border-water outline-none"
            />
            <p className="mt-1.5 text-xs text-ink-soft">
              At least 10 characters, with an uppercase letter, a lowercase letter, and a number.
            </p>
          </div>

          {error && (
            <p role="alert" className="text-sm text-alert bg-alert/5 border border-alert/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <Button type="submit" disabled={loading} className="w-full" size="lg">
            {loading ? "Creating account…" : "Create account"}
          </Button>
        </form>

        <p className="mt-6 text-sm text-ink-soft text-center">
          Already have an account?{" "}
          <Link href="/login" className="text-water-deep font-medium hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
