// GET /api/lists?type=featured|movies|series|anime
const { listMovies, listSeries, listAnime, send, tokenMissing } = require('./_lib');

module.exports = async (req, res) => {
  const type = req.query.type;
  try {
    if (type !== 'anime' && tokenMissing()) return send(res, 500, { error: 'TMDB_TOKEN is not set' }, false);
    switch (type) {
      case 'featured': {
        const items = await listMovies('/trending/movie/week');
        return send(res, 200, items.filter(i => i.backdrop && i.poster).slice(0, 7));
      }
      case 'movies': return send(res, 200, await listMovies('/movie/popular'));
      case 'series': return send(res, 200, await listSeries('/tv/popular'));
      case 'anime':  return send(res, 200, await listAnime('/top/anime', { limit: 15, sfw: 'true' }));
      default: return send(res, 400, { error: 'Unknown type' }, false);
    }
  } catch (e) {
    return send(res, 502, { error: 'Upstream API error' }, false);
  }
};
