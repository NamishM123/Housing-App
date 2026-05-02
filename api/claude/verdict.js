import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `You are a brutally honest financial advisor specializing in California housing markets.
You give clear, specific, no-nonsense advice about whether someone can afford to live somewhere.
Always respond with valid JSON matching exactly the structure requested. No markdown, no prose outside JSON.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { jobTitle, salary, savings, roommates, hasCar, lifestyle, neighborhood, neighborhoodStats } = req.body;

  const monthlyIncome = Math.round(salary / 12);
  const rent = roommates > 0
    ? Math.round(neighborhoodStats.avgRent / (roommates + 1))
    : neighborhoodStats.avgRent;
  const rentPct = Math.round((rent / monthlyIncome) * 100);

  const prompt = `A ${jobTitle} earning $${salary.toLocaleString()}/year (≈$${monthlyIncome.toLocaleString()}/mo) wants to live in ${neighborhood.name}, SLO County.
Details:
- Savings: $${savings.toLocaleString()}
- Roommates: ${roommates}
- Has car: ${hasCar}
- Eating out: ${lifestyle}
- Their share of avg rent: $${rent}/mo (${rentPct}% of income)
- Avg walk score: ${neighborhoodStats.walkScore}/100

Respond ONLY with this JSON structure:
{
  "assessment": "3 brutally honest sentences about their situation",
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
  "tips": ["tip1", "tip2", "tip3"]
}`;

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYSTEM,
      messages: [{ role: 'user', content: prompt }],
    });
    res.json(JSON.parse(message.content[0].text.trim()));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
