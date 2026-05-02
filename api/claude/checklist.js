import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { jobTitle, salary, savings, roommates, hasCar, lifestyle, neighborhood } = req.body;

  const prompt = `Generate a personalized move-in checklist for a ${jobTitle} moving to ${neighborhood} in SLO County.
Context: salary $${salary}, savings $${savings}, roommates: ${roommates}, has car: ${hasCar}, lifestyle: ${lifestyle}.

Respond ONLY with JSON:
{
  "categories": [
    { "name": "category name", "items": ["item1", "item2"] }
  ]
}
Include 4-5 categories: Admin/Paperwork, Utilities Setup, Home Essentials, Transport, Social/Fun. Tailor to context (car → parking permit; no roommates → router setup; etc).`;

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
