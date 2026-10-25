// GET /api/search?q=text  ->  { movies, series, anime }
const { listMovies, listSeries, listAnime, send, tokenMissing } = require('./_lib');

module.exports = async (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 80);
  if (q.length < 2) return send(res, 400, { error: 'Query too short' }, false);
  if (tokenMissing()) return send(res, 500, { error: 'TMDB_TOKEN is not set' }, false);
  const safe = p => p.catch(() => []);   // one failing source shouldn't break the rest
  const [movies, series, anime] = await Promise.all([
    safe(listMovies('/search/movie', { query: q })),
    safe(listSeries('/search/tv', { query: q })),
    safe(listAnime('/anime', { q, limit: 15, sfw: 'true' })),
  ]);
  send(res, 200, { movies, series, anime });
};
