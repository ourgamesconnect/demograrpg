// ŻELAZNA KORONA (nazwa robocza) — Panel główny (prototyp wizualny, dane przykładowe)
'use strict';
const $ = s => document.querySelector(s);
const rnd = (a, b) => a + Math.random() * (b - a);
const fmt = n => Math.round(n).toLocaleString('pl-PL');
const fmtHMS = sec => { sec = Math.max(0, Math.floor(sec)); return [Math.floor(sec / 3600), Math.floor(sec % 3600 / 60), sec % 60].map(v => String(v).padStart(2, '0')).join(':'); };

// ---- stan przykładowy (docelowo z serwera) ----
const P = {
  name: 'Gracz', guild: 'Strażnicy Zmierzchu', server: 'Serwer Wschód', lvl: 27, xp: 0.62, power: 4380, gold: 128450, glory: 3120,
  bag: 38, bagMax: 60, weapon: '🗡️', style: 'Miecz · cięcia', armor: 'Pancerz średni', set: 'Zestaw 3/6',
  sessions: { exp: { on: false, map: 'Wrogie mosty' }, gather: { on: true, loc: 'Jezioro', left: 9420 }, craft: { on: false } },
};
let EXPTAB = null;

// ---- pora dnia ----
function todOf(d) { const h = d.getHours() + d.getMinutes() / 60; return h >= 5 && h < 8 ? 'dawn' : h >= 8 && h < 17 ? 'day' : h >= 17 && h < 20 ? 'dusk' : 'night'; }
function placeOrb(d) {
  const h = d.getHours() + d.getMinutes() / 60, day = h >= 6 && h < 20, p = day ? (h - 6) / 14 : ((h + 4) % 24) / 10;
  const o = $('#orb'); o.style.left = (8 + 84 * p) + '%'; o.style.top = (40 - 30 * Math.sin(Math.PI * Math.min(1, p))) + '%';
}

// ---- panorama miasta (SVG generowane) ----
function buildSkyline() {
  const svg = $('#skyline'); let out = '';
  const layer = (cls, base, minH, maxH, minW, maxW, windows) => {
    let x = -20, g = '';
    while (x < 1640) {
      const w = rnd(minW, maxW), h = rnd(minH, maxH), y = base - h;
      g += `<rect class="${cls}" x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="${w.toFixed(0)}" height="${h.toFixed(0)}"/>`;
      if (Math.random() < 0.28) g += `<path class="${cls}" d="M${x.toFixed(0)} ${y.toFixed(0)} l${(w / 2).toFixed(0)} -${rnd(14, 34).toFixed(0)} l${(w / 2).toFixed(0)} ${rnd(14, 34).toFixed(0)}z"/>`;
      if (windows) for (let wy = y + 12; wy < base - 12; wy += 16) for (let wx = x + 8; wx < x + w - 10; wx += 14) if (Math.random() < 0.34) g += `<rect class="win${Math.random() < 0.15 ? ' f' : ''}" x="${wx.toFixed(0)}" y="${wy.toFixed(0)}" width="5" height="7"/>`;
      x += w + rnd(0, 6);
    }
    return g;
  };
  out += layer('sl-far', 420, 90, 230, 36, 80, false);
  out += layer('sl-mid', 420, 70, 190, 40, 90, true);
  // ratusz z flagą (punkt centralny)
  out += `<g class="sl-near"><rect x="740" y="190" width="120" height="230"/><path d="M730 190 L800 120 L870 190Z"/><rect x="788" y="60" width="24" height="70"/><path d="M788 62 L800 36 L812 62Z"/></g>`;
  out += `<rect class="sl-near" x="798" y="14" width="3" height="40"/><path class="flag" d="M801 16 l38 9 l-38 9z"/>`;
  [[770, 220], [800, 220], [830, 220], [770, 260], [800, 260], [830, 260]].forEach(([x, y]) => out += `<rect class="win" x="${x - 5}" y="${y}" width="10" height="14"/>`);
  out += layer('sl-near', 430, 40, 120, 50, 110, true);
  svg.innerHTML = out;
}
function buildStars() { const st = $('#stars'); for (let k = 0; k < 70; k++) { const i = document.createElement('i'); i.style.left = rnd(0, 100) + '%'; i.style.top = rnd(0, 100) + '%'; i.style.animationDelay = rnd(0, 3) + 's'; st.append(i); } }
function buildClouds() { const c = $('#clouds'); for (let k = 0; k < 5; k++) { const s = document.createElement('span'); s.textContent = '☁️'; s.style.top = rnd(4, 38) + '%'; s.style.fontSize = rnd(46, 96) + 'px'; s.style.animationDuration = rnd(70, 140) + 's'; s.style.animationDelay = (-rnd(0, 120)) + 's'; c.append(s); } }

