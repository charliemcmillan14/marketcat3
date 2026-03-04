// api/news.js
// GET /api/news?symbol=AAPL&days=7
// Returns company news from Finnhub for the last N days

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const symbol = (req.query.symbol || '').toUpperCase().trim();
  const days   = Math.min(parseInt(req.query.days || '7', 10), 30);

  if (!symbol) {
    return res.status(400).json({ error: 'symbol param required' });
  }

  const key = process.env.FINNHUB_API_KEY;
  if (!key) {
    return res.status(500).json({ error: 'FINNHUB_API_KEY not set' });
  }

  const to       = new Date();
  const from     = new Date(Date.now() - days * 86400000);
  const toStr    = to.toISOString().split('T')[0];
  const fromStr  = from.toISOString().split('T')[0];

  try {
    const url = `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(symbol)}&from=${fromStr}&to=${toStr}&token=${key}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Finnhub responded ${r.status}`);
    const data = await r.json();

    if (!Array.isArray(data)) {
      return res.status(200).json({ symbol, articles: [] });
    }

    // Return max 20 articles, most recent first
    const articles = data
      .sort((a, b) => b.datetime - a.datetime)
      .slice(0, 20)
      .map(a => ({
        headline: a.headline,
        summary:  a.summary,
        url:      a.url,
        source:   a.source,
        datetime: a.datetime,
        image:    a.image || null
      }));

    return res.status(200).json({ symbol, articles });
  } catch (err) {
    console.error('news error:', err.message);
    return res.status(502).json({ error: err.message });
  }
}
