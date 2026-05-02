import axios from 'axios';

const FALLBACK = {
  '93401': { avgRent: 2200, medianRent: 2100, city: 'San Luis Obispo' },
  '93405': { avgRent: 2400, medianRent: 2350, city: 'Cal Poly Area' },
  '93420': { avgRent: 1950, medianRent: 1900, city: 'Arroyo Grande' },
  '93422': { avgRent: 1800, medianRent: 1750, city: 'Atascadero' },
  '93402': { avgRent: 2100, medianRent: 2050, city: 'Los Osos' },
  '93442': { avgRent: 2300, medianRent: 2200, city: 'Morro Bay' },
  '93449': { avgRent: 2500, medianRent: 2400, city: 'Pismo Beach' },
  '93424': { avgRent: 1900, medianRent: 1850, city: 'Edna Valley' },
};

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { zip } = req.query;
  const apiKey = process.env.RENTCAST_API_KEY;

  if (!apiKey || apiKey === 'your_rentcast_key_here') {
    return res.json({ ...(FALLBACK[zip] || FALLBACK['93401']), zip, source: 'fallback' });
  }

  try {
    const { data } = await axios.get('https://api.rentcast.io/v1/avm/rent/long-term', {
      params: { zipCode: zip, bedrooms: 1, propertyType: 'Apartment' },
      headers: { 'X-Api-Key': apiKey },
    });
    res.json({
      avgRent: Math.round(data.rent),
      medianRent: Math.round(data.rent),
      rentLow: Math.round(data.rentRangeLow),
      rentHigh: Math.round(data.rentRangeHigh),
      zip,
      source: 'rentcast',
    });
  } catch (err) {
    res.json({ ...(FALLBACK[zip] || FALLBACK['93401']), zip, source: 'fallback' });
  }
}
