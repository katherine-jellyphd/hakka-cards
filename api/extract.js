export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server missing ANTHROPIC_API_KEY' });
  }

  const { image } = req.body;
  if (!image) {
    return res.status(400).json({ error: 'Missing image data' });
  }

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: 'image/jpeg', data: image },
            },
            {
              type: 'text',
              text: `You are a business card scanner. This photo may contain ONE or MULTIPLE business cards.
1. Identify each DISTINCT business card.
2. For each card, extract contact info.
3. If front and back are both visible, merge into ONE contact.
4. If a card lists multiple people, create one entry per person.
For each person return: name, chineseName, titles, org, phone, email, address, business, note (empty string if not found).
Return ONLY a valid JSON array. No markdown.`,
            },
          ],
        }],
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return res.status(resp.status).json({ error: `Anthropic API error (${resp.status}): ${errText}` });
    }

    const data = await resp.json();
    const text = data.content?.map(c => c.text || '').join('') || '[]';
    const clean = text.replace(/```json|```/g, '').trim();

    let contacts;
    try {
      contacts = JSON.parse(clean);
    } catch {
      const m = clean.match(/\[[\s\S]*\]/);
      if (m) contacts = JSON.parse(m[0]);
      else throw new Error('Cannot parse API response');
    }

    return res.status(200).json({ contacts });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
