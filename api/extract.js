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

RULES:
1. Identify each DISTINCT business card. If front and back are both visible, merge into ONE contact.
2. If a card lists multiple people, create one entry per person.
3. Extract ALL phone numbers. If multiple, join with "\\n".
4. email field: ONLY real email addresses (must match user@domain.com pattern). LINE IDs starting with @ (like @yang123) are NOT emails — put them in the line field. Never put LINE IDs, URLs, or social media handles in email.
5. line field: LINE ID (often starts with @) or LINE URL (line.me/...). Look for LINE logo or "LINE:" text. A handle starting with @ near a LINE logo is a LINE ID, not an email.
6. facebook field: Facebook URL or profile name. Check QR codes — if a QR code points to facebook.com or fb.com, put that URL here.
7. instagram field: Instagram handle or URL. Check QR codes — if a QR code points to instagram.com, put that URL here.
8. qrcode field: URLs from QR codes that are NOT Facebook, Instagram, or LINE. Leave empty if all QR codes are already categorized above.
9. For each card, estimate its bounding box in the FULL IMAGE as percentages (0-100): cardX, cardY, cardW, cardH.
10. If a headshot/portrait photo exists, also return faceX, faceY, faceSize.
11. For any OTHER contact info (LinkedIn, Twitter/X, WeChat, website, fax, etc.), put in "extras" array as {label, value}. Do NOT duplicate info already in core fields.
12. Do NOT repeat the same information in multiple fields. Each piece of info goes in exactly ONE field.
13. Slogans, mottos, and taglines (e.g. "一路走來 在地打拼") go ONLY in the note field once. Do NOT put them in titles, org, business, or any other field.

Return JSON array. Each object: name, chineseName, titles, org, phone, email, line, facebook, instagram, address, business, qrcode, note, extras, cardX, cardY, cardW, cardH (+ faceX, faceY, faceSize if portrait exists). Empty string for missing text fields. extras is an array (empty [] if none).
Return ONLY valid JSON. No markdown.`,
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
