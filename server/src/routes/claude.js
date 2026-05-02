import { Router } from 'express';
import OpenAI from 'openai';

const router = Router();
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const VERDICT_SYSTEM = `You are a brutally honest financial advisor specializing in California housing markets.
Always respond with valid JSON matching exactly the structure requested. No markdown, no prose outside JSON.`;

router.post('/verdict', async (req, res) => {
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
- Has car: ${hasCar}, has pet: ${hasPet || false}
- Work setup: ${workSetup || 'hybrid'}, commute tolerance: ${commute || 'medium'}
- Eating out: ${lifestyle}, must-haves: ${mustHavesList}
- Move-in timeline: ${timeline || 'asap'}

Respond ONLY with this JSON:
{
  "assessment": "3 brutally honest sentences referencing their specific situation",
  "healthScore": <integer 1-10>,
  "monthlyBudget": { "rent": <n>, "utilities": <n>, "food": <n>, "transport": <n>, "funMoney": <n>, "savings": <n>, "total": <n> },
  "tips": ["tip1", "tip2", "tip3"]
}`;

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: VERDICT_SYSTEM }, { role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });
    res.json(JSON.parse(completion.choices[0].message.content));
  } catch (err) {
    console.error('OpenAI verdict error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/checklist', async (req, res) => {
  const {
    jobTitle, salary, savings, roommates, hasCar, hasPet,
    lifestyle, workSetup, mustHaves, timeline, neighborhood,
  } = req.body;

  const mustHavesList = (mustHaves || []).join(', ') || 'none';

  const prompt = `Generate a personalized move-in checklist for a ${jobTitle} moving to ${neighborhood} in SLO County.
Profile: salary $${salary}, savings $${savings}, roommates: ${roommates}, car: ${hasCar}, pet: ${hasPet || false}, work: ${workSetup || 'hybrid'}, must-haves: ${mustHavesList}, timeline: ${timeline || 'asap'}.

Respond ONLY with JSON:
{ "categories": [{ "name": "category name", "items": ["item1", "item2"] }] }
Include 5-6 categories tailored to their context.`;

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
  "items": [{ "name": "item", "estimatedCost": <n>, "priority": "essential|recommended|nice-to-have", "reason": "one sentence" }],
  "totalEstimate": <n>,
  "summary": "one sentence advice"
}
List 6-8 items. Keep costs realistic (IKEA/Amazon/Facebook Marketplace).`;

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
