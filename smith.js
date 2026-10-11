// KOWAL — ulepszanie przedmiotów +0 … +9 (serwer: smith_upgrade). Porażka: przedmiot zostaje, koszt przepada.
'use strict';
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const el = (t, c, txt) => { const e = document.createElement(t); if (c) e.className = c; if (txt !== undefined) e.textContent = txt; return e; };
  const fmt = n => Math.round(n).toLocaleString('pl-PL');
  const TYPE_N = { weapon: 'Broń', helm: 'Hełm', armor: 'Zbroja', boots: 'Buty', shield: 'Tarcza', earrings: 'Kolczyki', necklace: 'Naszyjnik', bracelet: 'Bransoletka', ring: 'Pierścień' };
  let root, sel = null, busy = false;
  const S = () => (window.Inventory && Inventory.state) || { items: {}, equip: {}, slots: [], stash: [], gold: 0, mats: {} };
  function effect(it, plus) {
    const t = { ...it, plus };
    if (it.type === 'weapon') { const q = itemStats(t); return '⚔ Atak ' + (q.lo !== q.hi ? q.lo + '–' + q.hi : q.atk); }
    if (it.type === 'earrings') return '✨ +' + earringPoints(t) + ' pkt statusu (' + EARRING_STATS[it.statKey] + ')';
    if (it.type === 'necklace') return '⚡ −' + necklaceHaste(t) + '% odnowienia umiejętności';
    if (it.type === 'bracelet') return '⚡ +' + braceletSpeed(t) + '% szybkości ataku';
    if (it.type === 'ring') return (it.ringKind === 'mp' ? '💧 +' + ringValue(t) + ' maks. many' : '❤️ +' + ringValue(t) + ' maks. życia');
    return '🛡 Obrona ' + itemStats(t).def;
  }
  function list() {
    const s = S(), out = [], where = u => (Object.values(s.equip).includes(u) ? 'założony' : s.stash.includes(u) ? 'skrytka' : 'plecak');
    const seen = new Set(); const add = u => { if (!u || seen.has(u)) return; const it = s.items[u]; if (it && SMITH_TYPES.includes(it.type)) { seen.add(u); out.push({ it, w: where(u) }); } };
    Object.values(s.equip).forEach(add); s.slots.forEach(add); s.stash.forEach(add);
    return out;
  }
  function spark(x, y, n, col) {
    for (let i = 0; i < n; i++) { const p = el('i', 'sm-spark', '✦'); p.style.left = x + 'px'; p.style.top = y + 'px'; p.style.color = col; p.style.setProperty('--dx', (Math.random() * 360 - 180) + 'px'); p.style.setProperty('--dy', (-40 - Math.random() * 200) + 'px'); document.body.append(p); setTimeout(() => p.remove(), 1100); }
  }
  async function upgrade() {
    if (busy || !sel) return; const it = S().items[sel]; if (!it) return;
    busy = true; const stage = $('#smstage', root); stage.classList.add('hit'); $('#smbtn', root).disabled = true;
    const r0 = stage.getBoundingClientRect(); setTimeout(() => spark(r0.x + r0.width / 2, r0.y + r0.height / 2, 14, '#ffb347'), 380);
    const p = Inventory.exec('smith_upgrade', { uid: sel });
    await new Promise(q => setTimeout(q, 900));
    const res = await p; stage.classList.remove('hit');
    const ev = res && res.ok && res.events && res.events.find(e => e.t === 'smith');
    const r1 = stage.getBoundingClientRect(), banner = $('#smresult', root);
    if (ev && ev.ok) { stage.classList.add('win'); spark(r1.x + r1.width / 2, r1.y + r1.height / 2, 40, '#ffe066'); banner.textContent = '✨ SUKCES! +' + ev.plus; banner.className = 'smresult win show'; }
    else if (ev) { stage.classList.add('lose'); spark(r1.x + r1.width / 2, r1.y + r1.height / 2, 12, '#ff5a6e'); banner.textContent = '💥 NIEPOWODZENIE — przedmiot został, koszt przepadł'; banner.className = 'smresult lose show'; }
    else { banner.textContent = '⚠ ' + ((res && res.error) || 'Błąd'); banner.className = 'smresult err show'; }
    setTimeout(() => { stage.classList.remove('win', 'lose'); banner.classList.remove('show'); }, 1800);
    busy = false; draw();
  }
  function draw() {
    if (!root || root.hidden) return;
    const s = S(); $('#smgold', root).textContent = fmt(s.gold);
    const items = list(), lst = $('#smlist', root); lst.replaceChildren();
    if (sel && !s.items[sel]) sel = null;
    if (!sel && items.length) sel = items[0].it.uid;
    items.forEach(({ it, w }) => {
      const r = RARITY[it.rarity], b = el('button', 'smitem' + (it.uid === sel ? ' on' : '') + (it.plus >= 9 ? ' max' : ''));
      b.style.setProperty('--rc', r.c); b.append(el('i', '', it.ic), el('b', '', it.name + ' +' + (it.plus | 0)), el('small', '', TYPE_N[it.type] + ' · ' + w + (it.bonus && it.bonus.length ? ' · ' + it.bonus.length + ' bon.' : '')));
      b.onclick = () => { sel = it.uid; draw(); }; lst.append(b);
    });
    if (!items.length) lst.append(el('p', 'smempty', 'Nie masz żadnych przedmiotów do ulepszenia.'));
    const d = $('#smdetail', root); d.replaceChildren();
    const it = sel && s.items[sel]; if (!it) { d.append(el('p', 'smempty', 'Wybierz przedmiot z listy.')); return; }
    const n = (it.plus | 0) + 1, r = RARITY[it.rarity];
    const stage = el('div', 'smstage'); stage.id = 'smstage'; stage.style.setProperty('--rc', r.c);
    stage.append(el('div', 'smglow'), el('em', 'smitemic', it.ic), el('span', 'smhammer', '🔨'), el('div', 'smanvil', '⚒'));
    const res = el('div', 'smresult'); res.id = 'smresult'; stage.append(res);
    d.append(stage, el('h3', '', it.name + ' +' + (it.plus | 0)));
    if (n > 9) { d.append(el('p', 'smmax', '★ Maksymalne ulepszenie +9 ★')); return; }
    const cost = SMITH_COST[n], pr = SMITH_P[n], mat = smithMat(n), have = mat ? (s.mats[mat] || 0) : 0;
    const eff = el('div', 'smeff'); eff.append(el('span', '', effect(it, it.plus | 0)), el('b', '', '→'), el('span', 'nxt', effect(it, n))); d.append(eff);
    const chance = el('div', 'smchance'); chance.style.setProperty('--p', (pr * 100) + '%');
    chance.append(el('div', 'smring'), el('b', '', Math.round(pr * 100) + '%'), el('small', '', 'szansa na +' + n)); d.append(chance);
    const need = el('div', 'smneed'); need.append(el('div', s.gold >= cost ? 'ok' : 'bad', '🪙 Koszt: ' + fmt(cost) + ' (masz ' + fmt(s.gold) + ')'));
    if (mat) need.append(el('div', have >= 1 ? 'ok' : 'bad', '🪵 Wymagany surowiec: 1× ' + mat + ' (masz ' + have + ')'));
    d.append(need);
    d.append(el('p', 'smnote', 'Porażka: przedmiot zostaje na tym samym poziomie, ale złoto i surowiec przepadają.'));
    const btn = el('button', 'smbtn', '🔨 ULEPSZ NA +' + n); btn.id = 'smbtn';
    btn.disabled = busy || s.gold < cost || (mat && have < 1) || (Inventory.state.activity && Inventory.state.activity.kind === 'exp');
    btn.onclick = upgrade; d.append(btn);
  }
  function build() {
    root = el('div', 'sm-ov'); root.hidden = true;
    root.innerHTML = '<div class="sm-win" role="dialog" aria-label="Kowal"><div class="sm-head"><b>🔨 KOWAL</b><span class="sm-gold">🪙 <b id="smgold">0</b></span><button class="x" id="smx" aria-label="Zamknij">✕</button></div><div class="sm-body"><div class="sm-list" id="smlist"></div><div class="sm-detail" id="smdetail"></div></div></div>';
    document.body.append(root);
    $('#smx', root).onclick = close; root.onclick = e => { if (e.target === root) close(); };
    addEventListener('keydown', e => { if (e.key === 'Escape' && root && !root.hidden) close(); });
    window.addEventListener('inv:update', () => { if (!busy) draw(); });
  }
  function open() {
    const a = S().activity; if (a && a.kind === 'exp') { if (window.GameFeed) GameFeed('🔨 Kowal jest dostępny dopiero po zakończeniu wyprawy.', 'warn'); return; }
    if (!root) build(); root.hidden = false; document.body.classList.add('inv-open'); draw();
  }
  function close() { if (!root) return; root.hidden = true; document.body.classList.remove('inv-open'); }
  window.Smith = { open, close };
})();
