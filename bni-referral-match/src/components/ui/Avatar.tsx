export function Avatar({
  name,
  color,
  size = 44,
  src,
}: {
  name: string;
  color: string;
  size?: number;
  src?: string;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className="rounded-full object-cover ring-2 ring-white/80"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="flex items-center justify-center rounded-full font-semibold text-white ring-2 ring-white/80"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: `linear-gradient(135deg, ${color}, ${color}cc)`,
      }}
      aria-label={name}
    >
      {name.slice(0, 1)}
    </div>
  );
}
