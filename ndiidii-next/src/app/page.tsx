import BrandStatement from '@/components/BrandStatement';
import FeaturedCollections from '@/components/FeaturedCollections';
import GiftCardBanner from '@/components/GiftCardBanner';
import Hero from '@/components/Hero';
import HowItWorks from '@/components/HowItWorks';
import LogoCarousel from '@/components/LogoCarousel';
import NewInStore from '@/components/NewInStore';
import SubscriptionClub from '@/components/SubscriptionClub';
import TierShowcase from '@/components/TierShowcase';
import { FEATURES } from '@/config/site';

export default function HomePage() {
  return (
    <>
      <Hero />
      <BrandStatement />
      <NewInStore />
      <HowItWorks />
      <TierShowcase />
      {/* <GiftCardBanner />
      {FEATURES.subscription && <SubscriptionClub />}
      <FeaturedCollections /> */}
      <LogoCarousel />
    </>
  );
}
