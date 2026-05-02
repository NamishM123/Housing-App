import { Router } from 'express';
import OpenAI from 'openai';

const router = Router();
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const VERDICT_SYSTEM = `You are a brutally honest financial advisor specializing in California housing markets.
You give clear, specific, no-nonsense advice about whether someone can afford to live somewhere.
Always respond with valid JSON matching exactly the structure requested. No markdown, no prose outside JSON.`;

router.post('/verdict', async (req, res) => {
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
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: VERDICT_SYSTEM },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    });
    res.json(JSON.parse(completion.choices[0].message.content));
  } catch (err) {
    console.error('OpenAI verdict error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/checklist', async (req, res) => {
  const { jobTitle, salary, savings, roommates, hasCar, lifestyle, neighborhood } = req.body;

  const prompt = `Generate a personalized move-in checklist for a ${jobTitle} moving to ${neighborhood} in SLO County.
Context: salary $${salary}, savings $${savings}, roommates: ${roommates}, has car: ${hasCar}, lifestyle: ${lifestyle}.

Respond ONLY with JSON:
{
  "categories": [
    { "name": "category name", "items": ["item1", "item2"] }
  ]
}
Include 4-5 categories: Admin/Paperwork, Utilities Setup, Home Essentials, Transport, Social/Fun. Tailor to context.`;

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a helpful moving assistant. Respond only with valid JSON.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    });
    res.json(JSON.parse(completion.choices[0].message.content));
  } catch (err) {
    console.error('OpenAI checklist error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/furniture', async (req, res) => {
  const { budget, roomWidth, roomLength } = req.body;

  const prompt = `Someone has $${budget} for a ${roomWidth}x${roomLength} ft room in SLO County.

Respond ONLY with JSON:
{
  "items": [
    { "name": "item", "estimatedCost": <number>, "priority": "essential|recommended|nice-to-have", "reason": "one sentence" }
  ],
  "totalEstimate": <number>,
  "summary": "one sentence advice"
}
List 6-8 items ordered by priority. Keep costs realistic (IKEA/Amazon/Facebook Marketplace).`;

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a budget interior design assistant. Respond only with valid JSON.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    });
    res.json(JSON.parse(completion.choices[0].message.content));
  } catch (err) {
    console.error('OpenAI furniture error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
