export function Stars({ count, size = 16 }: { count: number; size?: number }) {
  return (
    <span
      className="inline-flex items-center gap-0.5"
      aria-label={`${count} 顆星`}
      style={{ fontSize: size }}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= count ? "text-gold-500" : "text-ink/15"}>
          ★
        </span>
      ))}
    </span>
  );
}
