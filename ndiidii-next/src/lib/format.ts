export const formatNaira = (n: number | null | undefined): string | null =>
  typeof n === 'number' && Number.isFinite(n) ? `₦${n.toLocaleString('en-NG')}` : null;
