import Link from "next/link";
import { Button } from "@/components/ui/button";
import { OrderTicket } from "@/components/shared/order-ticket";

const STEPS = [
  {
    n: "01",
    title: "Book a pickup",
    body: "Pick a time window today or tomorrow. Tell us what's in the bag — wash & fold, dry cleaning, or that comforter that won't fit in your machine.",
  },
  {
    n: "02",
    title: "We wash it right",
    body: "A driver picks up at your door and your order gets weighed, tagged, and washed at the nearest branch — with photos before and after.",
  },
  {
    n: "03",
    title: "Delivered fresh",
    body: "Track it the whole way. It comes back folded, ironed, or hung — whichever you chose when you booked.",
  },
];

const SERVICES = [
  { name: "Wash & Fold", price: "₱65/kg" },
  { name: "Wash & Dry", price: "₱55/kg" },
  { name: "Dry Cleaning", price: "₱180/item" },
  { name: "Ironing", price: "₱25/item" },
  { name: "Shoes Cleaning", price: "₱150/item" },
  { name: "Comforters", price: "₱280/item" },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-paper">
      {/* Nav */}
      <header className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <span className="font-display font-bold text-lg tracking-tight text-ink">
          Laundry<span className="text-water">OS</span>
        </span>
        <nav className="hidden md:flex items-center gap-8 text-sm text-ink-soft">
          <a href="#services" className="hover:text-ink">Services</a>
          <a href="#how" className="hover:text-ink">How it works</a>
          <a href="#services" className="hover:text-ink">Pricing</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-ink-soft hover:text-ink hidden sm:block">
            Log in
          </Link>
          <Link href="/register">
            <Button size="sm">Book a pickup</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-10 pb-24 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <h1 className="font-display font-bold text-[2.75rem] leading-[1.05] tracking-tight text-ink">
            Laundry, picked up.
            <br />
            Delivered fresh.
          </h1>
          <p className="mt-5 text-lg text-ink-soft max-w-md">
            Book a pickup in under a minute. Track every load from your doorstep to the wash and
            back — no drop-off, no guessing when it's ready.
          </p>
          <div className="mt-8 flex items-center gap-4">
            <Link href="/register">
              <Button size="lg">Book your first pickup</Button>
            </Link>
            <a href="#how" className="text-sm font-medium text-ink-soft hover:text-ink">
              See how it works →
            </a>
          </div>
          <p className="mt-6 text-xs text-ink-soft/70">
            No app download required. First-time customers save 50% with code WELCOME50.
          </p>
        </div>

        <div className="flex justify-center md:justify-end">
          <OrderTicket
            orderNumber="CLM-4821"
            customerName="Mika R."
            service="Wash & Fold · 4.2kg · Express"
            currentStage={2}
            etaLabel="Ready by 6:40 PM today"
          />
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="bg-white border-y border-line">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <p className="text-xs uppercase tracking-widest text-water font-medium">How it works</p>
          <h2 className="font-display font-semibold text-3xl text-ink mt-2 max-w-md">
            Three steps, from your hamper to your closet.
          </h2>

          <div className="mt-12 grid md:grid-cols-3 gap-10">
            {STEPS.map((step) => (
              <div key={step.n}>
                <span className="font-mono text-sm text-sun-deep">{step.n}</span>
                <h3 className="font-display font-semibold text-xl text-ink mt-3">{step.title}</h3>
                <p className="mt-2 text-sm text-ink-soft leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="max-w-6xl mx-auto px-6 py-20">
        <p className="text-xs uppercase tracking-widest text-water font-medium">Services</p>
        <h2 className="font-display font-semibold text-3xl text-ink mt-2 max-w-md">
          Priced by the kilo, or by the item.
        </h2>

        <div className="mt-10 grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          {SERVICES.map((s) => (
            <div
              key={s.name}
              className="ticket p-5 flex items-center justify-between"
            >
              <span className="text-sm font-medium text-ink">{s.name}</span>
              <span className="font-mono text-sm text-water-deep">{s.price}</span>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-ink">
        <div className="max-w-6xl mx-auto px-6 py-20 text-center">
          <h2 className="font-display font-semibold text-3xl text-paper max-w-lg mx-auto">
            Your hamper called. It wants a day off.
          </h2>
          <div className="mt-8">
            <Link href="/register">
              <Button variant="secondary" size="lg">Book your first pickup</Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="max-w-6xl mx-auto px-6 py-10 flex items-center justify-between text-xs text-ink-soft">
        <span>© {new Date().getFullYear()} LaundryOS</span>
        <span>Cebu City · Multi-branch ready</span>
      </footer>
    </main>
  );
}
