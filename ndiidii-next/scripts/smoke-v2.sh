#!/usr/bin/env bash
# Route smoke test against the .next-verify production build on :3100.
set -u
BASE=http://localhost:3100
OUT="$LOCALAPPDATA/Temp/ndiidii-smoke"
mkdir -p "$OUT"

S=$(node -e "
const s=require('./data/catalog-snapshot.json');
const sell=p=>p.tier!==null||(p.bottlePrice??0)>0;
const good=s.perfumes.find(p=>p.tier&&p.bottlePrice);
const hidden=s.perfumes.find(p=>!sell(p));
const oil=s.oils.find(o=>o.category==='niche');
console.log([good.slug,good.tier,hidden.slug,oil.slug].join(' '));
")
GOOD=$(echo "$S" | cut -d' ' -f1)
TIER=$(echo "$S" | cut -d' ' -f2)
HID=$(echo "$S" | cut -d' ' -f3)
OIL=$(echo "$S" | cut -d' ' -f4)

echo "good=$GOOD tier=$TIER"
echo "hidden=$HID"
echo "oil=$OIL"
echo "out=$OUT"
echo

echo "== /shop =="
code=$(curl -s -o "$OUT/shop.html" -w "%{http_code}" --compressed "$BASE/shop")
echo "status=$code  cards=$(grep -o 'class="scard ' "$OUT/shop.html" | wc -l)  oilLinks=$(grep -o 'href="/oils/' "$OUT/shop.html" | wc -l)  collectionSection=$(grep -c 'Perfume Oils' "$OUT/shop.html")"

echo "== /perfumes/\$GOOD =="
code=$(curl -s -o "$OUT/pdp.html" -w "%{http_code}" --compressed "$BASE/perfumes/$GOOD")
echo "status=$code  buyBottle=$(grep -c 'Buy full bottle' "$OUT/pdp.html")  addDecant=$(grep -c 'Add decant to set' "$OUT/pdp.html")  priceBlocks=$(grep -o 'pdp__price' "$OUT/pdp.html" | wc -l)"

echo "== /perfumes/\$HID (expect not-found body) =="
code=$(curl -s -o "$OUT/hid.html" -w "%{http_code}" --compressed "$BASE/perfumes/$HID")
echo "status=$code  notFoundMarkers=$(grep -c 'could not be found\|not-found\|404' "$OUT/hid.html")  buyBottle=$(grep -c 'Buy full bottle' "$OUT/hid.html")"

echo "== /oils/\$OIL =="
code=$(curl -s -o "$OUT/oil.html" -w "%{http_code}" --compressed "$BASE/oils/$OIL")
echo "status=$code  cta=$(grep -c 'Build a set with this oil' "$OUT/oil.html")  cloudinaryRefs=$(grep -o 'res.cloudinary.com' "$OUT/oil.html" | wc -l)  priceTable=$(grep -o 'pdp__oilprices' "$OUT/oil.html" | wc -l)"

echo "== /oils/\$GOOD (old pricing hole: must NOT render a product) =="
code=$(curl -s -o "$OUT/hole.html" -w "%{http_code}" --compressed "$BASE/oils/$GOOD")
echo "status=$code  notFoundMarkers=$(grep -c 'could not be found\|not-found\|404' "$OUT/hole.html")  cta=$(grep -c 'Build a set with this oil' "$OUT/hole.html")  oilPriceTable=$(grep -o 'pdp__oilprices' "$OUT/hole.html" | wc -l)"

echo "== /collection-builder?add=\$GOOD&tier=\$TIER =="
code=$(curl -s -o "$OUT/b1.html" -w "%{http_code}" --compressed "$BASE/collection-builder?add=$GOOD&tier=$TIER")
echo "status=$code  seededSlug=$(grep -c "$GOOD" "$OUT/b1.html")  filledSlots=$(grep -o 'slot is-filled' "$OUT/b1.html" | wc -l)"

echo "== /collection-builder/oils?add=\$OIL&type=niche =="
code=$(curl -s -o "$OUT/b2.html" -w "%{http_code}" --compressed "$BASE/collection-builder/oils?add=$OIL&type=niche")
echo "status=$code  filledSlots=$(grep -o 'slot is-filled' "$OUT/b2.html" | wc -l)  sizeButtons=$(grep -o 'sizebtn__label' "$OUT/b2.html" | wc -l)  monoCards=$(grep -o 'dnoimg--builder' "$OUT/b2.html" | wc -l)  surprise=$(grep -c 'Surprise me' "$OUT/b2.html")"

echo "== other routes =="
for r in "/" "/checkout" "/discovery-sets" "/brands" "/search?q=oud" "/gift-cards"; do
  printf '%-22s' "$r"
  curl -s -o /dev/null -w "status=%{http_code}\n" --compressed "$BASE$r"
done
