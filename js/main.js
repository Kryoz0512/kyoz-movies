const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Live data replaces these once the PHP API responds. data.js is the offline fallback.
const store = { featured: FEATURED, movies: MOVIES, series: SERIES, anime: ANIME };
let usingApi = false;

async function api(params) {
  const { type, q } = params;
  const res = await fetch(type === 'search'
    ? '/api/search?' + new URLSearchParams({ q })
    : '/api/lists?' + new URLSearchParams({ type }));
  if (!res.ok) throw new Error('API ' + res.status);
  return res.json();
}

function posterHTML(item) {
  if (!item.poster) return `<div class="poster">${esc(item.title)}</div>`;
  return `<div class="poster"><img src="${esc(item.poster)}" alt="${esc(item.title)}" loading="lazy"
    onerror="this.parentNode.textContent=this.alt"></div>`;
}

/* HERO + THUMBNAILS */
function setHero(i) {
  const f = store.featured[i]; if (!f) return;
  $('#heroTitle').textContent = f.title.toUpperCase();
  const d = f.desc || '';
  $('#heroDesc').textContent = d.length > 260 ? d.slice(0, 257) + '…' : d;
  $('#heroRating').textContent = f.rating;
  $('#heroSource').textContent = f.source || '';
  $('#heroBg').style.backgroundImage = `${f.backdrop ? `url('${f.backdrop}'),` : ''} linear-gradient(135deg,#0d3b4f,#1a1a40 60%,#3a0d2e)`;
  document.querySelectorAll('#thumbs button').forEach((b, n) => b.classList.toggle('active', n === i));
}
function renderHero() {
  $('#thumbs').innerHTML = store.featured.map((f, n) =>
    `<button aria-label="${esc(f.title)}" data-i="${n}">${posterHTML(f)}</button>`).join('');
  setHero(0);
}
$('#thumbs').addEventListener('click', e => {
  const b = e.target.closest('button'); if (b) setHero(+b.dataset.i);
});

/* ROWS */
function cardHTML(c) {
  const meta = c.meta ?? c.season ?? [c.year, c.length].filter(Boolean).join('  ');
  return `<article class="card">${posterHTML(c)}
    <strong>${esc(c.title)}</strong>
    <span>${esc(meta)}</span>
    <span>${esc(c.genre)}</span>
    ${c.rating ? `<span class="imdb">${esc(c.source || 'Rating')} ${c.rating} ★</span>` : ''}
  </article>`;
}
function fillRow(id, items, empty) {
  $('#' + id).innerHTML = items.length ? items.map(cardHTML).join('')
    : `<p style="padding-left:6vw">${empty}</p>`;
}
function renderRows(data = store) {
  fillRow('moviesRow', data.movies, 'No movies found.');
  fillRow('seriesRow', data.series, 'No series found.');
  fillRow('animeRow', data.anime, 'No anime found.');
}

document.querySelectorAll('.slider .arrow').forEach(btn =>
  btn.addEventListener('click', () => {
    document.getElementById(btn.dataset.target)
      .scrollBy({ left: (btn.classList.contains('left') ? -1 : 1) * 340 });
  }));

/* LOAD */
async function load() {
  ['moviesRow', 'seriesRow', 'animeRow'].forEach(id => $('#' + id).innerHTML = '<p style="padding-left:6vw">Loading…</p>');
  const [f, m, s, a] = await Promise.allSettled(
    ['featured', 'movies', 'series', 'anime'].map(type => api({ type })));
  // Use each live list when it worked; otherwise keep the sample data for that section.
  if (f.status === 'fulfilled' && f.value.length) store.featured = f.value;
  if (m.status === 'fulfilled' && m.value.length) store.movies = m.value;
  if (s.status === 'fulfilled' && s.value.length) store.series = s.value;
  if (a.status === 'fulfilled' && a.value.length) store.anime = a.value;
  usingApi = [f, m, s, a].some(r => r.status === 'fulfilled');
  $('#apiNote').textContent = [f, m, s, a].every(r => r.status === 'fulfilled') ? ''
    : 'Some sections show sample data. Check that TMDB_TOKEN is set (Vercel env var, or .env with `vercel dev`).';
  renderHero(); renderRows();
}

/* SEARCH (live results from the API when available; filters sample data otherwise) */
let timer;
$('#searchInput').addEventListener('input', e => {
  clearTimeout(timer);
  const q = e.target.value.trim();
  timer = setTimeout(async () => {
    if (q.length < 2) return renderRows();
    if (usingApi) {
      try { return renderRows(await api({ type: 'search', q })); } catch {}
    }
    const match = x => x.title.toLowerCase().includes(q.toLowerCase());
    renderRows({ movies: store.movies.filter(match), series: store.series.filter(match), anime: store.anime.filter(match) });
  }, 350);
});

/* REVIEW SLIDER */
let rev = 0;
function showReview() {
  const r = REVIEWS[rev];
  $('#reviewBody').innerHTML = `<h4>${esc(r.title.toUpperCase())}</h4><p>${esc(r.text)}</p>
    <div class="stars-fixed" aria-label="${r.rating} of 5 stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div>
    <small>${esc(r.user)}</small>`;
}
$('#revPrev').onclick = () => { rev = (rev - 1 + REVIEWS.length) % REVIEWS.length; showReview(); };
$('#revNext').onclick = () => { rev = (rev + 1) % REVIEWS.length; showReview(); };
showReview();

/* STAR PICKER */
let rate = 0;
const stars = [...document.querySelectorAll('#stars i')];
stars.forEach(s => s.addEventListener('click', () => {
  rate = +s.dataset.v;
  stars.forEach(x => x.classList.toggle('on', +x.dataset.v <= rate));
}));

/* REVIEW FORM */
$('#reviewForm').addEventListener('submit', async e => {
  e.preventDefault();
  const msg = $('#formMsg');
  if (!rate) { msg.textContent = 'Please select a rating.'; return; }
  const fd = new FormData(e.target); fd.append('rating', rate);
  const entry = { title: fd.get('title'), rating: rate, user: '@you', text: fd.get('feedback') };
  REVIEWS.unshift(entry); rev = 0; showReview();
  e.target.reset(); rate = 0; stars.forEach(x => x.classList.remove('on'));
  msg.textContent = 'Thanks! Your review was added (shown until you refresh).';
});

load();
