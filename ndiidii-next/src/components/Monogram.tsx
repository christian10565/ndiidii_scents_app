/** Quiet tonal monogram shown when a product has no photo yet. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export default function Monogram({ name, className = 'dnoimg' }: { name: string; className?: string }) {
  return (
    <div className={className} role="img" aria-label={name}>
      <span className="serif">{initials(name)}</span>
    </div>
  );
}
