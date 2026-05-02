import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM = `You are a brutally honest financial advisor specializing in California housing markets.
You give clear, specific, no-nonsense advice about whether someone can afford to live somewhere.
Always respond with valid JSON matching exactly the structure requested. No markdown, no prose outside JSON.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const {
    jobTitle, salary, savings, roommates, hasCar, hasPet,
    lifestyle, workSetup, commute, mustHaves, timeline,
    neighborhood, neighborhoodStats,
  } = req.body;

  const monthlyIncome = Math.round(salary / 12);
  const rent = roommates > 0
    ? Math.round(neighborhoodStats.avgRent / (roommates + 1))
    : neighborhoodStats.avgRent;
  const rentPct = Math.round((rent / monthlyIncome) * 100);
  const mustHavesList = (mustHaves || []).join(', ') || 'none specified';

  const prompt = `A ${jobTitle} earning $${salary.toLocaleString()}/year (≈$${monthlyIncome.toLocaleString()}/mo) wants to live in ${neighborhood.name}, SLO County.

Financial profile:
- Savings: $${savings.toLocaleString()}
- Roommates: ${roommates}
- Rent share: $${rent}/mo (${rentPct}% of gross income)
- Walk score: ${neighborhoodStats.walkScore}/100

Lifestyle & preferences:
- Has car: ${hasCar}
- Has pet: ${hasPet || false}
- Work setup: ${workSetup || 'hybrid'}
- Commute tolerance: ${commute || 'medium'}
- Eating out: ${lifestyle}
- Must-haves: ${mustHavesList}
- Move-in timeline: ${timeline || 'asap'}

Respond ONLY with this JSON structure:
{
  "assessment": "3 brutally honest sentences referencing their specific situation — job, salary, neighborhood, pet/car/remote work if relevant",
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
  "tips": ["specific tip 1", "specific tip 2", "specific tip 3"]
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
