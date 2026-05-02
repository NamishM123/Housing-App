import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
