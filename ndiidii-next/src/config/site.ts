/**
 * Everything on the homepage that is copy, a link, or an image path lives here,
 * so the components stay free of content.
 *
 * Ported from ndiidii-web/src/config/site.js.
 */

// Sections/links drawn in the mockup that are outside the agreed scope.
// All true = identical to the mockup. Set to false to remove them from the site.
export const FEATURES = {
  subscription: true, // nav link + "Never Run Out of Signature" section + footer link
  wishlist: true, // hearts on product cards, header heart, footer link
  account: true, // header account icon, footer "My Orders / Account" links
  guide: true, // nav link + footer link
  affiliate: true, // footer link
  requestPerfume: true, // footer link
};

export const ANNOUNCEMENTS = [
  'Free shipping on orders over ₦150,000',
  'New arrivals every week',
  'Build your own collection in the Collection Builder',
];

export const NAV = [
  { label: 'Home', to: '/' },
  {
    label: 'Shop',
    to: '/shop',
    children: [
      { label: 'All Scents', to: '/shop' },
      { label: 'Perfumes', to: '/shop?collection=perfumes' },
      { label: 'Perfume Oils', to: '/collection-builder/oils' },
    ],
  },
  {
    label: 'Brands',
    to: '/brands',
    children: [{ label: 'All Brands (A–Z)', to: '/brands' }],
  },
  { label: 'Perfume Collection Builder', to: '/collection-builder' },
  { label: 'Oil Collection Builder', to: '/collection-builder/oils' },
  { label: 'Discovery Sets', to: '/discovery-sets' },
];

// Hero background lives at /public/images/hero.png (from the Home mockup).
export const HERO_SLIDES = [
  {
    image: '/images/hero.png',
    eyebrow: 'Middle Eastern perfume decants',
    titleTop: 'Your scents.',
    titleItalic: 'One story, told your way.',
    text: 'Pick a bundle size, then choose every scent yourself or let us surprise you.',
  },
];

export const SHOP = {
  heroImage: '/images/shop-hero.jpg',
  title: 'Every Scent, By Tier',
  subtitle: 'Curated luxury, made for you',
  pageSize: 24,
  brandsShown: 12, // brands listed in the filter before "View All Brands, A–Z"
  collections: [
    { label: 'Curated Discovery Sets', to: '/discovery-sets' },
    { label: 'Perfume Oils', to: '/oils' },
    { label: 'Occasion', to: '/shop?collection=occasion', hidden: true },
    { label: 'Notes', to: '/shop?collection=notes', hidden: true },
  ],
};

export const BRAND_STATEMENT = {
  eyebrow: 'What we believe',
  titleStart: 'Quiet Luxury,',
  titleItalic: 'Poured Exactly.',
  text: 'Quiet over loud. Considered curation over impulse. Restraint in design, packaging, and service.',
};

export const HOW_IT_WORKS = [
  { n: '01', title: 'Choose a Tier', text: 'Each tier is a curated set of 4 bottles — pick the tier that fits you.' },
  {
    n: '02',
    title: 'Choose or Surprise Me',
    text: "Hand-pick every scent from our Male, Female and Unisex collections, or let us choose for you at random.",
  },
  {
    n: '03',
    title: 'One Collection',
    text: 'Add your packaging of choice and your set arrives together, curated by you.',
  },
];

export const TIER_TABS = [
  { tier: 1, label: 'Tier One' },
  { tier: 2, label: 'Tier Two' },
  { tier: 3, label: 'Tier Three' },
];

export const SUBSCRIPTION_PLANS = [
  {
    key: 'monthly',
    label: 'Monthly',
    price: '₦40,000',
    per: '/mo',
    mix: '1 Tier One · 2 Tier Two · 1 Tier Three',
    text: 'The Ndiidii Box — 1 Tier One, 2 Tier Two and 1 Tier Three decant — curated and delivered every month.',
  },
  {
    key: 'quarterly',
    label: 'Quarterly',
    price: '₦110,000',
    per: '/3mo',
    mix: '1 Tier One · 2 Tier Two · 1 Tier Three',
    text: 'The Ndiidii Box, billed every 3 months — the same 1+2+1 tier mix, delivered quarterly.',
    popular: true,
  },
  {
    key: 'annual',
    label: 'Annual',
    price: '₦450,000',
    per: '/yr',
    mix: '1 Tier One · 2 Tier Two · 1 Tier Three',
    text: 'The Ndiidii Box, billed once a year — the same 1+2+1 tier mix, delivered all year.',
  },
];

export const COLLECTIONS = [
  { title: 'Curated Discovery Sets', text: 'A guided first step into the Ndiidii wardrobe.', to: '/discovery-sets', image: '/images/collection-discovery.jpg' },
  { title: 'Perfume Oils', text: 'Alcohol-free, skin-warm, and long-wearing.', to: '/oils', image: '/images/collection-oils.jpg' },
  { title: 'Occasion', text: 'Daytime, evening, and everything worth a second spritz.', to: '/shop?collection=occasion', image: '/images/collection-occasion.jpg' },
  { title: 'Notes', text: 'Explore by the notes you already love.', to: '/shop?collection=notes', image: '/images/collection-notes.jpg' },
];

// Put logo files in /public/brands (e.g. lattafa.png). If a file is missing, the name still shows.
// Every name here must be a brand that actually has products (matches the Brands page,
// which derives from getBrands()); Zaoud / Ministry of Oud / Ajmal were removed — zero products.
export const BRAND_LOGOS = [
  { name: 'Afnan', logo: '/brands/afnan.png' },
  { name: 'Armaf', logo: '/brands/armaf.png' },
  { name: 'Fragrance World', logo: '/brands/fragrance-world.png' },
  { name: 'French Avenue', logo: '/brands/french-avenue.png' },
  { name: 'Gulf Orchid', logo: '/brands/gulf-orchid.png' },
  { name: 'Khadlaj', logo: '/brands/khadlaj.png' },
  { name: 'Lattafa', logo: '/brands/lattafa.png' },
  { name: 'Maison Alhambra', logo: '/brands/maison-alhambra.png' },
  { name: 'Paris Corner', logo: '/brands/paris-corner.png' },
  { name: 'Rayhaan', logo: '/brands/rayhaan.png' },
  { name: 'RiiFFS', logo: '/brands/riiffs.png' },
];

export const FOOTER = {
  blurb:
    'Middle Eastern perfume decants, curated by tier and built one collection at a time. Quiet luxury, poured exactly.',
  socials: [
    { label: 'Instagram', href: 'https://instagram.com/', icon: 'instagram' },
    { label: 'X', href: 'https://x.com/', icon: 'x' },
    { label: 'WhatsApp', href: 'https://wa.me/', icon: 'whatsapp' },
  ],
  columns: [
    {
      title: 'Shop',
      links: [
        { label: 'All Scents', to: '/shop' },
        { label: 'Perfume Collection Builder', to: '/collection-builder' },
        { label: 'Oil Collection Builder', to: '/collection-builder/oils' },
        { label: 'Gift Cards', to: '/gift-cards' },
      ],
    },
  ],
  payments: ['Paystack', 'Visa', 'Mastercard'],
};
