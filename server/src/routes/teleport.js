import { Router } from 'express';
import axios from 'axios';

const router = Router();

const CITY_SLUGS = {
  'san-luis-obispo': 'san-luis-obispo',
  'san-francisco':   'san-francisco-bay-area',
  'los-angeles':     'los-angeles',
  'seattle':         'seattle',
};

const FALLBACK_SCORES = {
  'san-luis-obispo': { housingIndex: 68,  costIndex: 82,  label: 'San Luis Obispo' },
  'san-francisco':   { housingIndex: 168, costIndex: 148, label: 'San Francisco' },
  'los-angeles':     { housingIndex: 128, costIndex: 118, label: 'Los Angeles' },
  'seattle':         { housingIndex: 112, costIndex: 108, label: 'Seattle' },
};

async function fetchCityData(slug) {
  const base = `https://api.teleport.org/api/urban_areas/slug:${slug}`;
  const [detailsRes, scoresRes] = await Promise.all([
    axios.get(`${base}/`),
    axios.get(`${base}/scores/`),
  ]);

  const categories = scoresRes.data.categories;
  const housing = categories.find(c => c.name === 'Housing');
  const costOfLiving = categories.find(c => c.name === 'Cost of Living');

  return {
    label: detailsRes.data.full_name,
    housingIndex: housing ? Math.round(housing.score_out_of_10 * 10) : null,
    costIndex: costOfLiving ? Math.round(costOfLiving.score_out_of_10 * 10) : null,
  };
}

router.get('/compare', async (_req, res) => {
  try {
    const results = await Promise.all(
      Object.entries(CITY_SLUGS).map(async ([key, slug]) => {
        try {
          const data = await fetchCityData(slug);
          return { key, ...data };
        } catch {
          return { key, ...FALLBACK_SCORES[key], source: 'fallback' };
        }
      })
    );
    res.json(results);
  } catch (err) {
    console.error('Teleport error:', err.message);
    res.json(Object.entries(FALLBACK_SCORES).map(([key, v]) => ({ key, ...v, source: 'fallback' })));
  }
});

export default router;
