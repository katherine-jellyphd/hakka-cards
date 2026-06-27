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

  const secret = req.headers['x-app-token'];
  if (secret !== (process.env.API_SECRET || 'hakka-cards-2026')) {
    return res.status(401).json({ error: '未授權' });
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
        model: 'claude-sonnet-4-6',
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
5. If there are QR codes on the card, read the URL they encode.
6. For each card, estimate its bounding box in the FULL IMAGE as percentages (0-100): cardX (left edge), cardY (top edge), cardW (width), cardH (height). This is critical for cropping individual card thumbnails.
7. If a person's headshot/portrait photo is visible on the card, also return faceX, faceY (face center as % of full image) and faceSize (face width as % of image width).
8. Extract ALL phone numbers found on the card. If multiple, join with newline.
9. For any additional contact info beyond the core fields (LINE ID, Facebook, Instagram, LinkedIn, Twitter/X, WeChat, website, fax, etc.), return them in an "extras" array of {label, value} objects. Use descriptive Chinese labels like "LINE", "Facebook", "傳真" etc.
For each person return: name, chineseName, titles, org, phone, email, address, business, qrcode, note, extras, cardX, cardY, cardW, cardH. Also include faceX, faceY, faceSize only if a portrait photo exists. Use empty string for text fields if not found. extras should be an array (empty array if none).
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
