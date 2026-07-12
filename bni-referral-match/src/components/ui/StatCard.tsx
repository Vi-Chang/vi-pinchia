export function StatCard({
  label,
  value,
  unit,
  icon,
  hint,
  accent = "gold",
}: {
  label: string;
  value: string | number;
  unit?: string;
  icon: string;
  hint?: string;
  accent?: "gold" | "red" | "green" | "blue";
}) {
  const accents: Record<string, string> = {
    gold: "from-gold-300/60 to-gold-400/30",
    red: "from-bni-red/15 to-bni-red/5",
    green: "from-emerald-300/40 to-emerald-200/20",
    blue: "from-sky-300/40 to-sky-200/20",
  };
  return (
    <div className="glass glass-hover relative overflow-hidden p-5">
      <div
        className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br blur-xl ${accents[accent]}`}
      />
      <div className="flex items-center gap-2 text-sm text-ink-soft">
        <span className="text-base">{icon}</span>
        {label}
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-3xl font-bold tracking-tight text-ink">{value}</span>
        {unit && <span className="text-sm text-ink-muted">{unit}</span>}
      </div>
      {hint && <div className="mt-1.5 text-xs text-ink-muted">{hint}</div>}
    </div>
  );
}
