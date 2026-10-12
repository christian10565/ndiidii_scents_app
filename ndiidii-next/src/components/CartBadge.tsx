'use client';

import { useCart } from '@/lib/cart';

/** Live cart count for the header badge. Reads the localStorage-backed cart. */
export default function CartBadge() {
  const { cartCount } = useCart();
  // suppressHydrationWarning: the count is 0 on the server / first client paint,
  // then updates from localStorage after mount.
  return <span className="icon-btn__badge" suppressHydrationWarning>{cartCount}</span>;
}
