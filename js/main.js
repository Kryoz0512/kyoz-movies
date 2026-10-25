const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Poster image; falls back to the title text when the file is missing
function posterHTML(item) {
  return `<div class="poster"><img src="${esc(item.poster)}" alt="${esc(item.title)}" loading="lazy"
    onerror="this.parentNode.textContent=this.alt"></div>`;
}

/* HERO + THUMBNAILS */
function setHero(i) {
  const f = FEATURED[i];
  $('#heroTitle').textContent = f.title.toUpperCase();
  $('#heroDesc').textContent = f.desc;
  $('#heroRating').textContent = f.rating;
  $('#heroBg').style.backgroundImage = `url('${f.backdrop}'), linear-gradient(135deg,#0d3b4f,#1a1a40 60%,#3a0d2e)`;
  document.querySelectorAll('#thumbs button').forEach((b, n) => b.classList.toggle('active', n === i));
}
$('#thumbs').innerHTML = FEATURED.map((f, i) =>
  `<button aria-label="${esc(f.title)}" data-i="${i}">${posterHTML(f)}</button>`).join('');
$('#thumbs').addEventListener('click', e => {
  const b = e.target.closest('button'); if (b) setHero(+b.dataset.i);
});
setHero(0);

/* ROWS + SEARCH */
function renderRows(filter = '') {
  const q = filter.trim().toLowerCase();
  const match = x => x.title.toLowerCase().includes(q);
  $('#moviesRow').innerHTML = MOVIES.filter(match).map(m => `
    <article class="card">${posterHTML(m)}
      <strong>${esc(m.title)}</strong>
      <span>${m.year} &nbsp; ${esc(m.length)}</span>
      <span>${esc(m.genre)}</span>
      <span class="imdb">IMDb Rating ${m.rating} ★</span>
    </article>`).join('') || '<p style="padding-left:6vw">No movies found.</p>';
  $('#seriesRow').innerHTML = SERIES.filter(match).map(s => `
    <article class="card">${posterHTML(s)}
      <strong>${esc(s.title)}</strong>
      <span>${esc(s.season)}</span>
      <span>${esc(s.genre)}</span>
      <span class="imdb">IMDb Rating ${s.rating} ★</span>
    </article>`).join('') || '<p style="padding-left:6vw">No series found.</p>';
  $('#animeRow').innerHTML = ANIME.filter(match).map(a => `
    <article class="card">${posterHTML(a)}
      <strong>${esc(a.title)}</strong>
      <span>${esc(a.season)}</span>
      <span>${esc(a.genre)}</span>
      <span class="imdb">IMDb Rating ${a.rating} ★</span>
    </article>`).join('') || '<p style="padding-left:6vw">No anime found.</p>';
}
renderRows();
$('#searchInput').addEventListener('input', e => renderRows(e.target.value));

document.querySelectorAll('.slider .arrow').forEach(btn =>
  btn.addEventListener('click', () => {
    const row = document.getElementById(btn.dataset.target);
    row.scrollBy({ left: (btn.classList.contains('left') ? -1 : 1) * 340 });
  }));

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

/* FORM: posts to PHP if available, otherwise just adds the review locally */
$('#reviewForm').addEventListener('submit', async e => {
  e.preventDefault();
  const msg = $('#formMsg');
  if (!rate) { msg.textContent = 'Please select a rating.'; return; }
  const fd = new FormData(e.target); fd.append('rating', rate);
  const entry = { title: fd.get('title'), rating: rate, user: '@you', text: fd.get('feedback') };
  try { await fetch('php/submit_review.php', { method: 'POST', body: fd }); } catch {}
  REVIEWS.unshift(entry); rev = 0; showReview();
  e.target.reset(); rate = 0; stars.forEach(x => x.classList.remove('on'));
  msg.textContent = 'Thanks! Your review was added.';
});
