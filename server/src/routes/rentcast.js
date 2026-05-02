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

export default router;
