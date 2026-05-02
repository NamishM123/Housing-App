import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { budget, roomWidth, roomLength } = req.body;

  const prompt = `Someone has $${budget} for a ${roomWidth}x${roomLength} ft room in SLO County.
Generate a prioritized furniture shopping list.

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
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: 'You are a budget interior design assistant. Respond only with valid JSON.',
      messages: [{ role: 'user', content: prompt }],
    });
    res.json(JSON.parse(message.content[0].text.trim()));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
