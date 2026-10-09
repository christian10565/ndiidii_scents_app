import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import Shop from './pages/Shop.jsx';

/** Pages not built yet land here so the homepage links never show a blank screen. */
function ComingSoon() {
  return (
    <div className="container coming-soon">
      <p className="eyebrow">Ndiidii Scents</p>
      <h1 className="serif">Coming soon</h1>
      <p>This page is being built.</p>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="shop" element={<Shop />} />
        <Route path="*" element={<ComingSoon />} />
      </Route>
    </Routes>
  );
}
