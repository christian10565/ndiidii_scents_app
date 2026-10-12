'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FEATURES, NAV } from '@/config/site';
import {
  BagIcon,
  ChevronDown,
  CloseIcon,
  HeartIcon,
  MenuIcon,
  SearchIcon,
  UserIcon,
} from './Icons';
import CartBadge from './CartBadge';

/** Text wordmark. Swap for the official logo file when you have it (the brand book forbids retyping it). */
export function Wordmark() {
  return (
    <Link href="/" className="wordmark" aria-label="Ndiidii Scents — home">
      <span className="wordmark__name">NDIIDII</span>
      <span className="wordmark__sub">SCENTS</span>
    </Link>
  );
}

// TODO(step 2): replace with the real counts from the cart / wishlist state.
export default function Header({ cartCount = 0, wishlistCount = 0 }: { cartCount?: number; wishlistCount?: number }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the mobile menu after navigating
  useEffect(() => setOpen(false), [pathname]);

  const items = NAV.filter((i) => !i.feature || FEATURES[i.feature as keyof typeof FEATURES]);

  return (
    <header className="header">
      <div className="header__inner">
        <button
          className="header__burger"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="main-nav"
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          {open ? <CloseIcon /> : <MenuIcon />}
        </button>

        <Wordmark />

        <nav id="main-nav" className={`nav ${open ? 'nav--open' : ''}`} aria-label="Main">
          <ul className="nav__list">
            {items.map((item) => (
              <li
                key={item.label}
                className={`nav__item ${item.children ? 'nav__item--parent' : ''}`}
              >
                <Link
                  href={item.to}
                  className={`nav__link ${pathname === item.to ? 'is-active' : ''}`}
                >
                  {item.label}
                  {item.children && <ChevronDown />}
                </Link>
                {item.children && (
                  <ul className="nav__menu">
                    {item.children.map((c) => (
                      <li key={c.label}>
                        <Link href={c.to}>{c.label}</Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <div className="header__tools">
          {/* Nigeria only for now, so the currency is fixed. */}
          <span className="header__currency">
            NGN <ChevronDown />
          </span>
          <Link href="/search" className="icon-btn" aria-label="Search">
            <SearchIcon />
          </Link>
          {FEATURES.wishlist && (
            <Link href="/wishlist" className="icon-btn" aria-label={`Wishlist, ${wishlistCount} items`}>
              <HeartIcon />
              <span className="icon-btn__badge">{wishlistCount}</span>
            </Link>
          )}
          {FEATURES.account && (
            <Link href="/account" className="icon-btn" aria-label="Account">
              <UserIcon />
            </Link>
          )}
          <Link href="/checkout" className="icon-btn" aria-label={`Cart, ${cartCount} items`}>
            <BagIcon />
            <CartBadge />
          </Link>
        </div>
      </div>
    </header>
  );
}
