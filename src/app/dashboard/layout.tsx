import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: "○" },
  { href: "/dashboard/book", label: "Book pickup", icon: "+" },
  { href: "/dashboard/orders", label: "Orders", icon: "▤" },
  { href: "/dashboard/addresses", label: "Addresses", icon: "⌂" },
  { href: "/dashboard/wallet", label: "Wallet", icon: "$" },
  { href: "/dashboard/profile", label: "Profile", icon: "☺" },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login?callbackUrl=/dashboard");
  }
  if ((session.user as any).role !== "CUSTOMER") {
    redirect("/unauthorized");
  }

  return (
    <div className="min-h-screen bg-paper flex">
      <aside className="w-60 shrink-0 border-r border-line bg-white hidden md:flex flex-col">
        <div className="px-6 py-6">
          <Link href="/" className="font-display font-bold text-lg text-ink">
            Laundry<span className="text-water">OS</span>
          </Link>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-ink-soft hover:bg-paper-dim hover:text-ink transition-colors"
            >
              <span className="w-4 text-center text-water" aria-hidden>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="px-6 py-6 border-t border-line">
          <p className="text-xs text-ink-soft">Logged in as</p>
          <p className="text-sm font-medium text-ink truncate">{session.user.name}</p>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <div className="max-w-5xl mx-auto px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
