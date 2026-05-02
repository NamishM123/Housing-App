import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const {
    jobTitle, salary, savings, roommates, hasCar, hasPet,
    lifestyle, workSetup, mustHaves, timeline, neighborhood,
  } = req.body;

  const mustHavesList = (mustHaves || []).join(', ') || 'none';

  const prompt = `Generate a personalized move-in checklist for a ${jobTitle} moving to ${neighborhood} in SLO County.

Profile:
- Salary: $${salary}, savings: $${savings}
- Roommates: ${roommates}, has car: ${hasCar}, has pet: ${hasPet || false}
- Work setup: ${workSetup || 'hybrid'}, eating out: ${lifestyle}
- Must-haves requested: ${mustHavesList}
- Move-in timeline: ${timeline || 'asap'}

Respond ONLY with JSON:
{
  "categories": [
    { "name": "category name", "items": ["item1", "item2"] }
  ]
}
Include 5-6 relevant categories. Tailor specifically: car → parking permit + smog check; pet → pet deposit + vet search; remote → desk setup + fast internet; no roommates → full router setup; tight timeline → priority items first.`;

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
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
