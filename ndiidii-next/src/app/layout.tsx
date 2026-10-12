import type { Metadata } from 'next';
import { Amiri, Manrope } from 'next/font/google';
import '@/styles/tokens.css';
import '@/styles/global.css';
import '@/styles/home.css';
import '@/styles/shop.css';
import '@/styles/pdp.css';
import '@/styles/builder.css';
import '@/styles/checkout.css';
import '@/styles/brands.css';
import '@/styles/search.css';
import '@/styles/discovery.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AnnouncementBar from '@/components/AnnouncementBar';
import { CartProvider } from '@/lib/cart';
import { Suspense } from 'react';

const amiri = Amiri({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  variable: '--font-amiri',
  display: 'swap',
});

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-manrope',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Ndiidii Scents — Middle Eastern Perfume Decants',
  description:
    'Middle Eastern perfume decants, curated by tier and built one collection at a time. Quiet luxury, poured exactly.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${amiri.variable} ${manrope.variable}`}>
      <body>
        <CartProvider>
          <AnnouncementBar />
          <Suspense fallback={null}>
            <Header />
          </Suspense>
          <main>{children}</main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
