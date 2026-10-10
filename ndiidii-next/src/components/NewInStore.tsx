import { getPerfumes } from '@/lib/catalog';
import { NewInStoreRail } from './NewInStoreRail';

/** Server fetches the newest 10 in-stock perfumes; the rail is the interactive part. */
export default async function NewInStore() {
  const all = await getPerfumes();
  const items = all
    .filter((p) => p.inStock)
    .slice(-10)
    .reverse();
  return <NewInStoreRail items={items} />;
}
