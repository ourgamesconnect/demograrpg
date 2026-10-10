// EKRAN UMIEJĘTNOŚCI — rozdawanie punktów (1 punkt za każdy poziom). Rangi liczy i waliduje serwer.
'use strict';
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const el = (t, c, txt) => { const e = document.createElement(t); if (c) e.className = c; if (txt !== undefined) e.textContent = txt; return e; };
  const KIND = { buff: 'Wzmocnienie', strike: 'Atak', debuff: 'Osłabienie', execute: 'Egzekucja', dot: 'Strefa', nuke: 'Ostateczny', detonate: 'Detonacja', channel: 'Kanał' };
  let root, tab = null, lastSig = '', busy = false, animate = false;

  const S = () => (window.Inventory && Inventory.state) || null;
  const ranks = () => (S() && S().skills) || {};
  const spent = () => Object.values(ranks()).reduce((a, b) => a + b, 0);
  const points = () => { const s = S(); return s ? Math.max(0, s.lvl - 1 - spent()) : 0; };
  const equippedWeapon = () => { const s = S(), u = s && s.equip.weapon, it = u && s.items[u]; return (it && it.kind) || 'sword'; };
  const spentFor = w => SKILLS.filter(s => s.w === w).reduce((a, s) => a + (ranks()[s.id] || 0), 0);

  async function up(id, card) {
    if (busy) return; busy = true;
    const res = await Inventory.exec('skill_up', { id }); busy = false;
    if (res && res.ok) { draw(true); burst(id); if (window.GameFeed) { const s = SKILLS.find(q => q.id === id); GameFeed('✨ ' + s.n + ': ranga ' + res.snapshot.skills[id], 'good'); } }
  }
  function burst(id) {
    const c = root && root.querySelector('.skc[data-id="' + id + '"]'); if (!c) return;
    c.classList.remove('up'); void c.offsetWidth; c.classList.add('up');
    for (let k = 0; k < 14; k++) { const p = el('span', 'skp', ['✨', '⭐', '✦', '💫'][k % 4]); const a = Math.random() * 6.28, d = 50 + Math.random() * 90; p.style.setProperty('--dx', Math.cos(a) * d + 'px'); p.style.setProperty('--dy', Math.sin(a) * d - 20 + 'px'); c.append(p); setTimeout(() => p.remove(), 900); }
    const n = el('span', 'skplus', '+1'); c.append(n); setTimeout(() => n.remove(), 900);
  }

  function draw(force) {
    if (!root || root.hidden || !S()) return;
    const s = S(), eq = equippedWeapon(); if (!tab) tab = eq;
    const sig = [tab, s.lvl, JSON.stringify(s.skills), eq, points()].join('|');
    if (!force && sig === lastSig) return; lastSig = sig;
    const pts = points(), w = SKILL_WEAPONS.find(x => x.k === tab);
    const pc = $('#skpts', root); pc.textContent = pts; pc.parentElement.classList.toggle('has', pts > 0);
    $('#sklvl', root).textContent = 'Poziom ' + s.lvl;
    root.style.setProperty('--wc', w.c);
    const tabs = $('#sktabs', root); tabs.replaceChildren();
    SKILL_WEAPONS.forEach(x => {
      const b = el('button', 'sktab' + (x.k === tab ? ' on' : '')); b.style.setProperty('--wc', x.c);
      b.append(el('i', '', x.ic), el('b', '', x.n), el('small', '', spentFor(x.k) + ' pkt' + (x.k === eq ? ' · założona' : '')));
      b.onclick = () => { tab = x.k; animate = true; draw(true); }; tabs.append(b);
    });
    const grid = $('#skgrid', root); grid.replaceChildren(); grid.classList.toggle('anim', animate); animate = false;
    SKILLS.filter(q => q.w === tab).forEach((sk, i) => {
      const r = ranks()[sk.id] || 0, cap = SKILL_MAX, locked = false, max = r >= SKILL_MAX;
      const card = el('div', 'skc' + (locked ? ' locked' : '') + (r > 0 ? ' learned' : '') + (max ? ' max' : '')); card.dataset.id = sk.id; card.style.setProperty('--i', i);
      card.append(el('span', 'skk', KIND[sk.kind] || ''));
      const ic = el('div', 'skic'); ic.append(el('i', '', sk.ic)); card.append(ic);
      card.append(el('h3', '', sk.n));
      const bar = el('div', 'skbar'); for (let k = 1; k <= SKILL_MAX; k++) bar.append(el('i', k <= r ? 'on' : (k <= cap ? 'cap' : '')));
      card.append(bar);
      card.append(el('div', 'skrank', r + ' / ' + SKILL_MAX + (max ? ' · MAKS' : '')));
      card.append(el('p', 'skdesc', (r > 0 ? '' : 'Ranga 1: ') + sk.desc(Math.max(1, r))));
      if (!locked && !max && r > 0 && r < SKILL_MAX) card.append(el('p', 'sknext', 'Następna ranga (' + (r + 1) + '): ' + sk.desc(r + 1)));
      card.append(el('div', 'skmeta', (sk.mana ? sk.mana + ' many' : 'bez many') + ' · odnowienie ' + (sk.id === 'wd1' ? '75→60' : sk.cd) + ' s'));
      const btn = el('button', 'skup');
      let why = '';
      if (max) why = 'Maksymalna ranga'; else if (pts < 1) why = 'Brak punktów';
      btn.textContent = why || '＋ ULEPSZ'; btn.disabled = !!why; btn.classList.toggle('ready', !why);
      btn.onclick = () => up(sk.id, card); card.append(btn);
      if (locked) card.append(el('div', 'sklock', '🔒 od poz. ' + sk.unlock));
      grid.append(card);
    });
  }

  function build() {
    root = el('div', 'sk-ov'); root.hidden = true;
    root.innerHTML = `<div class="sk-win" role="dialog" aria-label="Umiejętności">
      <div class="sk-head"><b>✨ UMIEJĘTNOŚCI</b><span class="sk-lvl" id="sklvl"></span><span class="sk-pts"><small>PUNKTY</small><b id="skpts">0</b></span><button class="x" id="skx" aria-label="Zamknij">✕</button></div>
      <p class="sk-info">Za każdy poziom dostajesz <b>1 punkt umiejętności</b>. Rozdaj je w umiejętności wybranej broni, a pojawią się w oknie Wypraw, gdzie możesz je używać kliknięciem lub automatycznie.</p>
      <div class="sk-tabs" id="sktabs"></div>
      <div class="sk-grid" id="skgrid"></div>
      <div class="sk-foot"><div class="sk-grade"><span>🥉 Brąz</span><span>🥈 Srebro</span><span>🥇 Złoto</span><small>Po randze 20 umiejętność można ulepszać książkami (wkrótce).</small></div>
        <div class="sk-dev"><small>TEST:</small><button class="btn" id="sklv1">＋1 poziom</button><button class="btn" id="sklv10">＋10 poziomów</button><button class="btn" id="skreset">↺ reset punktów</button></div></div>
    </div>`;
    document.body.append(root);
    $('#skx', root).onclick = close; root.onclick = e => { if (e.target === root) close(); };
    addEventListener('keydown', e => { if (e.key === 'Escape' && root && !root.hidden) close(); });
    const lv = n => async () => { let left = n; while (left > 0 && P.lvl < 99) { const step = Math.min(5, left, 99 - P.lvl); P.lvl += step; left -= step; await Inventory.exec('sync_level', { lvl: P.lvl }); } P.xp = 0; P.hp = hpMax(P); P.mp = mpMax(P); draw(true); };
    $('#sklv1', root).onclick = lv(1); $('#sklv10', root).onclick = lv(10);
    $('#skreset', root).onclick = async () => { await Inventory.exec('skill_reset'); draw(true); };
    addEventListener('inv:update', () => draw(false));
  }
  function open() { if (!root) build(); tab = equippedWeapon(); root.hidden = false; document.body.classList.add('inv-open'); lastSig = ''; animate = true; draw(true); }
  function close() { if (!root) return; root.hidden = true; document.body.classList.remove("inv-open"); }
  window.Skills = { open, close, points };
})();
