import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: 'You are a helpful moving assistant. Respond only with valid JSON.',
      messages: [{ role: 'user', content: prompt }],
    });
    res.json(JSON.parse(message.content[0].text.trim()));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
