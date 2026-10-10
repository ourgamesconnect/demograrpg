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
  const weaponKind = () => { const s = Inventory.state, u = s && s.equip.weapon, n = u ? s.items[u].name.toLowerCase() : ''; return /łuk/.test(n) ? 'bow' : /różdżk/.test(n) ? 'wand' : 'sword'; };
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
    X.wait = 0; SK.dot = null; SK.vuln = null; SK.channel = null; SK.windup = null; SK.stun = 0; SK.charges = 0; syncEnemy(true);
    if (kind === 'boss') say('☠ BOSS', def[0]); else if (kind === 'target') say('🎯 CEL SPECJALNY', def[0]);
  }

  // ---- umiejętności w walce ----
  const SK = { ready: {}, auto: {}, until: {}, charges: 0, dot: null, dotSkill: null, vuln: null, stun: 0, channel: null, windup: null };
  const ranks = () => (window.Inventory && Inventory.state && Inventory.state.skills) || {};
  const rankOf = id => ranks()[id] || 0;
  const mySkills = () => { const wk = weaponKind(); return SKILLS.filter(s => s.w === wk && rankOf(s.id) > 0); };
  const buffOn = id => (SK.until[id] || 0) > Date.now();
  const cdOf = s => (s.id === 'wd1' ? s.p(rankOf(s.id)).cd : s.cd);
  const cdLeft = s => Math.max(0, ((SK.ready[s.id] || 0) - Date.now()) / 1000);
  const costOf = s => (buffOn('wd1') && s.id !== 'wd1' ? 0 : s.mana);
  const isAuto = s => SK.auto[s.id] !== false;     // domyślnie automatyczne użycie włączone
  const aspdFactor = () => Math.max(0.4, 1 + (buffOn('bw1') ? SKILLS.find(s => s.id === 'bw1').p(rankOf('bw1')).aspd : 0) + (buffOn('sw2') ? SKILLS.find(s => s.id === 'sw2').p(rankOf('sw2')).aspd : 0));
  const atkBuff = () => (buffOn('sw1') ? 1 + SKILLS.find(s => s.id === 'sw1').p(rankOf('sw1')).atk : 1);
  function dealDamage(mult, skill) {
    const e = X.enemy; if (!e || e.dead) return 0;
    let dmg = playerDmg() * mult * rnd(0.9, 1.1); const crit = Math.random() < 0.18; if (crit) dmg *= 1.8;
    if (SK.vuln && SK.vuln.until > Date.now()) dmg *= 1 + SK.vuln.v;
    dmg = Math.max(1, Math.round(dmg)); e.hp = Math.max(0, e.hp - dmg);
    fxHit(dmg, crit, skill);
    if (e.hp <= 0 && !e.dead) { e.dead = true; kill(e); }
    return dmg;
  }
  function canCast(s) {
    if (!X.on || X.rest > 0 || SK.windup || SK.channel) return false;
    if (s.kind !== 'buff' && (!X.enemy || X.enemy.dead)) return false;
    return cdLeft(s) === 0 && P.mp >= costOf(s);
  }
  function autoWants(s) {
    const e = X.enemy, r = rankOf(s.id), p = s.p(r);
    switch (s.kind) {
      case 'buff': return !buffOn(s.id) && !!e;
      case 'dot': return !(SK.dot && SK.dot.until > Date.now());
      case 'execute': return !!e && e.hp / e.max < p.thr;
      case 'detonate': return SK.charges >= 3;
      case 'nuke': return !!e && e.kind !== 'mob';        // mocne odnowienie: automat oszczędza na bossy i cele
      case 'debuff': return !(SK.vuln && SK.vuln.until > Date.now());
      default: return true;
    }
  }
  // wykonanie umiejętności (z automatu lub kliknięcia)
  function cast(s, manual) {
    if (!canCast(s)) { if (manual) cardMsg(s); return false; }
    const r = rankOf(s.id), p = s.p(r), now = Date.now();
    P.mp -= costOf(s); SK.ready[s.id] = now + cdOf(s) * 1000;
    flashBtn(s.id);
    switch (s.kind) {
      case 'buff': SK.until[s.id] = now + s.dur * 1000; if (visible()) fx('skilltxt', { left: '50%', top: '24%' }, 1100, s.ic + ' ' + s.n); break;
      case 'strike': dealDamage(p.mult, s); if (s.charge) SK.charges = Math.min(3, SK.charges + s.charge); break;
      case 'debuff': dealDamage(p.mult, s); SK.vuln = { until: now + s.vdur * 1000, v: p.vuln }; break;
      case 'execute': { const e = X.enemy, low = e && e.hp / e.max < p.thr; dealDamage(p.mult + (low ? p.bonus : 0), s); break; }
      case 'dot': SK.dot = { until: now + s.dur * 1000, dpt: p.dpt }; SK.dotSkill = s; if (visible()) fx('skilltxt', { left: '50%', top: '24%' }, 1100, s.ic + ' ' + s.n); break;
      case 'detonate': { const full = SK.charges >= 3; dealDamage(full ? p.mult : p.weak, s); if (full) SK.stun = 1; SK.charges = 0; break; }
      case 'nuke':
        if (s.windup) { SK.windup = { s, ticks: s.windup }; if (visible()) fx('skilltxt', { left: '50%', top: '24%' }, 1500, s.ic + ' ' + s.n + '…'); }
        else dealDamage(p.mult, s);
        break;
      case 'channel': SK.channel = { s, i: 0, left: s.ticks }; break;
    }
    return true;
  }
  function cardMsg(s) { if (!visible()) return; const why = cdLeft(s) > 0 ? 'odnowienie ' + Math.ceil(cdLeft(s)) + ' s' : P.mp < costOf(s) ? 'brak many' : (!X.on ? 'wyprawa nie trwa' : 'teraz niedostępne'); say(s.ic + ' ' + s.n, why); }

  // ---- tik walki ----
  function tick() {
    if (!X.on) return;
    const hm = hpMax(P), mm = mpMax(P);
    if (P.hp === undefined) P.hp = hm; if (P.mp === undefined) P.mp = mm;
    if (X.rest > 0) { X.rest--; if (X.rest === 0) { P.hp = Math.round(hm * 0.6); say('✔ WSTAJESZ', 'Wracasz do walki'); } sync(); return; }
    if (!X.enemy) { if (X.wait > 0) { X.wait--; return; } spawn(); }
    const e = X.enemy; if (e.dead) { X.enemy = null; X.wait = 1; syncEnemy(false); return; }
    X.n++;
    P.mp = Math.min(mm, P.mp + 3);
    // obrażenia w czasie (Grad Kłów)
    if (SK.dot && SK.dot.until > Date.now()) dealDamage(SK.dot.dpt, SK.dotSkill);
    if (e.dead) { sync(); return; }
    // działanie gracza w tym tiku
    if (SK.windup) { SK.windup.ticks--; if (SK.windup.ticks <= 0) { const w = SK.windup; SK.windup = null; dealDamage(w.s.p(rankOf(w.s.id)).mult, w.s); } }
    else if (SK.channel) {
      const ch = SK.channel, p = ch.s.p(rankOf(ch.s.id)), cost = costOf(ch.s) ? ch.s.mana : 0;
      if (P.mp < cost) { SK.channel = null; if (visible()) say('🔆 Promień wygasł', 'brak many'); }
      else { P.mp -= cost; dealDamage(p.mult * (1 + p.ramp * ch.i), ch.s); ch.i++; ch.left--; if (ch.left <= 0) SK.channel = null; }
    } else {
      let did = false;
      const list = mySkills().filter(s => isAuto(s)).sort((a, b) => (b.kind === 'buff') - (a.kind === 'buff'));
      for (const s of list) { if (autoWants(s) && cast(s, false)) { did = true; break; } }
      if (!did) {
        dealDamage(atkBuff() * aspdFactor(), null);   // atak podstawowy
      }
    }
    if (e.dead) { sync(); return; }
    // przeciwnik oddaje co 3. tik (nie, gdy ogłuszony)
    if (X.n % 3 === 0) {
      if (SK.stun > 0) { SK.stun--; if (visible()) fx('skilltxt', { left: '50%', top: '30%' }, 800, '💫 ogłuszony'); }
      else {
        let hit = (3 + e.lvl * 2.4) * (e.kind === 'boss' ? 2.2 : e.kind === 'target' ? 0 : 1) * rnd(0.8, 1.2);
        if (buffOn('sw1')) hit *= 1.2;
        if (buffOn('sw2')) hit *= 1 - SKILLS.find(s => s.id === 'sw2').p(rankOf('sw2')).red;
        hit = Math.round(hit);
        if (hit > 0) {
          if (SK.channel && e.kind === 'boss') { SK.channel = null; if (visible()) say('🔆 Promień przerwany', 'silny atak bossa'); }
          P.hp = Math.max(0, P.hp - hit); fxHurt(hit);
          if (P.hp <= 0) { X.rest = 4; X.enemy = null; SK.channel = null; SK.windup = null; syncEnemy(false); say('☠ POWALONY', 'Odpoczywasz kilka sekund'); }
        }
      }
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
    if (lv) { P.hp = hpMax(P); P.mp = mpMax(P); say('⭐ AWANS!', 'Poziom ' + P.lvl); Inventory.exec('sync_level', { lvl: P.lvl }); if (window.GameFeed) { GameFeed('⭐ Awans na poziom ' + P.lvl + '!', 'good'); GameFeed('✨ Nowy punkt umiejętności! Otwórz Umiejętności.', 'good'); } }
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
    if (wk === 'bow') fx('arrow', { top: (cy + rnd(-6, 6)) + '%', '--tx': cx + '%' }, 420, '➤');
    else if (wk === 'wand') { fx('orb', { top: (cy + rnd(-6, 6)) + '%', '--tx': cx + '%' }, 380, '🔮'); setTimeout(() => fx('arcane' + (crit ? ' crit' : ''), pos, 650), 230); }
    else slash(rnd(-55, 55), 0, 320);
    if (crit) slash(rnd(60, 110), 90, 360);
    setTimeout(() => {
      en.classList.remove('hitx'); void en.offsetWidth; en.classList.add('hitx');
      fx('impact' + (crit ? ' crit' : ''), pos, 600);
      for (let k = 0; k < (crit ? 12 : 6); k++) { const a = rnd(0, 6.28), d = rnd(60, crit ? 170 : 110); fx('spark', { ...pos, '--dx': Math.cos(a) * d + 'px', '--dy': Math.sin(a) * d + 'px', background: crit ? '#ffd24d' : '#fff' }, 550); }
      fx('xnum' + (crit ? ' crit' : '') + (skill && skill.n ? ' skill' : ''), { left: (cx + rnd(-14, 14)) + '%', top: (cy - 16) + '%' }, 1000, (crit ? 'KRYT! ' : '') + '−' + fmt(dmg));
      if (crit) { flash(''); shake(); }
    }, wk === 'bow' ? 230 : wk === 'wand' ? 240 : 120);
    if (skill && skill.n) { fx('skilltxt' + (skill.kind === 'nuke' ? ' furia' : ''), { left: '50%', top: '22%' }, 1100, skill.ic + ' ' + skill.n); if (skill.kind === 'nuke') { flash('red'); shake(); } else if (skill.kind === 'strike' || skill.kind === 'debuff' || skill.kind === 'execute') fx('whirl', { left: '50%', top: '52%' }, 900, skill.ic); }
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
  // ---- pasek umiejętności (kliknięcie = użycie, AUTO = automatycznie) ----
  function flashBtn(id) { const b = root && root.querySelector('.sk[data-id="' + id + '"]'); if (b) { b.classList.remove('cast'); void b.offsetWidth; b.classList.add('cast'); } }
  function drawSkillBar() {
    if (!root) return; const box = $('#xskills', root), list = mySkills(), sig = list.map(s => s.id + ':' + rankOf(s.id) + ':' + (isAuto(s) ? 1 : 0)).join(',') + '|' + weaponKind();
    if (box.dataset.sig !== sig) {
      box.dataset.sig = sig; box.replaceChildren();
      if (!list.length) {
        const h = el('div', 'sk-hint'); h.append(el('span', '', '✨ Brak umiejętności dla tej broni. '), Object.assign(el('button', 'sk-link', 'Rozdaj punkty'), { onclick: () => { close(); Skills.open(); } })); box.append(h);
      }
      list.forEach((s, i) => {
        const b = el('button', 'sk'); b.dataset.id = s.id; b.title = s.n + ' · ranga ' + rankOf(s.id) + '\n' + s.desc(rankOf(s.id));
        b.append(el('span', 'sk-key', String(i + 1)), el('i', 'sk-ic', s.ic), el('b', 'sk-n', s.n), el('small', 'sk-m', (s.mana ? s.mana + ' many' : 'bez many') + ' · ' + Math.round(cdOf(s)) + ' s'), el('em', 'sk-r', 'r.' + rankOf(s.id)));
        const au = el('span', 'sk-auto' + (isAuto(s) ? ' on' : ''), 'AUTO'); au.title = 'Automatyczne użycie';
        au.onclick = e => { e.stopPropagation(); SK.auto[s.id] = !isAuto(s); box.dataset.sig = ''; drawSkillBar(); };
        b.append(au); b.onclick = () => cast(s, true); box.append(b);
      });
    }
    box.querySelectorAll('.sk').forEach(b => {
      const s = SKILLS.find(q => q.id === b.dataset.id), left = cdLeft(s), tot = cdOf(s);
      b.style.setProperty('--cd', tot ? Math.min(1, left / tot).toFixed(3) : 0);
      b.classList.toggle('cooling', left > 0); b.classList.toggle('nomana', left === 0 && P.mp < costOf(s)); b.classList.toggle('active', buffOn(s.id) || (SK.channel && SK.channel.s.id === s.id) || (SK.dotSkill && SK.dotSkill.id === s.id && SK.dot && SK.dot.until > Date.now()));
      const ch = b.querySelector('.sk-m'); if (ch && s.id === 'wd2') ch.textContent = 'ładunki ' + SK.charges + '/3 · ' + (s.mana || 0) + ' many';
    });
  }
  setInterval(() => { if (visible()) drawSkillBar(); }, 200);
  addEventListener('keydown', e => { if (!visible() || e.target.tagName === 'INPUT') return; const n = parseInt(e.key, 10); if (n >= 1 && n <= 5) { const s = mySkills()[n - 1]; if (s) cast(s, true); } });
  addEventListener('inv:update', () => { if (visible()) drawSkillBar(); });
  function sync() {
    if (!root) return; drawSkillBar();
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
        <div class="xskills" id="xskills"></div>
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
