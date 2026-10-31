import { getPerfumes, getOils } from '@/lib/catalog';
import CheckoutClient from '@/components/CheckoutClient';

const isTestMode = (): boolean => {
  const key = process.env.PAYSTACK_SECRET_KEY;
  return Boolean(key && key.startsWith('sk_test_'));
};

export const instant = false;

async function CheckoutBody() {
  const [perfumes, oils] = await Promise.all([getPerfumes(), getOils()]);
  const catalog = [
    ...perfumes.map((p) => ({ slug: p.slug, name: p.name, imageUrl: p.imageUrl })),
    ...oils.map((o) => ({ slug: o.slug, name: o.name, imageUrl: o.imageUrl })),
  ];
  return <CheckoutClient catalog={catalog} testMode={isTestMode()} />;
}

export default function CheckoutPage() {
  return <CheckoutBody />;
}
