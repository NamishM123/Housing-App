import { Router } from 'express';
import axios from 'axios';

const router = Router();

// Fallback data keyed by zip code for SLO County neighborhoods
const FALLBACK_RENTS = {
  '93401': { avgRent: 2200, medianRent: 2100, zip: '93401', city: 'San Luis Obispo' },
  '93405': { avgRent: 2400, medianRent: 2350, zip: '93405', city: 'San Luis Obispo (Cal Poly)' },
  '93420': { avgRent: 1950, medianRent: 1900, zip: '93420', city: 'Arroyo Grande' },
  '93422': { avgRent: 1800, medianRent: 1750, zip: '93422', city: 'Atascadero' },
  '93402': { avgRent: 2100, medianRent: 2050, zip: '93402', city: 'Los Osos' },
  '93442': { avgRent: 2300, medianRent: 2200, zip: '93442', city: 'Morro Bay' },
  '93449': { avgRent: 2500, medianRent: 2400, zip: '93449', city: 'Pismo Beach' },
  '93424': { avgRent: 1900, medianRent: 1850, zip: '93424', city: 'Edna Valley' },
};

router.get('/rent/:zip', async (req, res) => {
  const { zip } = req.params;
  const apiKey = process.env.RENTCAST_API_KEY;

  if (!apiKey || apiKey === 'your_rentcast_key_here') {
    return res.json({ ...FALLBACK_RENTS[zip] || FALLBACK_RENTS['93401'], source: 'fallback' });
  }

  try {
    const response = await axios.get(
      `https://api.rentcast.io/v1/avm/rent/long-term`,
      {
        params: { zipCode: zip, bedrooms: 1, propertyType: 'Apartment' },
        headers: { 'X-Api-Key': apiKey },
      }
    );

    const { rent, rentRangeLow, rentRangeHigh } = response.data;
    res.json({
      avgRent: Math.round(rent),
      medianRent: Math.round(rent),
      rentLow: Math.round(rentRangeLow),
      rentHigh: Math.round(rentRangeHigh),
      zip,
      source: 'rentcast',
    });
  } catch (err) {
    console.error('RentCast error, using fallback:', err.message);
    res.json({ ...FALLBACK_RENTS[zip] || FALLBACK_RENTS['93401'], source: 'fallback' });
  }
});

router.get('/all', async (_req, res) => {
  res.json(Object.values(FALLBACK_RENTS));
});

// Proxy the listings endpoint to the same logic as the Vercel function
router.get('/listings', async (req, res) => {
  const { zip, city } = req.query;
  const apiKey = process.env.RENTCAST_API_KEY;
  const citySlug = (city || 'San Luis Obispo').toLowerCase().replace(/\s+/g, '-');
  const urls = {
    zillow: `https://www.zillow.com/${citySlug}-ca-${zip}/rentals/`,
    apartments: `https://www.apartments.com/${citySlug}-ca/${zip}/`,
    craigslist: `https://slo.craigslist.org/search/apa?postal=${zip}`,
  };

  if (apiKey && apiKey !== 'your_rentcast_key_here') {
    try {
      const response = await axios.get('https://api.rentcast.io/v1/listings/rental/long-term', {
        params: { zipCode: zip, status: 'Active', limit: 8 },
        headers: { 'X-Api-Key': apiKey },
      });
      const extractPhotos = (l) => {
        const sources = [l.photos, l.images, l.media, l.mlsListing?.photos];
        const all = [];
        for (const arr of sources) {
          if (!Array.isArray(arr)) continue;
          for (const p of arr) {
            if (typeof p === 'string') all.push(p);
            else if (p?.url) all.push(p.url);
            else if (p?.href) all.push(p.href);
          }
        }
        return all;
      };
      const listings = (response.data || []).map(l => {
        const photos = extractPhotos(l);
        return {
          id: l.id, address: l.formattedAddress, city: l.city, zip: l.zipCode,
          price: l.price, beds: l.bedrooms, baths: l.bathrooms, sqft: l.squareFootage,
          lat: l.latitude, lng: l.longitude, type: l.propertyType,
          available: l.listedDate ? new Date(l.listedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Now',
          features: [], petFriendly: false, image: photos[0] || null, photos,
          listingUrl: l.listingUrl || null,
        };
      });
      return res.json({ listings, urls, source: 'rentcast' });
    } catch (err) {
      console.error('RentCast listings error:', err.message);
    }
  }

  // Inline fallback (abbreviated — full set is in the Vercel function)
  const FALLBACK = {
    '93401': [
      { id: 'dl-1', address: '785 Higuera St', city: 'San Luis Obispo', zip, price: 2100, beds: 1, baths: 1, sqft: 680, lat: 35.2808, lng: -120.6602, type: 'Apartment', available: 'Now', features: ['Parking', 'AC'], petFriendly: false },
      { id: 'dl-2', address: '1142 Marsh St',   city: 'San Luis Obispo', zip, price: 2350, beds: 2, baths: 1, sqft: 950, lat: 35.2795, lng: -120.6630, type: 'Apartment', available: 'Jun 1', features: ['In-unit laundry', 'Parking'], petFriendly: true },
    ],
    '93405': [
      { id: 'cp-1', address: '1820 California Blvd', city: 'San Luis Obispo', zip, price: 2200, beds: 1, baths: 1, sqft: 700, lat: 35.2970, lng: -120.6620, type: 'Apartment', available: 'Now', features: ['Pool', 'Parking'], petFriendly: false },
    ],
  };
  const listings = (FALLBACK[zip] || FALLBACK['93401']).map(l => ({ ...l, urls }));
  res.json({ listings, urls, source: 'fallback' });
});

export default router;
