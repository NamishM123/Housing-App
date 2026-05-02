import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';

const router = Router();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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
- Area: ${neighborhood.name}

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
      system: VERDICT_SYSTEM,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content[0].text.trim();
    const json = JSON.parse(text);
    res.json(json);
  } catch (err) {
    console.error('Claude verdict error:', err.message);
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
    {
      "name": "category name",
      "items": ["item1", "item2", ...]
    }
  ]
}
Include 4-5 categories like Admin/Paperwork, Utilities Setup, Home Essentials, Transport, Social/Fun. Tailor items to their context (e.g. if has car → parking permit, if no roommates → router setup).`;

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: 'You are a helpful moving assistant. Respond only with valid JSON.',
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content[0].text.trim();
    const json = JSON.parse(text);
    res.json(json);
  } catch (err) {
    console.error('Claude checklist error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/furniture', async (req, res) => {
  const { budget, roomWidth, roomLength } = req.body;

  const prompt = `Someone has $${budget} remaining after move-in costs for a ${roomWidth}x${roomLength} ft room in SLO County.
Generate a prioritized furniture shopping list.

Respond ONLY with JSON:
{
  "items": [
    { "name": "item name", "estimatedCost": <number>, "priority": "essential|recommended|nice-to-have", "reason": "one sentence why" }
  ],
  "totalEstimate": <number>,
  "summary": "one sentence advice"
}
List 6-8 items ordered by priority. Keep costs realistic for budget furniture (IKEA/Amazon/Facebook Marketplace).`;

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: 'You are a budget interior design assistant. Respond only with valid JSON.',
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content[0].text.trim();
    const json = JSON.parse(text);
    res.json(json);
  } catch (err) {
    console.error('Claude furniture error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