// ---- iskry / żar (canvas) ----
function embers() {
  const cv = $('#embers'), cx = cv.getContext('2d'); let W = 0, H = 0, dots = [];
  const fit = () => { W = cv.width = innerWidth; H = cv.height = innerHeight; dots = Array.from({ length: Math.min(70, Math.round(W / 22)) }, () => spawn(true)); };
  const spawn = init => ({ x: rnd(0, W), y: init ? rnd(0, H) : H + 10, r: rnd(0.8, 2.6), v: rnd(0.2, 0.9), dx: rnd(-0.25, 0.25), a: rnd(0.2, 0.85), ph: rnd(0, 6.28) });
  addEventListener('resize', fit); fit();
  (function loop(t) {
    cx.clearRect(0, 0, W, H);
    for (const d of dots) {
      d.y -= d.v; d.x += d.dx + Math.sin(t / 900 + d.ph) * 0.25;
      if (d.y < -10) Object.assign(d, spawn(false));
      cx.beginPath(); cx.fillStyle = `rgba(255,${150 + (d.r * 30 | 0)},60,${d.a})`; cx.arc(d.x, d.y, d.r, 0, 6.283); cx.fill();
    }
    requestAnimationFrame(loop);
  })(0);
}

// ---- liczniki z animacją ----
function countTo(el, v) { el.dataset.t = v; }
setInterval(() => document.querySelectorAll('.cnt').forEach(e => { const t = +e.dataset.t || 0, c = e.dataset.c === undefined ? 0 : +e.dataset.c, n = c + (t - c) * 0.2; e.dataset.c = Math.abs(t - n) < 0.6 ? t : n; e.textContent = fmt(+e.dataset.c); }), 50);

// ---- kafle ----
const TILES = [
  { id: 'exp', ic: '⚔️', t: 'WYPRAWY', d: 'Mapy, bossowie i cele specjalne', c: '#4fe39a' },
  { id: 'gather', ic: '⛏️', t: 'ZBIERACTWO', d: 'Surowce z jawnymi szansami', c: '#ffb347' },
  { id: 'craft', ic: '🔨', t: 'RZEMIOSŁO', d: 'Wytwarzaj broń, pancerze, dodatki', c: '#ffd24d' },
  { id: 'gear', ic: '🛡️', t: 'EKWIPUNEK', d: 'Broń definiuje styl, bez klas', c: '#6ab4ff' },
  { id: 'duel', ic: '🥊', t: 'ARENA 1v1', d: 'Rankingowe pojedynki w ligach', c: '#ff5a6e' },
  { id: 'city', ic: '🏰', t: 'MIASTO', d: 'Kowal, kupiec, alchemik i inni NPC', c: '#c58bff' },
];
function status(id) {
  const s = P.sessions;
  if (id === 'exp') return s.exp.on ? ['● W TOKU · ' + s.exp.map, true] : ['Bezczynne', false];
  if (id === 'gather') return s.gather.on ? ['● W TOKU · ' + s.gather.loc + ' · ' + fmtHMS(s.gather.left), true] : ['Bezczynne', false];
  if (id === 'craft') return ['Kolejka pusta', false];
  if (id === 'gear') return ['Siła ' + fmt(P.power), false];
  if (id === 'duel') return ['Dziś: 3 / 10', false];
  return ['Sklepy i NPC', false];
}
function buildTiles() {
  const box = $('#tiles');
  TILES.forEach(t => {
    const b = document.createElement('button'); b.className = 'tile'; b.dataset.id = t.id; b.style.setProperty('--c', t.c);
    b.innerHTML = `<span class="ic">${t.ic}</span><b>${t.t}</b><small>${t.d}</small><em id="st-${t.id}"></em>`;
    b.onclick = () => toast(`${t.ic} ${t.t}: ten ekran powstanie w następnym kroku.`);
    b.onmousemove = e => { const r = b.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5; b.style.setProperty('--ry', (x * 10).toFixed(1) + 'deg'); b.style.setProperty('--rx', (-y * 10).toFixed(1) + 'deg'); };
    b.onmouseleave = () => { b.style.setProperty('--rx', '0deg'); b.style.setProperty('--ry', '0deg'); };
    box.append(b);
  });
}
function renderTiles() { for (const t of TILES) { const [txt, live] = status(t.id), e = $('#st-' + t.id); if (e.textContent !== txt) e.textContent = txt; e.classList.toggle('live', live); } }

