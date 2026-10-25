// Shared helpers. Files starting with "_" are not exposed as routes by Vercel.
const TOKEN = () => process.env.TMDB_TOKEN || '';

async function getJSON(url, headers = {}) {
  const res = await fetch(url, { headers: { Accept: 'application/json', ...headers } });
  if (!res.ok) throw new Error(`Upstream ${res.status}`);
  return res.json();
}

function tmdb(path, params = {}) {
  const t = TOKEN(), headers = {};
  if (t.length > 40) headers.Authorization = `Bearer ${t}`;   // v4 read access token
  else params = { ...params, api_key: t };                     // v3 API key
  return getJSON(`https://api.themoviedb.org/3${path}?${new URLSearchParams(params)}`, headers);
}

const jikan = (path, params = {}) =>
  getJSON(`https://api.jikan.moe/v4${path}?${new URLSearchParams(params)}`);

const genreCache = {};
async function genreMap(kind) {
  if (genreCache[kind]) return genreCache[kind];
  const data = await tmdb(`/genre/${kind}/list`);
  return (genreCache[kind] = Object.fromEntries((data.genres || []).map(g => [g.id, g.name])));
}

function normTmdb(r, kind, genres) {
  const year = (r.release_date || r.first_air_date || '').slice(0, 4);
  return {
    id: r.id, title: r.title || r.name || 'Untitled',
    meta: kind === 'tv' ? (year ? `First aired ${year}` : 'Series') : year,
    genre: (r.genre_ids || []).slice(0, 2).map(id => genres[id]).filter(Boolean).join(' / '),
    rating: Math.round((r.vote_average || 0) * 10) / 10, source: 'TMDB',
    poster: r.poster_path ? `https://image.tmdb.org/t/p/w342${r.poster_path}` : '',
    backdrop: r.backdrop_path ? `https://image.tmdb.org/t/p/w1280${r.backdrop_path}` : '',
    desc: r.overview || '',
  };
}

function normJikan(a) {
  const eps = a.episodes ? `${a.episodes} eps` : '';
  return {
    id: a.mal_id, title: a.title_english || a.title,
    meta: [a.type, eps].filter(Boolean).join(', '),
    genre: (a.genres || []).slice(0, 2).map(g => g.name).join(' / '),
    rating: Math.round((a.score || 0) * 10) / 10, source: 'MAL',
    poster: a.images?.jpg?.large_image_url || a.images?.jpg?.image_url || '',
    backdrop: '', desc: a.synopsis || '',
  };
}

async function listMovies(path, params) {
  const [data, g] = await Promise.all([tmdb(path, params), genreMap('movie')]);
  return (data.results || []).slice(0, 15).map(r => normTmdb(r, 'movie', g));
}
async function listSeries(path, params) {
  const [data, g] = await Promise.all([tmdb(path, params), genreMap('tv')]);
  return (data.results || []).slice(0, 15).map(r => normTmdb(r, 'tv', g));
}
async function listAnime(path, params) {
  const data = await jikan(path, params);
  return (data.data || []).slice(0, 15).map(normJikan);
}

// Vercel's CDN caches the response, so the upstream APIs are hit rarely.
function send(res, status, body, cache = true) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (cache && status === 200) res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
  res.status(status).send(JSON.stringify(body));
}

const tokenMissing = () => !TOKEN();

module.exports = { listMovies, listSeries, listAnime, send, tokenMissing };
