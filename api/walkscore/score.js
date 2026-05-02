import axios from 'axios';

const FALLBACK = {
  'downtown-slo':  { walk: 88, transit: 42, bike: 72 },
  'cal-poly':      { walk: 65, transit: 35, bike: 68 },
  'edna-valley':   { walk: 12, transit: 8,  bike: 18 },
  'los-osos':      { walk: 42, transit: 15, bike: 45 },
  'morro-bay':     { walk: 55, transit: 20, bike: 58 },
  'atascadero':    { walk: 38, transit: 18, bike: 32 },
  'arroyo-grande': { walk: 48, transit: 22, bike: 40 },
  'pismo-beach':   { walk: 62, transit: 25, bike: 55 },
};

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { address, lat, lon, neighborhoodId } = req.query;
  const apiKey = process.env.WALKSCORE_API_KEY;

  if (!apiKey || apiKey === 'your_walkscore_key_here') {
    return res.json({ ...(FALLBACK[neighborhoodId] || { walk: 50, transit: 25, bike: 40 }), source: 'fallback' });
  }

  try {
    const { data } = await axios.get('https://api.walkscore.com/score', {
      params: { format: 'json', address, lat, lon, transit: 1, bike: 1, wsapikey: apiKey },
    });
    res.json({ walk: data.walkscore, transit: data.transit?.score || 0, bike: data.bike?.score || 0, source: 'walkscore' });
  } catch (err) {
    res.json({ ...(FALLBACK[neighborhoodId] || { walk: 50, transit: 25, bike: 40 }), source: 'fallback' });
  }
}
