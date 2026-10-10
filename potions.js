// ALCHEMIK — sklep z miksturami życia i many (zakup liczy serwer: potion_buy). Limit: POTION_MAX sztuk każdej.
'use strict';
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const el = (t, c, txt) => { const e = document.createElement(t); if (c) e.className = c; if (txt !== undefined) e.textContent = txt; return e; };
  const fmt = n => Math.round(n).toLocaleString('pl-PL');
  let root, busy = false, lastGold = null;
  const S = () => (window.Inventory && Inventory.state) || { gold: 0, potions: {} };
  function burst(btn) {
    const r = btn.getBoundingClientRect();
    for (let i = 0; i < 10; i++) { const p = el('i', 'pt-spark', '✦'); p.style.left = (r.x + r.width / 2) + 'px'; p.style.top = (r.y + r.height / 2) + 'px'; p.style.setProperty('--dx', (Math.random() * 120 - 60) + 'px'); p.style.setProperty('--dy', (-30 - Math.random() * 90) + 'px'); document.body.append(p); setTimeout(() => p.remove(), 900); }
  }
  async function buy(id, n, btn) {
    if (busy) return; busy = true; const res = await Inventory.exec('potion_buy', { id, n }); busy = false;
    if (res && res.ok) { burst(btn); const row = $('[data-id="' + id + '"]', root); if (row) { row.classList.remove('bought'); void row.offsetWidth; row.classList.add('bought'); } }
    else if (res && res.error) toastMsg(res.error);
    draw();
  }
  function toastMsg(t) { const b = $('#ptmsg', root); b.textContent = t; b.classList.add('on'); clearTimeout(b._t); b._t = setTimeout(() => b.classList.remove('on'), 2200); }
  function draw() {
    if (!root || root.hidden) return;
    const s = S(); $('#ptgold', root).textContent = fmt(s.gold);
    const list = $('#ptlist', root); list.replaceChildren();
    Object.entries(POTIONS).forEach(([id, pd]) => {
      const have = (s.potions || {})[id] || 0, row = el('div', 'ptrow ' + pd.kind); row.dataset.id = id;
      const ic = el('div', 'ptic'); ic.append(el('i', 'ptliq'), el('em', '', pd.ic)); ic.classList.add('sz' + pd.size);
      const mid = el('div', 'ptmid'); mid.append(el('b', '', pd.n), el('small', '', (pd.kind === 'hp' ? '❤ Leczy ' : '💧 Przywraca ') + pd.v + (pd.kind === 'hp' ? ' HP' : ' MP') + ' stopniowo, przez ' + pd.secs + ' s'));
      const bar = el('div', 'ptbar'), f = el('i'); f.style.width = (100 * have / POTION_MAX) + '%'; bar.append(f); mid.append(bar);
      const own = el('div', 'ptown'); own.append(el('b', '', fmt(have)), el('small', '', '/ ' + fmt(POTION_MAX)));
      const price = el('div', 'ptprice', '🪙 ' + pd.price);
      const bts = el('div', 'ptbts'); const room = POTION_MAX - have, can = Math.floor(s.gold / pd.price);
      [1, 10, 100].forEach(n => { const b = el('button', '', '+' + n); b.disabled = busy || room < 1 || can < n && n > 1 && can < 1 || can < 1; b.onclick = () => buy(id, n, b); bts.append(b); });
      const mx = el('button', 'max', 'MAX'); mx.disabled = busy || room < 1 || can < 1; mx.onclick = () => buy(id, room, mx); bts.append(mx);
      row.append(ic, mid, own, price, bts); list.append(row);
    });
  }
  function build() {
    root = el('div', 'pt-ov'); root.hidden = true;
    root.innerHTML = '<div class="pt-win" role="dialog" aria-label="Alchemik"><div class="pt-head"><b>⚗️ ALCHEMIK</b><span class="pt-gold">🪙 <b id="ptgold">0</b></span><button class="x" id="ptx" aria-label="Zamknij">✕</button></div><p class="pt-note">Mikstury leczą stopniowo, tak jak w Metin2. W walce użyjesz ich klawiszami Q W E (życie) i A S D (mana) albo włączysz automat poniżej wybranego progu.</p><div class="pt-msg" id="ptmsg"></div><div id="ptlist" class="pt-list"></div></div>';
    document.body.append(root);
    $('#ptx', root).onclick = close; root.onclick = e => { if (e.target === root) close(); };
    addEventListener('keydown', e => { if (e.key === 'Escape' && root && !root.hidden) close(); });
    window.addEventListener('inv:update', draw);
  }
  function open() { if (!root) build(); root.hidden = false; document.body.classList.add('inv-open'); draw(); }
  function close() { if (!root) return; root.hidden = true; document.body.classList.remove('inv-open'); }
  window.Potions = { open, close };
})();
