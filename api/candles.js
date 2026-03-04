// api/candles.js
// GET /api/candles?symbol=AAPL&resolution=15&days=30
// Returns OHLCV candle data from Finnhub

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const symbol     = (req.query.symbol || 'AAPL').toUpperCase().trim();
  const resolution = req.query.resolution || '15'; // 1,5,15,30,60,D,W,M
  const days       = Math.min(parseInt(req.query.days || '30', 10), 365);

  const key = process.env.FINNHUB_API_KEY;
  if (!key) {
    return res.status(500).json({ error: 'FINNHUB_API_KEY not set' });
  }

  const now  = Math.floor(Date.now() / 1000);
  const from = now - days * 86400;

  try {
    const url = `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=${resolution}&from=${from}&to=${now}&token=${key}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Finnhub responded ${r.status}`);
    const data = await r.json();

    if (data.s !== 'ok') {
      // 'no_data' means market closed or bad symbol
      return res.status(200).json({ symbol, candles: [], status: data.s });
    }

    // Zip arrays into candle objects
    const candles = data.t.map((t, i) => ({
      time:   t,
      open:   data.o[i],
      high:   data.h[i],
      low:    data.l[i],
      close:  data.c[i],
      volume: data.v[i]
    }));

    return res.status(200).json({ symbol, resolution, candles });
  } catch (err) {
    console.error('candles error:', err.message);
    return res.status(502).json({ error: err.message });
  }
}
