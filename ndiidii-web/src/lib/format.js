export const formatNaira = (n) =>
  typeof n === 'number' && Number.isFinite(n) ? `₦${n.toLocaleString('en-NG')}` : null;
