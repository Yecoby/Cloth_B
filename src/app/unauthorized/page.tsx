import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function UnauthorizedPage() {
  return (
    <main className="min-h-screen bg-paper flex items-center justify-center px-6 text-center">
      <div>
        <h1 className="font-display font-semibold text-2xl text-ink">This area isn't for your account</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Your account doesn't have access to this section.
        </p>
        <Link href="/" className="inline-block mt-6">
          <Button>Back to home</Button>
        </Link>
      </div>
    </main>
  );
}
