import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import AnnouncementBar from './AnnouncementBar.jsx';
import Footer from './Footer.jsx';
import Header from './Header.jsx';

export default function Layout() {
  const { pathname } = useLocation();

  // Start every page at the top when navigating
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <>
      <AnnouncementBar />
      <Header />
      <main>
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
