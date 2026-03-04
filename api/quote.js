// api/quote.js
// GET /api/quote?symbol=AAPL
// Returns Finnhub real-time quote for a single symbol

export default async function handler(req, res) {
  // CORS headers so the browser can call this from any origin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const symbol = (req.query.symbol || '').toUpperCase().trim();
  if (!symbol) {
    return res.status(400).json({ error: 'symbol param required' });
  }

  const key = process.env.FINNHUB_API_KEY;
  if (!key) {
    return res.status(500).json({ error: 'FINNHUB_API_KEY not set in environment' });
  }

  try {
    const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${key}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Finnhub responded ${r.status}`);
    const data = await r.json();

    // Finnhub returns { c, d, dp, h, l, o, pc, t }
    // c = current, d = change, dp = change%, h = high, l = low, o = open, pc = prev close
    if (!data.c || data.c === 0) {
      return res.status(404).json({ error: `No data for symbol: ${symbol}` });
    }

    return res.status(200).json({
      symbol,
      price:    data.c,
      change:   data.d,
      changePct: data.dp,
      high:     data.h,
      low:      data.l,
      open:     data.o,
      prevClose: data.pc,
      timestamp: data.t
    });
  } catch (err) {
    console.error('quote error:', err.message);
    return res.status(502).json({ error: err.message });
  }
}
