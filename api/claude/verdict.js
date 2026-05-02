import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM = `You are a brutally honest financial advisor specializing in California housing markets.
Always respond with valid JSON matching exactly the structure requested. No markdown, no prose outside JSON.`;

function formatProximityPrefs(prefs) {
  if (!prefs || !Object.keys(prefs).length) return 'No specific proximity requirements';
  const labels = { groceries: 'Grocery store', hospital: 'Hospital', beach: 'Beach', dining: 'Restaurants', gym: 'Gym', trails: 'Hiking trails', downtown: 'Downtown SLO', freeway: 'Freeway' };
  return Object.entries(prefs)
    .filter(([, v]) => v !== 'any')
    .map(([k, v]) => `${labels[k] || k}: ${v === 'walking' ? 'within walking distance (<1 mile)' : 'short drive (5-10 min)'}`)
    .join('; ') || 'No specific proximity requirements';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const {
    jobTitle, salary, savings, roommates, hasCar, hasPet,
    lifestyle, workSetup, workLocation, mustHaves, proximityPrefs, timeline,
    neighborhood, neighborhoodStats,
  } = req.body;

  const monthlyIncome = Math.round(salary / 12);
  const rent = roommates > 0
    ? Math.round(neighborhoodStats.avgRent / (roommates + 1))
    : neighborhoodStats.avgRent;
  const rentPct = Math.round((rent / monthlyIncome) * 100);

  const prompt = `A ${jobTitle} earning $${salary.toLocaleString()}/year (≈$${monthlyIncome.toLocaleString()}/mo) is evaluating ${neighborhood.name}, SLO County.

Financial profile:
- Savings: $${savings.toLocaleString()}
- Roommates: ${roommates} | Has car: ${hasCar} | Has pet: ${hasPet || false}
- Rent share: $${rent}/mo (${rentPct}% of gross income)
- Walk score: ${neighborhoodStats.walkScore}/100

Work & lifestyle:
- Work setup: ${workSetup || 'hybrid'} | Works at/near: ${workLocation || 'remote'}
- Eating out: ${lifestyle} | Move-in: ${timeline || 'asap'}
- Unit must-haves: ${(mustHaves || []).join(', ') || 'none'}

Location priorities:
${formatProximityPrefs(proximityPrefs)}

Respond ONLY with this JSON (be specific — reference their job, salary, pet/car, work location, and the amenity proximity fit for ${neighborhood.name}):
{
  "assessment": "3 brutally honest sentences. Mention how well ${neighborhood.name} fits their work location and proximity needs.",
  "healthScore": <integer 1-10>,
  "monthlyBudget": {
    "rent": <number>,
    "utilities": <number>,
    "food": <number>,
    "transport": <number>,
    "funMoney": <number>,
    "savings": <number>,
    "total": <number>
  },
  "tips": ["specific actionable tip 1", "specific tip 2", "specific tip 3"]
}`;

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });
    res.json(JSON.parse(completion.choices[0].message.content));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
