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
  // Pola istnieją cały czas (nie są przebudowywane), a zawartość zmienia się tylko wtedy, gdy zmienił się stan pola.
  // Dzięki temu cosekundowe odświeżenia od serwera nie przerywają przeciągania ani klikania.
  let cellEls = [], detSig = '';
  function ensureGrid() {
    const grid = $('#ggrid', root); if (cellEls.length === BOARD_CELLS) return; grid.replaceChildren(); cellEls = [];
    for (let i = 0; i < BOARD_CELLS; i++) {
      const cell = el('div', 'gcell'); cell.dataset.i = i; cell.draggable = true;
      cell.onclick = () => { const c = S().boards[tab][i]; sel = c ? (sel === i ? null : i) : null; draw(); };
      cell.ondragstart = e => { const c = S().boards[tab][i]; if (!c) { e.preventDefault(); return; } drag = i; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(i)); cell.classList.add('dragging'); };
      cell.ondragend = () => { drag = null; cellEls.forEach(x => x.classList.remove('over', 'dragging')); };
      cell.ondragover = e => { if (drag !== null) { e.preventDefault(); cell.classList.add('over'); } };
      cell.ondragleave = () => cell.classList.remove('over');
      cell.ondrop = async e => {
        e.preventDefault(); cell.classList.remove('over'); if (drag === null) return;
        const from = drag; drag = null; cellEls.forEach(x => x.classList.remove('dragging')); if (from === i) return;
        sel = null; await run('board_move', { board: tab, from, to: i }); draw();
      };
      cellEls.push(cell); grid.append(cell);
    }
  }
  function draw() {
    if (!root || root.hidden || !S()) return;
    ensureGrid();
    const s = S(), B = s.boards[tab], a = act(), on = running(), other = a && !(a.kind === 'gather' && a.detail === tab) ? a : null;
    root.querySelectorAll('.gtab').forEach(b => b.classList.toggle('on', b.dataset.t === tab));
    const sc = $('#gscene', root); sc.dataset.scene = tab; sc.classList.toggle('run', on);
    B.forEach((c, i) => {
      const cell = cellEls[i], key = tab + ':' + i, sig = (c ? c.t + '|' + c.l : '') + '|' + (sel === i ? 's' : '') + (fresh.has(key) ? 'f' : '') + (merged.has(key) ? 'm' : '');
      if (cell.dataset.sig === sig) return; cell.dataset.sig = sig;
      cell.className = 'gcell' + (c ? ' has' : '') + (sel === i ? ' sel' : '') + (fresh.has(key) ? ' fresh' : '') + (merged.has(key) ? ' merged' : '');
      cell.replaceChildren();
      if (c) { cell.dataset.l = c.l; const ic = el('span', 'gi', iconOf(tab, c.t)); ic.style.fontSize = (22 + c.l * 3) + 'px'; cell.append(ic, el('em', 'gl', ROMAN[c.l])); cell.title = c.t + ' ' + ROMAN[c.l]; }
      else { delete cell.dataset.l; cell.removeAttribute('title'); }
    });
    // panel wybranego surowca (budowany tylko przy zmianie, żeby klik w ZABIERZ nie ginął)
    const it = sel !== null ? B[sel] : null, dsig = (it ? it.t + '|' + it.l + '|' + sel : '-') + '|' + pending + '|' + tab;
    if (dsig !== detSig) {
      detSig = dsig; const det = $('#gdet', root); det.replaceChildren();
      if (it) {
        det.append(el('b', '', iconOf(tab, it.t) + ' ' + it.t + ' ' + ROMAN[it.l]), el('span', 'muted', it.l >= BOARD_MAXLVL ? ' · maksymalny poziom' : ' · przeciągnij na taki sam, aby scalić'));
        const take = el('button', 'gbtn take', '📦 ZABIERZ'); take.disabled = pending;
        take.onclick = async () => { if (pending) return; pending = true; const idx = sel; sel = null; draw(); await run('board_take', { board: tab, idx }); pending = false; draw(); };
        det.append(take);
      } else det.append(el('span', 'muted', 'Kliknij surowiec, aby go zabrać do ekwipunku. Dwa takie same przeciągnij na siebie, aby scalić je w jeden wyższego poziomu.'));
    }
    const free = B.filter(x => !x).length, gf = $('#gfree', root), ft = free ? 'Wolne pola: ' + free + ' / ' + B.length : '⚠ Plansza pełna: nowe surowce przepadają';
    if (gf.textContent !== ft) gf.textContent = ft; gf.classList.toggle('full', !free);
    const lt = s.lost[tab] ? 'Przepadło: ' + s.lost[tab] : ''; if ($('#glost', root).textContent !== lt) $('#glost', root).textContent = lt;
    const bt = $('#gstart', root), label = other ? '🔒 Zajęty: ' + ({ exp: 'Wyprawy', gather: 'Zbieractwo', craft: 'Rzemiosło' }[other.kind]) + (other.kind === 'gather' ? ' · ' + SCENES[other.detail].n : '') : on ? '⏸ Zatrzymaj ' + SCENES[tab].n.toLowerCase() : '▶ ZACZNIJ ' + SCENES[tab].n;
    bt.disabled = pending || !!other; if (bt.textContent !== label) bt.textContent = label; bt.classList.toggle('go', !on && !other);
    root.querySelectorAll('.gtab').forEach(t => { const bd = s.boards[t.dataset.t].filter(Boolean).length, sm = t.querySelector('small'), tx = bd + '/' + s.boards[t.dataset.t].length + (a && a.kind === 'gather' && a.detail === t.dataset.t ? ' · ●' : ''); if (sm.textContent !== tx) sm.textContent = tx; });
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
    root.querySelectorAll('.gtab').forEach(b => b.onclick = () => { tab = b.dataset.t; sel = null; cellEls.forEach(x => delete x.dataset.sig); detSig = ''; draw(); });
    $('#gstart', root).onclick = async () => {
      if (pending) return; pending = true; draw();
      if (running()) await run('activity_stop'); else await run('activity_start', { kind: 'gather', detail: tab });
      pending = false; draw();
    };
    $('#gfill', root).onclick = () => run('board_debug_fill', { board: tab, n: 5 }).then(draw);
    window.addEventListener('inv:update', () => { if (!root.hidden) draw(); });
  }
  function open(which) { if (!root) build(); if (which && SCENES[which]) tab = which; root.hidden = false; document.body.classList.add('inv-open'); sel = null; cellEls.forEach(x => delete x.dataset.sig); detSig = ''; draw(); }
  function close() { root.hidden = true; document.body.classList.remove('inv-open'); }
  window.Gather = { open, close };
})();
