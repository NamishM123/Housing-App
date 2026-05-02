import { Router } from 'express';
import axios from 'axios';

const router = Router();

const FALLBACK_SCORES = {
  'downtown-slo':   { walk: 88, transit: 42, bike: 72 },
  'cal-poly':       { walk: 65, transit: 35, bike: 68 },
  'edna-valley':    { walk: 12, transit: 8,  bike: 18 },
  'los-osos':       { walk: 42, transit: 15, bike: 45 },
  'morro-bay':      { walk: 55, transit: 20, bike: 58 },
  'atascadero':     { walk: 38, transit: 18, bike: 32 },
  'arroyo-grande':  { walk: 48, transit: 22, bike: 40 },
  'pismo-beach':    { walk: 62, transit: 25, bike: 55 },
};

router.get('/score', async (req, res) => {
  const { address, lat, lon, neighborhoodId } = req.query;
  const apiKey = process.env.WALKSCORE_API_KEY;

  if (!apiKey || apiKey === 'your_walkscore_key_here') {
    const fallback = FALLBACK_SCORES[neighborhoodId] || { walk: 50, transit: 25, bike: 40 };
    return res.json({ ...fallback, source: 'fallback' });
  }

  try {
    const response = await axios.get('https://api.walkscore.com/score', {
      params: {
        format: 'json',
        address,
        lat,
        lon,
        transit: 1,
        bike: 1,
        wsapikey: apiKey,
      },
    });

    const { walkscore, transit, bike } = response.data;
    res.json({
      walk: walkscore,
      transit: transit?.score || 0,
      bike: bike?.score || 0,
      source: 'walkscore',
    });
  } catch (err) {
    console.error('WalkScore error, using fallback:', err.message);
    const fallback = FALLBACK_SCORES[neighborhoodId] || { walk: 50, transit: 25, bike: 40 };
    res.json({ ...fallback, source: 'fallback' });
  }
});

export default router;
