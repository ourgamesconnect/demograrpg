// WYBÓR KLASY — Rycerz / Zwiadowca / Mag. Wybór jest jednorazowy i zatwierdzany przez serwer (class_choose).
'use strict';
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const el = (t, c, txt) => { const e = document.createElement(t); if (c) e.className = c; if (txt !== undefined) e.textContent = txt; return e; };
  let root, picked = null, busy = false;
  const START_WEAPON = { sword: 'Drewniany miecz', bow: 'Drewniany łuk', wand: 'Drewniana różdżka' };

  function bar(label, v, max, col) {
    const w = el('div', 'clbar'); w.append(el('span', '', label)); const t = el('div', 'cltrack'), i = el('i'); i.style.width = Math.min(100, 100 * v / max) + '%'; i.style.background = col; t.append(i); w.append(t); return w;
  }
  function draw() {
    const wrap = $('#clcards', root); wrap.replaceChildren();
    Object.entries(CLASSES).forEach(([key, c], idx) => {
      const card = el('div', 'clcard' + (picked === key ? ' picked' : '')); card.style.setProperty('--cc', c.c); card.style.setProperty('--i', idx);
      card.append(el('div', 'clic', c.ic), el('h2', '', c.n), el('div', 'cltag', c.tag), el('p', 'cldesc', c.desc));
      const stats = el('div', 'clstats');
      stats.append(bar('Życie ' + c.hp0, c.hp0, 800, '#ff5a6e'), bar('Mana ' + c.mp0, c.mp0, 320, '#6ab4ff'), bar('Obrażenia', c.dmg, 1.6, '#ffb347'), bar('Obrona', c.def, 1.9, '#9aa0c8'));
      card.append(stats);
      card.append(el('div', 'clweapon', WEAPON_AVAILABLE[c.w] ? '🗡 Broń startowa: ' + START_WEAPON[c.w] : '🗡 Broń startowa: wkrótce'));
      const sk = SKILLS.filter(s => s.w === c.w); const sl = el('div', 'clskills'); sk.forEach(s => sl.append(el('span', '', s.ic + ' ' + s.n))); card.append(sl);
      const pr = el('ul', 'clpros'); c.pros.forEach(t => pr.append(el('li', '', t))); const cn = el('ul', 'clcons'); c.cons.forEach(t => cn.append(el('li', '', t))); card.append(pr, cn);
      const soon = !WEAPON_AVAILABLE[c.w];
      if (soon) card.classList.add('soon');
      const btn = el('button', 'clbtn' + (picked === key ? ' confirm' : ''), soon ? '⏳ WKRÓTCE' : picked === key ? '✔ POTWIERDŹ: klasy nie da się zmienić' : 'WYBIERZ ' + c.n.toUpperCase());
      btn.disabled = busy || soon;
      btn.onclick = async () => {
        if (picked !== key) { picked = key; draw(); return; }
        busy = true; draw(); const r = await Inventory.exec('class_choose', { cls: key }); busy = false;
        if (r && r.ok) { close(); if (window.GameFeed) GameFeed('⚔️ Wybrano klasę: ' + CLASSES[key].n + '. Powodzenia!', 'good'); } else draw();
      };
      card.append(btn); wrap.append(card);
    });
  }
  function build() {
    root = el('div', 'cl-ov'); root.hidden = true;
    root.innerHTML = '<div class="cl-win"><div class="cl-head"><small>NOWA POSTAĆ</small><h1>WYBIERZ SWOJĄ KLASĘ</h1><p>Klasa decyduje o broni, umiejętnościach i stylu walki. Wyboru nie da się później zmienić.</p></div><div class="cl-cards" id="clcards"></div></div>';
    document.body.append(root);
  }
  function open() { if (!root) build(); picked = null; busy = false; root.hidden = false; document.body.classList.add('inv-open'); draw(); }
  function close() { if (!root) return; root.hidden = true; document.body.classList.remove('inv-open'); }
  const need = () => { const s = window.Inventory && Inventory.state; return !!(s && !s.cls); };
  window.addEventListener('inv:update', () => { if (need() && (!root || root.hidden)) open(); });
  window.addEventListener('load', () => setTimeout(() => { if (need()) open(); }, 150));
  window.Classes = { open, close, need };
})();
