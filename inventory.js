// EKWIPUNEK — interfejs. Klient nie zmienia stanu sam: wysyła komendy do serwera i rysuje jego odpowiedź.
'use strict';
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const el = (t, c, txt) => { const e = document.createElement(t); if (c) e.className = c; if (txt !== undefined) e.textContent = txt; return e; };
  const fmt = n => Math.round(n).toLocaleString('pl-PL');
  const MAT_ICON = new Proxy(MATS, { get(t, k) { if (k in t) return t[k]; const base = String(k).replace(/ [IVX]+$/, ''); for (const b of Object.values(BOARDS)) { const f = b.types.find(x => x[0] === base); if (f) return f[1]; } return undefined; } });
  let ST = null, selUid = null, tab = 'bag', busy = 0, open = false, drag = null, cidSeq = 0, queue = Promise.resolve();

  // ---- komendy (po kolei, każda z unikalnym cid) ----
  function cmd(type, payload = {}, opts = {}) {
    busy++; syncDot();
    queue = queue.then(() => Server.send({ type, cid: 'c' + (++cidSeq) + '-' + Date.now(), ...payload })).then(res => {
      busy--; syncDot();
      ST = res.snapshot;
      if (!res.ok) toast(res.error, 'err'); else handleEvents(res.events, opts.silent);
      if (selUid && !Object.prototype.hasOwnProperty.call(ST.items, selUid)) selUid = null;
      if (open) draw();
      window.dispatchEvent(new CustomEvent('inv:update', { detail: ST }));
      return res;
    });
    return queue;
  }
  function handleEvents(evs, silent) {
    for (const e of evs) {
      if (silent && (e.t === 'item_added' || e.t === 'mat_added')) continue;
      if (e.t === 'item_added') {
        if (e.where === 'sold') { toast(`${e.ic} ${e.name} → sprzedano automatycznie (+${fmt(e.gold)} 🪙, skrytka pełna)`, 'gold'); continue; }
        const it = ST.items[e.uid]; if (!it) continue;
        fresh.add(e.uid); setTimeout(() => { fresh.delete(e.uid); if (open) draw(); }, 2600);
        toast(`${it.ic} ${it.name} (${RARITY[it.rarity].n})${e.where === 'stash' ? ' → skrytka (plecak pełny)' : ''}`, 'loot', RARITY[it.rarity].c);
      } else if (e.t === 'mat_added') toast(`${MAT_ICON[e.mat] || '📦'} ${e.mat} ×${e.qty}`, 'mat');
      else if (e.t === 'sold') toast(`🪙 +${fmt(e.gold)} złota`, 'gold');
      else if (e.t === 'equipped') toast('✔ Założono', 'ok');
    }
  }
  const fresh = new Set();

  // ---- pomocnicze ----
  const totals = () => { let atk = 0, def = 0; for (const u of Object.values(ST.equip)) { const it = ST.items[u]; if (it) { atk += Math.round(it.atk * (1 + it.plus * 0.2)); def += Math.round(it.def * (1 + it.plus * 0.2)); } } return { atk, def }; };
  const equippedFor = it => { const ks = it.type === 'ring' ? ['ring1', 'ring2'] : [it.type]; const k = ks.find(q => !ST.equip[q]) || ks[0]; return ST.items[ST.equip[k]]; };
  const statLine = it => [it.atk ? `⚔ Atak ${Math.round(it.atk * (1 + it.plus * 0.2))}` : '', it.def ? `🛡 Obrona ${Math.round(it.def * (1 + it.plus * 0.2))}` : ''].filter(Boolean).join('   ');

  // ---- tooltip ----
  let tip;
  function showTip(it, e, equippedNow) {
    if (!tip) { tip = el('div', 'inv-tip'); document.body.append(tip); }
    const r = RARITY[it.rarity], cmp = !equippedNow && equippedFor(it);
    tip.replaceChildren();
    const h = el('b', '', it.name + (it.plus ? ` +${it.plus}` : '')); h.style.color = r.c; tip.append(h, el('div', 'tt-r', r.n + ' · ' + it.type));
    tip.append(el('div', 'tt-s', statLine(it) || '—'));
    if (cmp) { const da = Math.round(it.atk * (1 + it.plus * .2)) - Math.round(cmp.atk * (1 + cmp.plus * .2)), dd = Math.round(it.def * (1 + it.plus * .2)) - Math.round(cmp.def * (1 + cmp.plus * .2)); const c = el('div', 'tt-c', `W porównaniu z założonym: ${da ? (da > 0 ? '▲ +' : '▼ ') + da + ' atak  ' : ''}${dd ? (dd > 0 ? '▲ +' : '▼ ') + dd + ' obrona' : ''}` || '—'); c.classList.add(da > 0 || dd > 0 ? 'up' : 'down'); tip.append(c); }
    tip.append(el('div', it.req > ST.lvl ? 'tt-req bad' : 'tt-req', `Wymagany poziom: ${it.req}`), el('div', 'tt-v', `Wartość: ${fmt(it.value)} 🪙`));
    tip.classList.add('on'); moveTip(e);
  }
  function moveTip(e) { if (!tip) return; const w = tip.offsetWidth, h = tip.offsetHeight; let x = e.clientX + 16, y = e.clientY + 16; if (x + w > innerWidth - 8) x = e.clientX - w - 16; if (y + h > innerHeight - 8) y = innerHeight - h - 8; tip.style.left = x + 'px'; tip.style.top = y + 'px'; }
  const hideTip = () => tip && tip.classList.remove('on');

  // ---- komórki ----
  function cell(uid, kind, idx) {
    const c = el('div', 'cell' + (uid ? ' has' : '') + (uid && uid === selUid ? ' sel' : '') + (uid && fresh.has(uid) ? ' fresh' : ''));
    c.dataset.kind = kind; c.dataset.idx = idx;
    if (uid) {
      const it = ST.items[uid], r = RARITY[it.rarity]; c.style.setProperty('--rc', r.c); c.classList.add('r' + it.rarity);
      c.append(el('span', 'ico', it.ic)); if (it.plus) c.append(el('em', 'plus', '+' + it.plus));
      if (it.req > ST.lvl) c.classList.add('locked');
      c.draggable = true;
      c.onmouseenter = e => showTip(it, e, kind === 'equip'); c.onmousemove = moveTip; c.onmouseleave = hideTip;
      c.onclick = () => { selUid = uid === selUid ? null : uid; draw(); };
      c.ondblclick = () => { hideTip(); if (kind === 'bag') cmd('equip', { uid }); else if (kind === 'equip') cmd('unequip', { slot: idx }); else cmd('claim', { uid }); };
      c.ondragstart = e => { drag = { uid, kind, idx }; hideTip(); document.querySelectorAll('.eslot').forEach(w => { const ok = kind !== 'equip' && it.type === w.dataset.accept; w.classList.toggle('accept', ok); w.classList.toggle('reject', !ok); }); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', uid); c.classList.add('dragging'); };
      c.ondragend = () => { drag = null; c.classList.remove('dragging'); document.querySelectorAll('.eslot').forEach(w => w.classList.remove('accept', 'reject')); };
    }
    c.ondragover = e => { if (drag) { e.preventDefault(); c.classList.add('over'); } };
    c.ondragleave = () => c.classList.remove('over');
    c.ondrop = e => {
      e.preventDefault(); c.classList.remove('over'); if (!drag) return; const d = drag; drag = null;
      if (kind === 'bag') { if (d.kind === 'bag') cmd('move', { from: d.idx, to: +idx }); else if (d.kind === 'equip') cmd('unequip', { slot: d.idx }); else cmd('claim', { uid: d.uid }); }
      else if (kind === 'equip') { if (d.kind === 'bag') cmd('equip', { uid: d.uid }); }
    };
    return c;
  }

  // ---- rysowanie ----
  let root;
  function draw() {
    if (!root || !ST) return;
    const body = $('.inv-body', root); body.replaceChildren();
    // lewa kolumna: sylwetka z polami ekwipunku
    const left = el('div', 'inv-left'); left.append(el('h3', '', 'Postać'));
    const pd = el('div', 'altar');
    const eqUids = Object.values(ST.equip), best = eqUids.length ? Math.max(...eqUids.map(u => ST.items[u].rarity)) : -1;
    pd.style.setProperty('--aura', best >= 0 ? RARITY[best].c : '#5a5f7a');
    pd.style.setProperty('--p', Math.round(100 * eqUids.length / EQUIP_SLOTS.length));
    const POS = { helm: 0, earrings: 45, bracelet: 90, ring1: 135, boots: 180, ring2: 225, weapon: 270, armor: 315 }, R = 33;
    let beams = '', slotsEls = [];
    EQUIP_SLOTS.forEach(s => {
      const an = POS[s.k] * Math.PI / 180, x = 50 + R * Math.sin(an), y = 50 - R * Math.cos(an), u = ST.equip[s.k], col = u ? RARITY[ST.items[u].rarity].c : '#3a3d52';
      beams += '<line class="beam' + (u ? ' on' : '') + '" x1="50" y1="50" x2="' + x.toFixed(1) + '" y2="' + y.toFixed(1) + '" style="--bc:' + col + '"/>';
      const w = el('div', 'aslot eslot'); w.dataset.accept = s.k.startsWith('ring') ? 'ring' : s.k; w.style.left = x + '%'; w.style.top = y + '%';
      const c = cell(u || null, 'equip', s.k); if (!u) c.append(el('span', 'ghost', s.ic));
      w.append(c, el('small', '', s.n)); slotsEls.push(w);
    });
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('class', 'beams'); svg.setAttribute('viewBox', '0 0 100 100'); svg.innerHTML = beams;
    const core = el('div', 'core'); core.innerHTML = '<div class="runes"></div><div class="disc"><b>' + eqUids.length + '/' + EQUIP_SLOTS.length + '</b><small>WYPOSAŻENIE</small></div>';
    pd.append(el('div', 'stars2'), svg, core, ...slotsEls); left.append(pd);

    const t = totals(), eqN = eqUids.length, st = el('div', 'inv-stats');
    const kit = el('div', 'kit'); kit.append(el('span', '', `Wyposażenie ${eqN}/${EQUIP_SLOTS.length}`)); const kb = el('div', 'kitbar'); const ki = el('i'); ki.style.width = (100 * eqN / EQUIP_SLOTS.length) + '%'; kb.append(ki); kit.append(kb);
    const row = el('div', 'srow2'); row.append(el('div', '', '⚔ Atak'), el('b', '', fmt(t.atk)), el('div', '', '🛡 Obrona'), el('b', '', fmt(t.def)));
    st.append(kit, row, el('div', 'muted', 'Poziom postaci: ' + ST.lvl)); left.append(st);
    // prawa kolumna: zakładki
    const right = el('div', 'inv-right'), tabs = el('div', 'inv-tabs');
    const used = ST.slots.filter(Boolean).length;
    [['bag', `🎒 Plecak ${used}/${ST.slots.length}`], ['mats', '🧱 Surowce'], ['stash', `📥 Skrytka ${ST.stash.length}/${Server.STASH_MAX}`]].forEach(([k, n]) => { const b = el('button', 'tabbtn' + (tab === k ? ' on' : '') + (k === 'stash' && ST.stash.length ? ' alert' : ''), n); b.onclick = () => { tab = k; selUid = null; draw(); }; tabs.append(b); });
    right.append(tabs);
    if (tab === 'bag') {
      const g = el('div', 'grid8'); ST.slots.forEach((u, i) => g.append(cell(u, 'bag', i))); right.append(g);
      const bar = el('div', 'inv-actions'); const sb = el('button', 'btn', '⇅ Sortuj'); sb.onclick = () => cmd('sort'); bar.append(sb); right.append(bar);
    } else if (tab === 'mats') {
      const g = el('div', 'matgrid'); const ks = Object.keys(ST.mats).filter(k => ST.mats[k] > 0);
      if (!ks.length) g.append(el('p', 'muted', 'Brak surowców. Zbieraj w lokacjach i zabijaj potwory.'));
      ks.forEach(k => { const m = el('div', 'mat'); m.append(el('span', 'ico', MAT_ICON[k] || '📦'), el('b', '', k), el('em', '', '×' + ST.mats[k])); g.append(m); }); right.append(g);
    } else {
      right.append(el('p', 'muted small', 'Tu trafiają przedmioty, gdy plecak jest pełny. Nic nie przepada: zrób miejsce i odbierz.'));
      const g = el('div', 'grid8'); ST.stash.forEach(u => g.append(cell(u, 'stash', u))); if (!ST.stash.length) g.append(el('p', 'muted', 'Skrytka jest pusta.')); right.append(g);
    }
    // panel wybranego przedmiotu
    const it = selUid && ST.items[selUid];
    const det = el('div', 'inv-detail' + (it ? '' : ' empty'));
    if (it) {
      const r = RARITY[it.rarity], f = Object.entries(ST.equip).find(([, u]) => u === it.uid), where = f ? 'equip' : ST.stash.includes(it.uid) ? 'stash' : 'bag';
      const n = el('b', '', it.ic + ' ' + it.name + (it.plus ? ` +${it.plus}` : '')); n.style.color = r.c;
      det.append(n, el('span', 'muted', ` · ${r.n} · ${statLine(it)} · wymagany poz. ${it.req}`));
      const act = el('div', 'act');
      if (where === 'bag') { const b = el('button', 'btn pri', '✔ Załóż'); b.disabled = it.req > ST.lvl; b.onclick = () => cmd('equip', { uid: it.uid }); act.append(b); }
      if (where === 'equip') { const b = el('button', 'btn', '↧ Zdejmij'); b.onclick = () => cmd('unequip', { slot: f[0] }); act.append(b); }
      if (where === 'stash') { const b = el('button', 'btn pri', '📥 Odbierz'); b.onclick = () => cmd('claim', { uid: it.uid }); act.append(b); }
      if (where !== 'equip') { const b = el('button', 'btn warn', `Sprzedaj za ${fmt(it.value)} 🪙`); b.onclick = () => { selUid = null; cmd('sell', { uid: it.uid }); }; act.append(b); }
      det.append(act);
    } else det.append(el('span', 'muted', 'Kliknij przedmiot, aby zobaczyć szczegóły. Dwukrotne kliknięcie zakłada lub zdejmuje. Przeciągaj przedmioty między polami.'));
    right.append(det);
    body.append(left, right);
    $('#inv-gold', root).textContent = fmt(ST.gold);
  }
  const syncDot = () => { const d = root && $('#inv-sync', root); if (d) { d.classList.toggle('busy', busy > 0); d.title = busy ? 'Synchronizacja z serwerem…' : 'Zsynchronizowano'; } };

  // ---- powiadomienia ----
  function toast(text, cls = '', color) {
    let box = $('#inv-toasts'); if (!box) { box = el('div'); box.id = 'inv-toasts'; document.body.append(box); }
    const t = el('div', 'itoast ' + cls, text); if (color) t.style.borderColor = color; box.append(t);
    while (box.children.length > 5) box.firstChild.remove();
    setTimeout(() => t.remove(), 3600);
  }

  // ---- test spójności (przyciski deweloperskie) ----
  function stress(n = 600) {
    const types = ['move', 'equip', 'unequip', 'sell', 'claim', 'sort', 'debug_drop', 'debug_drop', 'activity_start', 'activity_start', 'activity_stop', 'kill_reward', 'board_move', 'board_move', 'board_take', 'board_debug_fill', 'gather_tick'];
    let lockBad = 0;
    const slotsK = EQUIP_SLOTS.map(s => s.k); let ok = 0, rej = 0, dup = 0;
    for (let i = 0; i < n; i++) {
      const sn = Server.snapshot(), anyUid = () => { const all = Object.keys(sn.items); return all.length ? all[Math.floor(Math.random() * all.length)] : 'nie-ma'; };
      const t = types[Math.floor(Math.random() * types.length)];
      const p = { move: { from: Math.floor(Math.random() * 52) - 2, to: Math.floor(Math.random() * 52) - 2 }, equip: { uid: anyUid() }, unequip: { slot: slotsK[Math.floor(Math.random() * 9)] }, sell: { uid: anyUid() }, claim: { uid: anyUid() }, sort: {}, debug_drop: { n: 1 + Math.floor(Math.random() * 6), boss: Math.random() < 0.2 }, activity_start: { kind: ['exp', 'gather', 'craft', 'x'][Math.floor(Math.random() * 4)], detail: ['test', 'mining', 'sawmill'][Math.floor(Math.random() * 3)] }, board_move: { board: ['mining', 'sawmill', 'x'][Math.floor(Math.random() * 3)], from: Math.floor(Math.random() * 22) - 1, to: Math.floor(Math.random() * 22) - 1 }, board_take: { board: ['mining', 'sawmill'][Math.floor(Math.random() * 2)], idx: Math.floor(Math.random() * 22) - 1 }, board_debug_fill: { board: ['mining', 'sawmill'][Math.floor(Math.random() * 2)], n: 1 + Math.floor(Math.random() * 8) }, gather_tick: {}, activity_stop: {}, kill_reward: { tier: Math.floor(Math.random() * 5), kind: ['mob', 'boss', 'target'][Math.floor(Math.random() * 3)] } }[t];
      const cid = 's' + Date.now() + '-' + i, r = Server.execSync({ type: t, cid, ...p });
      if (r.ok) ok++; else rej++;
      if (t === 'activity_start' && sn.activity && r.ok) lockBad++; // zmiana aktywności bez zatrzymania = błąd blokady
      if (t === 'kill_reward' && !sn.activity && r.ok) lockBad++; // łup bez aktywnej wyprawy = błąd
      if (i % 7 === 0) { const again = Server.execSync({ type: t, cid, ...p }); if (again !== r) dup++; } // ta sama komenda nie może wykonać się drugi raz
    }
    const bad = Server.invariants(), s = Server.snapshot();
    if (lockBad) bad.push('naruszenia blokady aktywności: ' + lockBad);
    return { bad, ok, rej, dup, items: Object.keys(s.items).length, bag: s.slots.filter(Boolean).length, stash: s.stash.length };
  }

  // ---- budowa okna ----
  function build() {
    root = el('div', 'inv-ov'); root.hidden = true;
    root.innerHTML = `<div class="inv-win" role="dialog" aria-label="Ekwipunek">
      <div class="inv-head"><b>🎒 EKWIPUNEK</b><span class="inv-gold">🪙 <b id="inv-gold">0</b></span><span id="inv-sync" class="sync" title="Zsynchronizowano"></span><button class="x" id="inv-x" aria-label="Zamknij">✕</button></div>
      <div class="inv-body"></div>
      <div class="inv-dev"><small>TEST:</small>
        <button class="btn" data-d="1">🎁 Drop ×1</button><button class="btn" data-d="5">🎁 Drop ×5</button><button class="btn" data-d="boss">☠ Drop z bossa</button><button class="btn" data-d="fill">📦 Zapełnij plecak (test skrytki)</button><button class="btn" data-d="stress">🧪 Test spójności (600 operacji)</button>
        <span id="inv-report" class="report"></span></div>
    </div>`;
    document.body.append(root);
    $('#inv-x', root).onclick = close; root.onclick = e => { if (e.target === root) close(); };
    addEventListener('keydown', e => { if (e.key === 'Escape' && open) close(); });
    root.querySelectorAll('[data-d]').forEach(b => b.onclick = async () => {
      const d = b.dataset.d;
      if (d === 'stress') { Server.execSync({ type: 'activity_stop', cid: 'st-' + Date.now() }); const r = stress(); Server.execSync({ type: 'activity_stop', cid: 'st2-' + Date.now() }); ST = Server.snapshot(); selUid = null; draw(); const rep = $('#inv-report', root); rep.className = 'report ' + (r.bad.length ? 'bad' : 'good'); rep.textContent = r.bad.length ? '✖ BŁĘDY: ' + r.bad.slice(0, 3).join('; ') : `✔ Spójność OK · wykonano ${r.ok}, odrzucono ${r.rej}, powtórzeń ${r.dup} · przedmiotów ${r.items} (plecak ${r.bag}, skrytka ${r.stash})`; return; }
      if (d === 'fill') return cmd('debug_drop', { n: 60 });
      if (d === 'boss') return cmd('debug_drop', { n: 3, boss: true });
      cmd('debug_drop', { n: +d });
    });
  }
  function openInv() { if (!root) build(); open = true; root.hidden = false; document.body.classList.add('inv-open'); draw(); }
  function close() { open = false; hideTip(); root.hidden = true; document.body.classList.remove('inv-open'); }

  // start: kilka przedmiotów początkowych i założone: broń + zbroja
  (async () => {
    Server.execSync({ type: 'starter_kit', cid: 'seed-1' });
    const s0 = Server.snapshot();
    s0.slots.forEach(u => { if (u) { const t = s0.items[u].type; if (['weapon', 'helm', 'armor', 'boots'].includes(t)) Server.execSync({ type: 'equip', uid: u, cid: 'seed-eq-' + u }); } });
    ST = Server.snapshot();
  })();

  window.Inventory = { open: openInv, close, exec: (t, p) => cmd(t, p || {}), reward: (p) => cmd('kill_reward', p, { silent: true }), drop: n => cmd('debug_drop', { n }), get state() { return ST; } };
})();
