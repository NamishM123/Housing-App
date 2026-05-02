import axios from 'axios';

const CITIES = {
  'san-luis-obispo': 'san-luis-obispo',
  'san-francisco':   'san-francisco-bay-area',
  'los-angeles':     'los-angeles',
  'seattle':         'seattle',
};

const FALLBACK = {
  'san-luis-obispo': { housingIndex: 68,  costIndex: 82,  label: 'San Luis Obispo' },
  'san-francisco':   { housingIndex: 168, costIndex: 148, label: 'San Francisco' },
  'los-angeles':     { housingIndex: 128, costIndex: 118, label: 'Los Angeles' },
  'seattle':         { housingIndex: 112, costIndex: 108, label: 'Seattle' },
};

async function fetchCity(slug) {
  const base = `https://api.teleport.org/api/urban_areas/slug:${slug}`;
  const [details, scores] = await Promise.all([axios.get(`${base}/`), axios.get(`${base}/scores/`)]);
  const housing = scores.data.categories.find(c => c.name === 'Housing');
  const cost = scores.data.categories.find(c => c.name === 'Cost of Living');
  return {
    label: details.data.full_name,
    housingIndex: housing ? Math.round(housing.score_out_of_10 * 10) : null,
    costIndex: cost ? Math.round(cost.score_out_of_10 * 10) : null,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  try {
    const results = await Promise.all(
      Object.entries(CITIES).map(async ([key, slug]) => {
        try {
          return { key, ...(await fetchCity(slug)) };
        } catch {
          return { key, ...FALLBACK[key], source: 'fallback' };
        }
      })
    );
    res.json(results);
  } catch (err) {
    res.json(Object.entries(FALLBACK).map(([key, v]) => ({ key, ...v, source: 'fallback' })));
  }
}
