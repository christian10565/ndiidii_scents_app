import { useEffect } from 'react';
import BrandStatement from '../components/BrandStatement.jsx';
import FeaturedCollections from '../components/FeaturedCollections.jsx';
import GiftCardBanner from '../components/GiftCardBanner.jsx';
import Hero from '../components/Hero.jsx';
import HowItWorks from '../components/HowItWorks.jsx';
import LogoCarousel from '../components/LogoCarousel.jsx';
import NewInStore from '../components/NewInStore.jsx';
import SubscriptionClub from '../components/SubscriptionClub.jsx';
import TierShowcase from '../components/TierShowcase.jsx';
import { FEATURES } from '../config/site.js';

export default function Home() {
  useEffect(() => {
    document.title = 'Ndiidii Scents — Middle Eastern Perfume Decants';
  }, []);

  return (
    <>
      <Hero />
      <BrandStatement />
      <NewInStore />
      <HowItWorks />
      <TierShowcase />
      <GiftCardBanner />
      {FEATURES.subscription && <SubscriptionClub />}
      <FeaturedCollections />
      <LogoCarousel />
    </>
  );
}
