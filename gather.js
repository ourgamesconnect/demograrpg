// ZBIERACTWO — Górnictwo i Tartak: animowana scena + plansza do scalania surowców.
// Całą logikę (drop, scalanie, zabieranie, blokada) liczy serwer; ten plik tylko rysuje i wysyła komendy.
'use strict';
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const el = (t, c, txt) => { const e = document.createElement(t); if (c) e.className = c; if (txt !== undefined) e.textContent = txt; return e; };
  const rnd = (a, b) => a + Math.random() * (b - a);
  const SCENES = { mining: { n: 'GÓRNICTWO', ic: '⛏️' }, sawmill: { n: 'TARTAK', ic: '🪵' } };
  let root, tab = 'mining', sel = null, pending = false, fresh = new Set(), merged = new Set(), drag = null, lost = 0;

  const S = () => (window.Inventory && Inventory.state) || null;
  const act = () => { const s = S(); return s && s.activity; };
  const running = () => { const a = act(); return !!(a && a.kind === 'gather' && a.detail === tab); };
  const iconOf = (board, type) => { const t = BOARDS[board].types.find(x => x[0] === type); return t ? t[1] : '📦'; };

  async function run(type, payload) {
    const res = await Inventory.exec(type, payload);
    if (res && res.ok) for (const e of res.events) {
      if (e.t === 'board_drop') { fresh.add(e.board + ':' + e.idx); setTimeout(() => { fresh.delete(e.board + ':' + e.idx); if (root && !root.hidden) draw(); }, 1200); if (root && !root.hidden && e.board === tab) burst(); }
      else if (e.t === 'board_merged') { merged.add(e.board + ':' + e.idx); setTimeout(() => { merged.delete(e.board + ':' + e.idx); if (root && !root.hidden) draw(); }, 900); }
      else if (e.t === 'board_lost') lost++;
    }
    return res;
  }

  // ---- rysowanie planszy ----
  function draw() {
    if (!root || root.hidden || !S()) return;
    const s = S(), B = s.boards[tab], a = act(), on = running(), other = a && !(a.kind === 'gather' && a.detail === tab) ? a : null;
    root.querySelectorAll('.gtab').forEach(b => b.classList.toggle('on', b.dataset.t === tab));
    $('#gscene', root).dataset.scene = tab; $('#gscene', root).classList.toggle('run', on);
    const grid = $('#ggrid', root); grid.replaceChildren();
    B.forEach((c, i) => {
      const cell = el('div', 'gcell' + (c ? ' has' : '') + (sel === i ? ' sel' : '') + (fresh.has(tab + ':' + i) ? ' fresh' : '') + (merged.has(tab + ':' + i) ? ' merged' : ''));
      cell.dataset.i = i;
      if (c) {
        cell.dataset.l = c.l; cell.draggable = true;
        const ic = el('span', 'gi', iconOf(tab, c.t)); ic.style.fontSize = (22 + c.l * 3) + 'px'; cell.append(ic, el('em', 'gl', ROMAN[c.l]));
        cell.title = `${c.t} ${ROMAN[c.l]}`;
        cell.onclick = () => { sel = sel === i ? null : i; draw(); };
        cell.ondragstart = e => { drag = i; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(i)); };
        cell.ondragend = () => { drag = null; grid.querySelectorAll('.over').forEach(x => x.classList.remove('over')); };
      } else cell.onclick = () => { if (sel !== null) { sel = null; draw(); } };
      cell.ondragover = e => { if (drag !== null) { e.preventDefault(); cell.classList.add('over'); } };
      cell.ondragleave = () => cell.classList.remove('over');
      cell.ondrop = async e => { e.preventDefault(); cell.classList.remove('over'); if (drag === null) return; const from = drag; drag = null; if (from === i) return; sel = null; await run('board_move', { board: tab, from, to: i }); draw(); };
      grid.append(cell);
    });
    // panel wybranego surowca
    const det = $('#gdet', root), it = sel !== null ? B[sel] : null; det.replaceChildren();
    if (it) {
      det.append(el('b', '', `${iconOf(tab, it.t)} ${it.t} ${ROMAN[it.l]}`), el('span', 'muted', it.l >= BOARD_MAXLVL ? ' · maksymalny poziom' : ' · przeciągnij na taki sam, aby scalić'));
      const take = el('button', 'gbtn take', '📦 ZABIERZ'); take.disabled = pending; take.onclick = async () => { pending = true; const idx = sel; sel = null; await run('board_take', { board: tab, idx }); pending = false; draw(); }; det.append(take);
    } else det.append(el('span', 'muted', 'Kliknij surowiec, aby go zabrać do ekwipunku. Dwa takie same przeciągnij na siebie, aby scalić je w jeden wyższego poziomu.'));
    const free = B.filter(x => !x).length;
    $('#gfree', root).textContent = free ? `Wolne pola: ${free} / ${B.length}` : '⚠ Plansza pełna: nowe surowce przepadają';
    $('#gfree', root).classList.toggle('full', !free);
    $('#glost', root).textContent = s.lost[tab] ? `Przepadło: ${s.lost[tab]}` : '';
    const b = $('#gstart', root); b.disabled = pending || !!other;
    b.textContent = other ? '🔒 Zajęty: ' + ({ exp: 'Wyprawy', gather: 'Zbieractwo', craft: 'Rzemiosło' }[other.kind]) + (other.kind === 'gather' ? ' · ' + SCENES[other.detail].n : '') : on ? '⏸ Zatrzymaj ' + SCENES[tab].n.toLowerCase() : '▶ ZACZNIJ ' + SCENES[tab].n;
    b.classList.toggle('go', !on && !other);
    // tab badges
    root.querySelectorAll('.gtab').forEach(t => { const bd = s.boards[t.dataset.t].filter(Boolean).length; t.querySelector('small').textContent = `${bd}/${s.boards[t.dataset.t].length}` + (a && a.kind === 'gather' && a.detail === t.dataset.t ? ' · ●' : ''); });
  }

  // ---- animacje sceny ----
  function burst() {
    const sc = $('#gscene', root), n = tab === 'mining' ? ['✨', '💥', '🪨', '⭐'] : ['🪵', '🍂', '✨', '·'];
    for (let k = 0; k < 8; k++) {
      const p = el('span', 'gp', n[Math.floor(Math.random() * n.length)]); const a = rnd(-2.6, -0.5), d = rnd(60, 150);
      p.style.setProperty('--dx', Math.cos(a) * d + 'px'); p.style.setProperty('--dy', Math.sin(a) * d + 'px'); sc.append(p); setTimeout(() => p.remove(), 900);
    }
  }
  setInterval(() => { if (root && !root.hidden && running()) { const sc = $('#gscene', root); sc.classList.remove('hit'); void sc.offsetWidth; sc.classList.add('hit'); } }, 1400);

  // ---- tik serwera (drop liczy serwer; klient tylko odpytuje) ----
  setInterval(() => { const a = act(); if (a && a.kind === 'gather' && window.Inventory) run('gather_tick').then(() => { if (root && !root.hidden) draw(); }); }, 1000);

  function build() {
    root = el('div', 'g-ov'); root.hidden = true;
    root.innerHTML = `<div class="g-win" role="dialog" aria-label="Zbieractwo">
      <div class="g-head"><b>⛏️ ZBIERACTWO</b><div class="gtabs"><button class="gtab on" data-t="mining">⛏️ Górnictwo <small></small></button><button class="gtab" data-t="sawmill">🪵 Tartak <small></small></button></div><button class="x" id="gclose" aria-label="Zamknij">✕</button></div>
      <div class="gscene" id="gscene" data-scene="mining">
        <div class="gbg"></div>
        <div class="gmine"><div class="rock">🪨</div><div class="pick">⛏️</div><div class="lamp l">🔦</div><div class="cart">🛒</div></div>
        <div class="gsaw"><div class="log">🪵</div><div class="blade">🪚</div><div class="belt"></div><div class="planks">📏</div></div>
        <div class="gstate" id="gstate"></div>
      </div>
      <div class="g-ctl"><button class="gstart go" id="gstart">▶ ZACZNIJ</button></div>
      <div class="g-board">
        <div class="g-bhead"><b>Plansza surowców</b><span id="gfree"></span><span id="glost" class="lostc"></span></div>
        <div class="ggrid" id="ggrid"></div>
        <div class="gdet" id="gdet"></div>
        <div class="g-dev"><small>TEST:</small><button class="gdev" id="gfill">🎁 +5 surowców</button></div>
      </div>
    </div>`;
    document.body.append(root);
    $('#gclose', root).onclick = close; root.onclick = e => { if (e.target === root) close(); };
    addEventListener('keydown', e => { if (e.key === 'Escape' && !root.hidden) close(); });
    root.querySelectorAll('.gtab').forEach(b => b.onclick = () => { tab = b.dataset.t; sel = null; draw(); });
    $('#gstart', root).onclick = async () => {
      if (pending) return; pending = true; draw();
      if (running()) await run('activity_stop'); else await run('activity_start', { kind: 'gather', detail: tab });
      pending = false; draw();
    };
    $('#gfill', root).onclick = () => run('board_debug_fill', { board: tab, n: 5 }).then(draw);
    window.addEventListener('inv:update', () => { if (!root.hidden) draw(); });
  }
  function open(which) { if (!root) build(); if (which && SCENES[which]) tab = which; root.hidden = false; document.body.classList.add('inv-open'); sel = null; draw(); }
  function close() { root.hidden = true; document.body.classList.remove('inv-open'); }
  window.Gather = { open, close };
})();
