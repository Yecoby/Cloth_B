import { cn } from "@/lib/utils";

const STAGES = [
  "Picked up",
  "Received",
  "Washing",
  "Drying",
  "Quality check",
  "Out for delivery",
] as const;

interface OrderTicketProps {
  orderNumber: string;
  customerName?: string;
  service: string;
  currentStage: number; // index into STAGES
  etaLabel?: string;
  className?: string;
}

export function OrderTicket({
  orderNumber,
  customerName,
  service,
  currentStage,
  etaLabel,
  className,
}: OrderTicketProps) {
  return (
    <div className={cn("ticket font-body overflow-hidden max-w-sm", className)}>
      <div className="p-6 pb-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-ink-soft">Claim ticket</p>
            <p className="font-mono text-lg tracking-tight text-ink mt-1">#{orderNumber}</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-water/10 flex items-center justify-center">
            <span className="h-2.5 w-2.5 rounded-full bg-water animate-pulse" aria-hidden />
          </div>
        </div>

        {customerName && (
          <p className="mt-4 text-sm text-ink-soft">
            For <span className="text-ink font-medium">{customerName}</span>
          </p>
        )}
        <p className="text-sm text-ink-soft">{service}</p>

        <div className="mt-5 space-y-2">
          {STAGES.map((stage, i) => {
            const done = i < currentStage;
            const active = i === currentStage;
            return (
              <div key={stage} className="flex items-center gap-3">
                <span
                  className={cn(
                    "h-2 w-2 rounded-full shrink-0",
                    done && "bg-water",
                    active && "bg-sun ring-4 ring-sun/20",
                    !done && !active && "bg-line"
                  )}
                  aria-hidden
                />
                <span
                  className={cn(
                    "text-sm",
                    active ? "text-ink font-medium" : done ? "text-ink-soft" : "text-ink-soft/50"
                  )}
                >
                  {stage}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="ticket-perforation" aria-hidden />

      <div className="px-6 py-4 flex items-center justify-between bg-paper-dim/40">
        <span className="text-xs text-ink-soft uppercase tracking-widest">
          {etaLabel ?? "On schedule"}
        </span>
        <span className="text-xs font-mono text-ink-soft">TRACK →</span>
      </div>
    </div>
  );
}
