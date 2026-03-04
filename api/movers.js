// api/movers.js
// GET /api/movers
// Returns quotes for a fixed list of major symbols, sorted by % change

const SYMBOLS = [
  'AAPL','MSFT','NVDA','AMZN','TSLA','META','GOOGL','JPM',
  'GS','V','AMD','NFLX','BRK.B','XOM','LLY'
];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const key = process.env.FINNHUB_API_KEY;
  if (!key) {
    return res.status(500).json({ error: 'FINNHUB_API_KEY not set' });
  }

  try {
    // Fetch all in parallel
    const results = await Promise.allSettled(
      SYMBOLS.map(async (symbol) => {
        const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${key}`;
        const r = await fetch(url);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const q = await r.json();
        if (!q.c) throw new Error('no price');
        return {
          symbol,
          price:     q.c,
          change:    q.d,
          changePct: q.dp,
          high:      q.h,
          low:       q.l,
          open:      q.o,
          prevClose: q.pc
        };
      })
    );

    // Only return successful quotes
    const data = results
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value)
      .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct)); // biggest movers first

    return res.status(200).json(data);
  } catch (err) {
    console.error('movers error:', err.message);
    return res.status(502).json({ error: err.message });
  }
}