// ---- toast i zdarzenia ----
let toastT = null;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2600); }
const FEED = [];
function feed(text, cls = '') { FEED.unshift({ t: Date.now(), text, cls }); if (FEED.length > 6) FEED.pop(); drawFeed(); }
function drawFeed() {
  const box = $('#feed'); box.replaceChildren();
  for (const f of FEED) { const r = document.createElement('div'); r.className = 'frow ' + f.cls; const s = document.createElement('small'); s.textContent = new Date(f.t).toLocaleTimeString('pl-PL'); const sp = document.createElement('span'); sp.textContent = f.text; r.append(s, sp); box.append(r); }
}

// ---- render ----
function expFor(lvl) { return EXPTAB ? EXPTAB[lvl - 1].exp : 1000 * lvl * lvl; }
function render() {
  const now = new Date(); $('#app').dataset.tod = todOf(now); placeOrb(now);
  $('#r-clock').textContent = now.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
  countTo($('#r-gold'), P.gold); countTo($('#r-glory'), P.glory); $('#r-bag').textContent = `${P.bag} / ${P.bagMax}`;
  $('#h-name').textContent = P.name; $('#h-lvl').textContent = P.lvl; $('#h-guild').textContent = '⚜️ Gildia: ' + P.guild; $('#h-server').textContent = P.server; $('#w-name').textContent = P.name;
  const need = expFor(P.lvl), have = Math.round(need * P.xp);
  $('#ring-xp').style.strokeDashoffset = (440 * (1 - P.xp)).toFixed(1);
  $('#xp-fill').style.width = (P.xp * 100).toFixed(1) + '%'; $('#xp-txt').textContent = `${fmt(have)} / ${fmt(need)} EXP`;
  countTo($('#h-power'), P.power);
  $('#g-weapon').textContent = P.weapon; $('#g-style').textContent = P.style; $('#g-armor').textContent = P.armor; $('#g-set').textContent = P.set;
  if (P.sessions.gather.on) P.sessions.gather.left = Math.max(0, P.sessions.gather.left - 1);
  renderTiles();
}

// ---- start ----
function init() {
  buildStars(); buildClouds(); buildSkyline(); embers(); buildTiles();
  feed('Witaj w Dowództwie! Ten panel to prototyp wizualny.', 'good');
  feed('📦 Zbieractwo: Jezioro (sesja trwa)', '');
  feed('☠ Boss Herszt Bandytów pokonany (dane przykładowe)', 'boss');
  feed('🎁 Drop: Hartowany Miecz Garnizonu (dobry)', 'loot');
  render(); setInterval(render, 1000);
  // przykładowe zdarzenia na żywo (symulacja)
  const sample = [['🎁 Drop: Stalowa Tarcza Straży (wybitny)', 'loot'], ['🎯 Cel specjalny zniszczony: Obóz bandytów (+35 🏅)', 'good'], ['⛏️ Zebrano: Szmaty ×12', ''], ['⚔️ Poziom +1! Awans na ' + (P.lvl + 1), 'good']];
  let k = 0; setInterval(() => { const [t, c] = sample[k++ % sample.length]; feed(t, c); P.gold += Math.round(rnd(60, 400)); P.xp = Math.min(0.97, P.xp + rnd(0.004, 0.02)); }, 6000);
}
fetch('dane/krzywa_exp_v2.json').then(r => r.json()).then(j => { EXPTAB = j.poziomy; }).catch(() => {}).finally(init);
