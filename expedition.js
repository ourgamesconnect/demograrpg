// WYPRAWY — walka z potworami (prototyp). Łup losuje serwer (Inventory.reward), klient pokazuje efekty.
'use strict';
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const el = (t, c, txt) => { const e = document.createElement(t); if (c) e.className = c; if (txt !== undefined) e.textContent = txt; return e; };
  const rnd = (a, b) => a + Math.random() * (b - a), pick = a => a[Math.floor(Math.random() * a.length)];
  const fmt = n => Math.round(n).toLocaleString('pl-PL');

  // mapy: [nazwa, ikona, waga, poziom potwora (offset), czas zabicia w sekundach]
  const MAPS = [
    { k: 'Pola za wsią', ic: '🌾', req: 1, lvl: 1, tier: 0, mobs: [['Wilk', '🐺', 34, 0, 4], ['Dzik', '🐗', 26, 1, 5], ['Rzezimieszek', '🥷', 20, 2, 6], ['Wygłodniały włóczęga', '🧟', 12, 3, 7], ['Niedźwiedź', '🐻', 8, 4, 9]], boss: ['Herszt Zbójów', '👺'], target: ['Obóz bandytów', '⛺'] },
    { k: 'Mroczny bór', ic: '🌲', req: 8, lvl: 10, tier: 1, mobs: [['Borsuk', '🦡', 34, 0, 4], ['Pająk leśny', '🕷️', 26, 1, 5], ['Wilk alfa', '🐺', 20, 2, 6], ['Leśny rozbójnik', '🏹', 12, 3, 7], ['Wiedźma z bagien', '🧙‍♀️', 8, 4, 9]], boss: ['Król Boru', '🐻'], target: ['Pogański kamień', '🗿'] },
    { k: 'Opuszczona kopalnia', ic: '⛏️', req: 16, lvl: 20, tier: 2, mobs: [['Nietoperz', '🦇', 34, 0, 4], ['Szczur kopalniany', '🐀', 26, 1, 5], ['Zmarły górnik', '🧟', 20, 2, 6], ['Szkielet', '💀', 12, 3, 7], ['Golem skalny', '🪨', 8, 4, 9]], boss: ['Strażnik Szybu', '☠️'], target: ['Zapieczętowana krypta', '⚰️'] },
    { k: 'Zamek w ruinie', ic: '🏰', req: 26, lvl: 30, tier: 3, mobs: [['Zbrojny najemnik', '🛡️', 34, 0, 4], ['Łucznik z wieży', '🏹', 26, 1, 5], ['Rycerz renegat', '🤺', 20, 2, 6], ['Kat', '🪓', 12, 3, 7], ['Mroczny kapłan', '🧙', 8, 4, 9]], boss: ['Czarny Rycerz', '🦹'], target: ['Brama zamku', '🚪'] },
  ];
  let pending = false;
  const serverExp = () => { const s = window.Inventory && Inventory.state; return !!(s && s.activity && s.activity.kind === 'exp'); };
  const ACT_NAMES = { exp: 'Wyprawy', gather: 'Zbieractwo', craft: 'Rzemiosło' };
  const X = { on: false, map: 0, enemy: null, wait: 0, rest: 0, n: 0, kills: 0, bosses: 0, targets: 0, recent: [] };
  let root, stageEl;

  // mnożnik EXP za różnicę poziomów (wzorowany na tabeli z wiki Metin2)
  function diffMult(d) {
    if (d >= 15) return 1.3; if (d >= 0) return 1 + 0.02 * d;
    const t = { '-1': 1, '-2': .98, '-3': .96, '-4': .94, '-5': .92, '-6': .9, '-7': .85, '-8': .8, '-9': .7, '-10': .5, '-11': .3, '-12': .2, '-13': .1, '-14': .05 };
    return d <= -15 ? 0.01 : t[d];
  }
  const equipAtk = () => { const s = window.Inventory && Inventory.state; if (!s) return 0; return Object.values(s.equip).reduce((a, u) => { const it = s.items[u]; return a + (it ? Math.round(it.atk * (1 + it.plus * 0.2)) : 0); }, 0); };
  const weaponKind = () => { const s = Inventory.state, u = s && s.equip.weapon, n = u ? s.items[u].name.toLowerCase() : ''; return /topór/.test(n) ? 'axe' : /włóczn/.test(n) ? 'spear' : /łuk/.test(n) ? 'bow' : /młot/.test(n) ? 'hammer' : /sztylet/.test(n) ? 'dagger' : 'sword'; };
  const playerDmg = () => 12 + P.lvl * 3 + equipAtk();
  const refDmg = m => 12 + m.lvl * 3 + 6 * (m.tier + 1);
  const hpOf = (m, t) => Math.round(refDmg(m) * t / 0.9);

  function spawn(force) {
    const m = MAPS[X.map], r = force === 'boss' ? 0 : force === 'target' ? 0.05 : Math.random();
    let kind = 'mob', def;
    if (r < 0.03) { kind = 'boss'; def = [m.boss[0], m.boss[1], 0, 6, 40]; }
    else if (r < 0.10) { kind = 'target'; def = [m.target[0], m.target[1], 0, 4, 20]; }
    else { const tw = m.mobs.reduce((a, x) => a + x[2], 0); let q = Math.random() * tw; def = m.mobs[0]; for (const x of m.mobs) { q -= x[2]; if (q <= 0) { def = x; break; } } }
    const hp = hpOf(m, def[4]);
    X.enemy = { name: def[0], ic: def[1], kind, lvl: m.lvl + def[3], hp, max: hp, dead: false };
    X.wait = 0; syncEnemy(true);
    if (kind === 'boss') say('☠ BOSS', def[0]); else if (kind === 'target') say('🎯 CEL SPECJALNY', def[0]);
  }

  // ---- tik walki ----
  function tick() {
    if (!X.on) return;
    const hm = hpMax(P), mm = mpMax(P);
    if (P.hp === undefined) P.hp = hm; if (P.mp === undefined) P.mp = mm;
    if (X.rest > 0) { X.rest--; if (X.rest === 0) { P.hp = Math.round(hm * 0.6); say('✔ WSTAJESZ', 'Wracasz do walki'); } sync(); return; }
    if (!X.enemy) { if (X.wait > 0) { X.wait--; return; } spawn(); }
    const e = X.enemy; if (e.dead) { X.enemy = null; X.wait = 1; syncEnemy(false); return; }
    X.n++;
    let dmg = playerDmg() * rnd(0.85, 1.15), crit = Math.random() < 0.18, skill = '';
    if (X.n % 10 === 0 && P.mp >= 40) { P.mp -= 40; dmg *= 3.2; skill = 'furia'; }
    else if (X.n % 5 === 0 && P.mp >= 20) { P.mp -= 20; dmg *= 2.2; skill = 'whirl'; }
    if (crit) dmg *= 1.8; dmg = Math.max(1, Math.round(dmg));
    e.hp = Math.max(0, e.hp - dmg);
    P.mp = Math.min(mm, P.mp + 3);
    fxHit(dmg, crit, skill);
    if (e.hp <= 0) { e.dead = true; kill(e); }
    else if (X.n % 3 === 0) { // przeciwnik oddaje
      const hit = Math.round((3 + e.lvl * 2.4) * (e.kind === 'boss' ? 2.2 : e.kind === 'target' ? 0 : 1) * rnd(0.8, 1.2));
      if (hit > 0) { P.hp = Math.max(0, P.hp - hit); fxHurt(hit); if (P.hp <= 0) { X.rest = 4; X.enemy = null; syncEnemy(false); say('☠ POWALONY', 'Odpoczywasz kilka sekund'); } }
    }
    sync();
  }
  setInterval(tick, 900);
  setInterval(() => { if (P.hp !== undefined) { P.hp = Math.min(hpMax(P), P.hp + hpMax(P) * 0.004); } }, 1000);

  function kill(e) {
    X.kills++; if (e.kind === 'boss') X.bosses++; if (e.kind === 'target') X.targets++;
    const m = MAPS[X.map], mult = diffMult(e.lvl - P.lvl), kmul = e.kind === 'boss' ? 6 : e.kind === 'target' ? 3 : 1;
    const xp = Math.max(1, Math.round(expFor(e.lvl) / 450 * mult * kmul)), gold = Math.round(e.lvl * 2.2 * kmul);
    const need = expFor(P.lvl); P.xp += xp / need; P.gold += gold;
    const cards = [{ t: `+${fmt(xp)} EXP${mult < 0.5 ? ' (za słaby potwór)' : ''}`, c: 'xp' }, { t: `🪙 +${fmt(gold)}`, c: 'gold' }];
    let lv = false; while (P.xp >= 1) { P.xp -= 1; P.lvl++; lv = true; }
    if (lv) { P.hp = hpMax(P); P.mp = mpMax(P); say('⭐ AWANS!', 'Poziom ' + P.lvl); Inventory.exec('sync_level', { lvl: P.lvl }); if (window.GameFeed) GameFeed('⭐ Awans na poziom ' + P.lvl + '!', 'good'); }
    if (window.GameFeed) { if (e.kind === 'boss') GameFeed('☠ Pokonano bossa: ' + e.name, 'boss'); else if (e.kind === 'target') GameFeed('🎯 Zniszczono cel specjalny: ' + e.name, 'good'); }
    window.Inventory.reward({ tier: m.tier, kind: e.kind }).then(res => {
      if (res && !res.ok) { applyServer(); sync(); return; }
      if (res && res.ok) for (const ev of res.events) {
        if (ev.t === 'item_added') { if (ev.where === 'sold') cards.push({ t: `${ev.ic} ${ev.name} → sprzedano (+${ev.gold} 🪙)`, c: 'gold' }); else { const it = res.snapshot.items[ev.uid]; if (it) { cards.push({ t: `${it.ic} ${it.name} (${RARITY[it.rarity].n})${ev.where === 'stash' ? ' → skrytka' : ''}`, c: 'item', col: RARITY[it.rarity].c }); X.recent.unshift({ ic: it.ic, n: it.name, col: RARITY[it.rarity].c }); X.recent.length = Math.min(X.recent.length, 10); } } }
        else if (ev.t === 'mat_added') cards.push({ t: `${MATS[ev.mat] || '📦'} ${ev.mat} ×${ev.qty}`, c: 'mat' });
      }
      showCards(cards); sync();
    });
    fxKill(e);
  }

  // ---- efekty ----
  const visible = () => root && !root.hidden;
  function fx(cls, css, ms = 700, text = '') {
    const f = el('div', 'fx ' + cls, text); for (const [k, v] of Object.entries(css || {})) k.startsWith('--') ? f.style.setProperty(k, v) : (f.style[k] = v);
    $('#xf', root).append(f); setTimeout(() => f.remove(), ms); return f;
  }
  function fxHit(dmg, crit, skill) {
    if (!visible()) return;
    const en = $('#xe', root), cx = 50 + rnd(-5, 5), cy = 50 + rnd(-8, 8), pos = { left: cx + '%', top: cy + '%' };
    const slash = (rot, delay = 0, w = 320) => setTimeout(() => fx('slash' + (crit ? ' crit' : ''), { ...pos, '--rot': rot + 'deg', '--w': w + 'px' }, 450), delay);
    const wk = weaponKind();
    if (wk === 'spear') fx('thrust' + (crit ? ' crit' : ''), { top: cy + '%', left: '0' }, 450);
    else if (wk === 'bow') fx('arrow', { top: (cy + rnd(-6, 6)) + '%', '--tx': cx + '%' }, 420, '➤');
    else if (wk === 'hammer') { fx('shock', pos, 700); shake(); }
    else if (wk === 'dagger') { slash(rnd(-70, -30), 0, 200); slash(rnd(30, 70), 110, 200); }
    else if (wk === 'axe') slash(rnd(-80, -50), 0, 380);
    else slash(rnd(-55, 55), 0, 320);
    if (crit) slash(rnd(60, 110), 90, 360);
    setTimeout(() => {
      en.classList.remove('hitx'); void en.offsetWidth; en.classList.add('hitx');
      fx('impact' + (crit ? ' crit' : ''), pos, 600);
      for (let k = 0; k < (crit ? 12 : 6); k++) { const a = rnd(0, 6.28), d = rnd(60, crit ? 170 : 110); fx('spark', { ...pos, '--dx': Math.cos(a) * d + 'px', '--dy': Math.sin(a) * d + 'px', background: crit ? '#ffd24d' : '#fff' }, 550); }
      fx('xnum' + (crit ? ' crit' : '') + (skill ? ' skill' : ''), { left: (cx + rnd(-14, 14)) + '%', top: (cy - 16) + '%' }, 1000, (crit ? 'KRYT! ' : '') + '−' + fmt(dmg));
      if (crit) { flash(''); shake(); }
    }, wk === 'bow' ? 230 : 120);
    if (skill === 'whirl') { fx('whirl', { left: '50%', top: '52%' }, 900, '🌀'); fx('skilltxt', { left: '50%', top: '20%' }, 1100, '🌀 Cios Wirujący'); }
    if (skill === 'furia') { flash('red'); shake(); fx('skilltxt furia', { left: '50%', top: '28%' }, 1200, '🔥 FURIA!'); }
    const sk = skill ? $('#xs-' + skill, root) : null; if (sk) { sk.classList.remove('cast'); void sk.offsetWidth; sk.classList.add('cast'); }
  }
  function fxKill(e) {
    if (!visible()) return; const en = $('#xe', root); en.classList.add('dead');
    const em = ['✨', '💥', '⭐', '✦', '💫'];
    for (let k = 0; k < 22; k++) { const a = rnd(0, 6.28), d = rnd(90, 260); fx('burst', { left: '50%', top: '52%', '--dx': Math.cos(a) * d + 'px', '--dy': Math.sin(a) * d + 'px', '--rs': rnd(-200, 200) + 'deg' }, 1000, pick(em)); }
    fx('boom', { left: '50%', top: '52%' }, 700); flash(e.kind === 'boss' ? 'red' : e.kind === 'target' ? 'gold' : '');
    if (e.kind !== 'mob') shake();
  }
  function fxHurt(n) { if (!visible()) return; const v = $('#xhurt', root); v.classList.remove('go'); void v.offsetWidth; v.classList.add('go'); fx('hnum', { left: (20 + rnd(-6, 6)) + '%', top: '78%' }, 900, '−' + fmt(n)); }
  function flash(c) { const f = $('#xflash', root); f.className = 'xflash ' + c; void f.offsetWidth; f.classList.add('go'); }
  function shake() { const w = $('#xstage', root); w.classList.remove('shake'); void w.offsetWidth; w.classList.add('shake'); }
  function say(big, small) { if (!visible()) return; const b = $('#xbanner', root); b.replaceChildren(el('b', '', big), el('small', '', small)); b.classList.remove('show'); void b.offsetWidth; b.classList.add('show'); }
  let cardT = null;
  function showCards(cards) {
    if (!visible()) return; const box = $('#xloot', root); box.replaceChildren();
    cards.forEach((c, i) => { const d = el('div', 'lcard ' + (c.c || ''), c.t); if (c.col) d.style.borderColor = c.col; d.style.animationDelay = (i * 0.1) + 's'; box.append(d); });
    clearTimeout(cardT); cardT = setTimeout(() => box.replaceChildren(), 2800);
  }

  // ---- widok ----
  function syncEnemy(spawned) {
    if (!root) return; const en = $('#xe', root), pan = $('#xpanel', root), e = X.enemy;
    if (!e) { en.classList.add('gone'); pan.classList.add('hidden'); return; }
    en.textContent = e.ic; en.className = 'xenemy ' + e.kind; if (spawned) { void en.offsetWidth; en.classList.add('spawn'); }
    stageEl.classList.toggle('bosswin', e.kind === 'boss'); stageEl.classList.toggle('targetwin', e.kind === 'target');
    pan.classList.remove('hidden'); pan.className = 'xpanel ' + e.kind;
    $('#xname', root).textContent = (e.kind === 'boss' ? '☠ BOSS · ' : e.kind === 'target' ? '🎯 CEL · ' : '') + e.name + `  (poz. ${e.lvl})`;
  }
  // stan „czy trwa wyprawa" zawsze pochodzi z serwera (klient go nie zmienia sam)
  function applyServer() {
    const on = serverExp();
    if (X.on && !on) { X.enemy = null; X.rest = 0; syncEnemy(false); }
    X.on = on;
  }
  window.addEventListener('inv:update', () => { applyServer(); sync(); });
  function sync() {
    if (!root) return;
    const busyOther = (() => { const s = Inventory.state; return s && s.activity && s.activity.kind !== 'exp' ? ACT_NAMES[s.activity.kind] : null; })(); const e = X.enemy, hm = hpMax(P), mm = mpMax(P);
    if (e) { $('#xbar', root).style.width = (100 * e.hp / e.max) + '%'; $('#xtxt', root).textContent = `${fmt(e.hp)} / ${fmt(e.max)} HP`; }
    $('#xhp', root).style.width = (100 * P.hp / hm) + '%'; $('#xhpt', root).textContent = `${fmt(P.hp)} / ${fmt(hm)}`;
    $('#xmp', root).style.width = (100 * P.mp / mm) + '%'; $('#xmpt', root).textContent = `${fmt(P.mp)} / ${fmt(mm)}`;
    $('#xxp', root).style.width = (100 * P.xp) + '%'; $('#xlvl', root).textContent = 'Poz. ' + P.lvl;
    $('#xgold', root).textContent = fmt(P.gold);
    const sb = $('#xstart', root); sb.textContent = busyOther ? '🔒 Zajęty: ' + busyOther : (X.on ? '⏸ Zatrzymaj wyprawę' : '▶ ZACZNIJ WYPRAWĘ');
    sb.disabled = pending || !!busyOther; sb.classList.toggle('go', !X.on && !busyOther);
    $('#xboss', root).disabled = !X.on; $('#xtarget', root).disabled = !X.on;
    $('#xstat', root).textContent = `Pokonanych: ${X.kills} · Bossów: ${X.bosses} · Celów specjalnych: ${X.targets}`;
    const rc = $('#xrecent', root); rc.replaceChildren(); X.recent.forEach(r => { const c = el('span', 'xchip', r.ic + ' ' + r.n); c.style.borderColor = r.col; rc.append(c); });
    const tiles = $('#xmaps', root); tiles.replaceChildren();
    MAPS.forEach((m, i) => { const open = P.lvl >= m.req, b = el('button', 'xmap' + (X.map === i ? ' on' : '') + (open ? '' : ' lock')); b.disabled = !open || X.on || pending; if (X.on && open && X.map !== i) b.title = 'Zatrzymaj wyprawę, aby zmienić mapę'; b.append(el('i', '', open ? m.ic : '🔒'), el('b', '', m.k), el('small', '', open ? `poziom potworów ${m.lvl}+` : `od poziomu ${m.req}`)); b.onclick = () => { if (X.map === i) return; X.map = i; X.enemy = null; X.wait = 0; stageEl.dataset.map = i; syncEnemy(false); sync(); }; tiles.append(b); });
  }

  function build() {
    root = el('div', 'xp-ov'); root.hidden = true;
    root.innerHTML = `<div class="xp-win" role="dialog" aria-label="Wyprawy">
      <div class="xp-head"><b>⚔️ WYPRAWY</b><span class="xp-lv" id="xlvl">Poz. 1</span><div class="xp-bar"><i id="xxp"></i></div><span class="xp-gold">🪙 <b id="xgold">0</b></span><button class="x" id="xclose" aria-label="Zamknij">✕</button></div>
      <div class="xp-stage" id="xstage" data-map="0">
        <div class="xbg"></div><div class="xparts" id="xparts"></div>
        <div class="xpanel hidden" id="xpanel"><b id="xname"></b><div class="ebar"><i id="xbar"></i></div><small id="xtxt"></small></div>
        <div class="xshadow"></div><div class="xenemy gone" id="xe">🐺</div>
        <div class="xfield" id="xf"></div><div class="xloot" id="xloot"></div><div class="xbanner" id="xbanner"></div>
        <div class="xflash" id="xflash"></div><div class="xhurt" id="xhurt"></div>
        <div class="xvitals"><div class="vb hp"><i id="xhp"></i><span>ŻYCIE <b id="xhpt"></b></span></div><div class="vb mp"><i id="xmp"></i><span>MANA <b id="xmpt"></b></span></div></div>
        <div class="xhot"><span id="xs-whirl">🌀<small>Cios Wirujący · 20</small></span><span id="xs-furia">🔥<small>Furia · 40</small></span></div>
      </div>
      <div class="xp-ctl"><button class="xstart go" id="xstart">▶ ZACZNIJ WYPRAWĘ</button><button class="xdev" id="xboss">☠ Boss (test)</button><button class="xdev" id="xtarget">🎯 Cel (test)</button></div>
      <div id="xmaps" class="xmaps"></div>
      <div class="xp-foot"><span id="xstat"></span><div id="xrecent" class="xrecent"></div></div>
    </div>`;
    document.body.append(root); stageEl = $('#xstage', root);
    $('#xclose', root).onclick = close; root.onclick = e => { if (e.target === root) close(); };
    addEventListener('keydown', e => { if (e.key === 'Escape' && visible()) close(); });
    $('#xboss', root).onclick = () => { if (!X.on) return; X.enemy = null; spawn('boss'); sync(); };
    $('#xtarget', root).onclick = () => { if (!X.on) return; X.enemy = null; spawn('target'); sync(); };
    $('#xstart', root).onclick = async () => {
      if (pending) return; pending = true; sync();
      const res = X.on ? await Inventory.exec('activity_stop') : await Inventory.exec('activity_start', { kind: 'exp', detail: MAPS[X.map].k });
      pending = false; applyServer(); sync(); void res;
    };
    const p = $('#xparts', root); for (let k = 0; k < 20; k++) { const i = el('i'); i.style.left = rnd(2, 98) + '%'; i.style.top = rnd(10, 90) + '%'; i.style.animationDelay = rnd(0, 6) + 's'; i.style.animationDuration = rnd(5, 10) + 's'; p.append(i); }
  }
  function open() { if (!root) { build(); X.map = Math.max(0, MAPS.reduce((a, m, i) => P.lvl >= m.req ? i : a, 0)); stageEl.dataset.map = X.map; } root.hidden = false; document.body.classList.add('inv-open'); syncEnemy(false); sync(); }
  function close() { root.hidden = true; document.body.classList.remove('inv-open'); }
  window.Expedition = { open, close, get running() { return X.on; }, get map() { return MAPS[X.map].k; } };
})();
