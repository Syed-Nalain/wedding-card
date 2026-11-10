// Daily "keep awake" ping for the free Supabase project.
// Free Supabase projects pause after about a week with no activity; Vercel calls this once a day (see vercel.json).
// Needs two Vercel environment variables: SUPABASE_URL and SUPABASE_KEY (the same public key as in game-config.js).
module.exports = async (req, res) => {
  const url = (process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
  const key = process.env.SUPABASE_KEY || '';
  if (!url || !key) {
    res.status(200).json({ ok: false, skipped: 'SUPABASE_URL or SUPABASE_KEY is not set' });
    return;
  }
  const headers = { apikey: key };
  if (key.startsWith('eyJ')) headers.Authorization = `Bearer ${key}`;
  try {
    const r = await fetch(`${url}/rest/v1/game_scores?select=id&limit=1`, { headers });
    res.status(r.ok ? 200 : 502).json({ ok: r.ok, status: r.status });
  } catch (err) {
    res.status(502).json({ ok: false, error: String(err) });
  }
};
