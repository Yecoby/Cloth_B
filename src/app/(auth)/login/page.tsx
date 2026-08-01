"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const verified = searchParams.get("verified") === "1";
  const linkError = searchParams.get("error");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError("That email and password don't match an account. Check both and try again.");
      return;
    }

    router.push(searchParams.get("callbackUrl") || "/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-paper flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="font-display font-bold text-lg text-ink">
          Laundry<span className="text-water">OS</span>
        </Link>

        <h1 className="font-display font-semibold text-2xl text-ink mt-8">Welcome back</h1>
        <p className="text-sm text-ink-soft mt-1">Log in to track your orders and book a new pickup.</p>

        {verified && (
          <p className="mt-4 text-sm text-water-deep bg-water/5 border border-water/20 rounded-lg px-3 py-2">
            Your email is verified — go ahead and log in.
          </p>
        )}
        {linkError && (
          <p className="mt-4 text-sm text-alert bg-alert/5 border border-alert/20 rounded-lg px-3 py-2">
            That verification link is invalid or has expired. Please register again or contact support.
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
          <div>
            <label htmlFor="email" className="text-sm font-medium text-ink">Email</label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-line px-4 py-2.5 text-sm text-ink bg-white focus:border-water outline-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium text-ink">Password</label>
              <Link href="/forgot-password" className="text-xs text-water-deep hover:underline">
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-line px-4 py-2.5 text-sm text-ink bg-white focus:border-water outline-none"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-alert bg-alert/5 border border-alert/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <Button type="submit" disabled={loading} className="w-full" size="lg">
            {loading ? "Logging in…" : "Log in"}
          </Button>
        </form>

        <p className="mt-6 text-sm text-ink-soft text-center">
          New to LaundryOS?{" "}
          <Link href="/register" className="text-water-deep font-medium hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
