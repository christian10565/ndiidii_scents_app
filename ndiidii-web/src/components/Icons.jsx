const base = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

export const SearchIcon = (p) => (
  <svg {...base} {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);
export const HeartIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M12 20.5s-7.5-4.6-9.2-9.3C1.6 7.9 3.4 4.5 6.8 4.5c2 0 3.5 1.1 5.2 3 1.7-1.9 3.2-3 5.2-3 3.4 0 5.2 3.4 4 6.7-1.7 4.7-9.2 9.3-9.2 9.3Z" />
  </svg>
);
export const UserIcon = (p) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
  </svg>
);
export const BagIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M5 8h14l-1 12H6L5 8Z" />
    <path d="M9 8V6a3 3 0 0 1 6 0v2" />
  </svg>
);
export const ChevronDown = (p) => (
  <svg {...base} width={10} height={10} strokeWidth={2} {...p}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);
export const FilterIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
    <circle cx="16" cy="7" r="2" />
    <circle cx="8" cy="17" r="2" />
  </svg>
);
export const ChevronLeft = (p) => (
  <svg {...base} width={12} height={12} strokeWidth={2} {...p}>
    <path d="m15 6-6 6 6 6" />
  </svg>
);
export const ChevronRight = (p) => (
  <svg {...base} width={12} height={12} strokeWidth={2} {...p}>
    <path d="m9 6 6 6-6 6" />
  </svg>
);
export const ArrowRight = (p) => (
  <svg {...base} width={14} height={14} {...p}>
    <path d="M4 12h16M14 6l6 6-6 6" />
  </svg>
);
export const MenuIcon = (p) => (
  <svg {...base} width={22} height={22} {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);
export const CloseIcon = (p) => (
  <svg {...base} width={22} height={22} {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);
export const InstagramIcon = (p) => (
  <svg {...base} width={15} height={15} {...p}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" />
  </svg>
);
export const XIcon = (p) => (
  <svg {...base} width={14} height={14} {...p}>
    <path d="M5 4l14 16M19 4 5 20" />
  </svg>
);
export const WhatsappIcon = (p) => (
  <svg {...base} width={15} height={15} {...p}>
    <path d="M4 20l1.2-4.1A8 8 0 1 1 8.2 19L4 20Z" />
    <path d="M9 9.5c.3 2 2.5 4.2 4.5 4.5l1.3-1.2-1.8-1-.8.6c-.8-.4-1.5-1.1-1.9-1.9l.6-.8-1-1.8L9 9.5Z" />
  </svg>
);
