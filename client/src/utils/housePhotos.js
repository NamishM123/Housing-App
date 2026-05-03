// Pre-generated pool of California / SLO-style residential exterior photos.
// These are stable Unsplash photo IDs (free, no auth required). Each listing
// is mapped deterministically from its ID so the same listing always shows
// the same set of photos across renders.

const HOUSE_PHOTOS = [
  // Mediterranean / Spanish-style California homes
  '1568605114967-8130f3a36994',
  '1570129477492-45c003edd2be',
  '1564013799919-ab600027ffc6',
  '1583608205776-bfd35f0d9f83',
  '1597047084897-51e81819a499',
  '1605276374104-dee2a0ed3cd6',
  '1576941089067-2de3c901e126',
  '1512917774080-9991f1c4c750',
  '1493809842364-78817add7ffb',
  '1600596542815-ffad4c1539a9',
  '1560448204-e02f11c3d0e2',
  '1613490493576-7fde63acd811',
  '1605146769289-440113cc3d00',
  '1502672260266-1c1ef2d93688',
  '1518780664697-55e3ad937233',
  '1523217582562-09d0def993a6',
  '1572120360610-d971b9d7767c',
  '1574362848149-11496d93a7c7',
  '1580587771525-78b9dba3b914',
  '1586023492125-27b2c045efd7',
];

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

const SIZES = {
  thumb: 'w=720&h=260&fit=crop&q=70',
  hero:  'w=1100&h=620&fit=crop&q=80',
};

// Deterministic photo for a listing. `offset` lets us pick neighbouring
// photos from the pool to build a multi-image gallery for the same listing.
export function pickHousePhoto(listing, offset = 0, size = 'hero') {
  const seed = hash((listing?.id ?? '') + (listing?.address ?? ''));
  const idx = (seed + offset) % HOUSE_PHOTOS.length;
  const id = HOUSE_PHOTOS[idx];
  const params = SIZES[size] || SIZES.hero;
  return `https://images.unsplash.com/photo-${id}?${params}&auto=format`;
}

// Build a small gallery of N distinct photos for a listing.
export function pickHouseGallery(listing, count = 4, size = 'hero') {
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push(pickHousePhoto(listing, i, size));
  }
  return out;
}
