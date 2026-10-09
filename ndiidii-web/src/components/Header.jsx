import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { FEATURES, NAV } from '../config/site.js';
import {
  BagIcon,
  ChevronDown,
  CloseIcon,
  HeartIcon,
  MenuIcon,
  SearchIcon,
  UserIcon,
} from './Icons.jsx';

/** Text wordmark. Swap for the official logo file when you have it (the brand book forbids retyping it). */
export function Wordmark() {
  return (
    <Link to="/" className="wordmark" aria-label="Ndiidii Scents — home">
      <span className="wordmark__name">NDIIDII</span>
      <span className="wordmark__sub">SCENTS</span>
    </Link>
  );
}

// TODO(step 2): replace with the real counts from the cart / wishlist state.
export default function Header({ cartCount = 0, wishlistCount = 0 }) {
  const [open, setOpen] = useState(false);
  const { pathname, search } = useLocation();

  // Close the mobile menu after navigating
  useEffect(() => setOpen(false), [pathname, search]);

  const items = NAV.filter((i) => !i.feature || FEATURES[i.feature]);

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
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) => `nav__link ${isActive ? 'is-active' : ''}`}
                >
                  {item.label}
                  {item.children && <ChevronDown />}
                </NavLink>
                {item.children && (
                  <ul className="nav__menu">
                    {item.children.map((c) => (
                      <li key={c.label}>
                        <Link to={c.to}>{c.label}</Link>
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
          <Link to="/search" className="icon-btn" aria-label="Search">
            <SearchIcon />
          </Link>
          {FEATURES.wishlist && (
            <Link to="/wishlist" className="icon-btn" aria-label={`Wishlist, ${wishlistCount} items`}>
              <HeartIcon />
              <span className="icon-btn__badge">{wishlistCount}</span>
            </Link>
          )}
          {FEATURES.account && (
            <Link to="/account" className="icon-btn" aria-label="Account">
              <UserIcon />
            </Link>
          )}
          <Link to="/checkout" className="icon-btn" aria-label={`Cart, ${cartCount} items`}>
            <BagIcon />
            <span className="icon-btn__badge">{cartCount}</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
