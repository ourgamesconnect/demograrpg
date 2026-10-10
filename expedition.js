// WYPRAWY — walka z potworami (prototyp). Łup losuje serwer (Inventory.reward), klient pokazuje efekty.
'use strict';
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const el = (t, c, txt) => { const e = document.createElement(t); if (c) e.className = c; if (txt !== undefined) e.textContent = txt; return e; };
  const rnd = (a, b) => a + Math.random() * (b - a), pick = a => a[Math.floor(Math.random() * a.length)];
  const fmt = n => Math.round(n).toLocaleString('pl-PL');

  // mapy: [nazwa, ikona, waga, poziom potwora (offset), czas zabicia w sekundach]
  const MAPS = [
    { id: 'polanka', k: 'POLANKA', ic: '🌼', req: 1, lvl: 1, tier: 0, range: 'poziom 1–5', spec: {
      interval: 30 * 60 * 1000,   // boss i cel specjalny pojawiają się co 30 minut (co 30 min każdy, przesunięci o 15 min)
      mobs: [
        { n: 'Polny Żuk', ic: '🪲', lvl: 1, hp: 70, w: 30, dmg: 2, every: 4 },
        { n: 'Wściekły Lis', ic: '🦊', lvl: 2, hp: 140, w: 28, dmg: 2, every: 3, group: [2, 3] },
        { n: 'Kolczasty Dzik', ic: '🐗', lvl: 3, hp: 250, w: 20, dmg: 4, every: 3, charge: 5 },
        { n: 'Leśny Włóczęga', ic: '👺', lvl: 4, hp: 380, w: 14, dmg: 6, every: 3 },
        { n: 'Młody Niedźwiedź', ic: '🐻', lvl: 5, hp: 550, w: 8, dmg: 10, every: 5 },
      ],
      boss: { n: 'Krwawy Rogacz', ic: '🦌', lvl: 7, hp: 3200, dmg: 12, every: 3, enrage: { at: 0.3, every: 2 } },
      target: { n: 'Spaczony Korzeń', ic: '🌳', lvl: 5, hp: 5000, dmg: 0, every: 99, cls: 'root' },
    }, mobs: [] },
    { id: 'bor', k: 'Mroczny bór', ic: '🌲', req: 8, lvl: 10, tier: 1, mobs: [['Borsuk', '🦡', 34, 0, 4], ['Pająk leśny', '🕷️', 26, 1, 5], ['Wilk alfa', '🐺', 20, 2, 6], ['Leśny rozbójnik', '🏹', 12, 3, 7], ['Wiedźma z bagien', '🧙‍♀️', 8, 4, 9]], boss: ['Król Boru', '🐻'], target: ['Pogański kamień', '🗿'] },
    { id: 'kopalnia', k: 'Opuszczona kopalnia', ic: '⛏️', req: 16, lvl: 20, tier: 2, mobs: [['Nietoperz', '🦇', 34, 0, 4], ['Szczur kopalniany', '🐀', 26, 1, 5], ['Zmarły górnik', '🧟', 20, 2, 6], ['Szkielet', '💀', 12, 3, 7], ['Golem skalny', '🪨', 8, 4, 9]], boss: ['Strażnik Szybu', '☠️'], target: ['Zapieczętowana krypta', '⚰️'] },
    { id: 'zamek', k: 'Zamek w ruinie', ic: '🏰', req: 26, lvl: 30, tier: 3, mobs: [['Zbrojny najemnik', '🛡️', 34, 0, 4], ['Łucznik z wieży', '🏹', 26, 1, 5], ['Rycerz renegat', '🤺', 20, 2, 6], ['Kat', '🪓', 12, 3, 7], ['Mroczny kapłan', '🧙', 8, 4, 9]], boss: ['Czarny Rycerz', '🦹'], target: ['Brama zamku', '🚪'] },
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
  const equipAtk = (useMag) => { const s = window.Inventory && Inventory.state; if (!s) return 0; const it = s.items[s.equip.weapon], q = itemStats(it); return useMag && q.mag ? q.mag : q.atk; };
  const weaponKind = () => { const s = Inventory.state, u = s && s.equip.weapon, it = u && s.items[u]; return (it && it.kind) || 'sword'; };
  const playerDmg = useMag => 12 + P.lvl * 3 + equipAtk(useMag);
  // moc wzorcowa mapy: podstawa postaci + miecz etapu mapy z ulepszeniem +4 (średni sprzęt)
  const refDmg = m => 12 + m.lvl * 3 + weaponStats('sword', m.tier, 4).atk;
  const hpOf = (m, t) => Math.round(refDmg(m) * t / 0.9);

  const TEMPO = Math.max(1, parseFloat(new URLSearchParams(location.search).get('tempo')) || 1);   // do testów: ?tempo=60 skraca 30 min do 30 s
  const interval = m => (m.spec ? m.spec.interval : 0) / TEMPO;
  function initSched() { /* boss i cel pojawiają się tylko po wywołaniu przyciskiem (stan trzyma serwer) */ }
  // jeśli gracz wywołał cel, wystaw go po zabiciu bieżącego stwora i potwierdź to serwerowi
  function takeQueued() {
    const s = window.Inventory && Inventory.state; if (!s || !s.enc) return undefined; const id = MAPS[X.map].id;
    for (const k of ['boss', 'target']) { const e = s.enc[id + ':' + k]; if (e && e.st === 'queued') { Inventory.exec('encounter_spawn', { map: id, kind: k }); return k; } }
    return undefined;
  }
  function spawn(force) {
    const m = MAPS[X.map];
    if (m.spec) {
      const sp = m.spec, now = Date.now(); let def = null, kind = 'mob';
      if (force === 'boss') { kind = 'boss'; def = sp.boss; }
      else if (force === 'target') { kind = 'target'; def = sp.target; }
      else { const tw = sp.mobs.reduce((a, q) => a + q.w, 0); let q = Math.random() * tw; def = sp.mobs[0]; for (const mb of sp.mobs) { q -= mb.w; if (q <= 0) { def = mb; break; } } }
      const n = def.group ? Math.floor(rnd(def.group[0], def.group[1] + 1)) : 1, unit = def.hp, max = unit * n;
      X.enemy = { name: def.n, ic: def.ic, base: def.ic, kind, lvl: def.lvl, hp: max, max, dead: false, unit: n > 1 ? unit : 0, dmg: def.dmg, every: def.every || 3, charge: def.charge, enrage: def.enrage, cls: def.cls, t: 0 };
      X.wait = 0; SK.dot = null; SK.vuln = null; SK.channel = null; SK.windup = null; SK.stun = 0; SK.charges = 0; syncEnemy(true);
      if (kind === 'boss') say('☠ BOSS', def.n); else if (kind === 'target') say('🌳 SPACZONY KORZEŃ', 'wyrósł z ziemi'); else if (n > 1) say(def.ic.repeat(n), def.n + ' ×' + n);
      return;
    }
    let kind = 'mob', def;
    if (force === 'boss') { kind = 'boss'; def = [m.boss[0], m.boss[1], 0, 6, 40]; }
    else if (force === 'target') { kind = 'target'; def = [m.target[0], m.target[1], 0, 4, 20]; }
    else { const tw = m.mobs.reduce((a, q) => a + q[2], 0); let q = Math.random() * tw; def = m.mobs[0]; for (const mb of m.mobs) { q -= mb[2]; if (q <= 0) { def = mb; break; } } }
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
    let dmg = playerDmg(!!skill) * mult * rnd(0.9, 1.1); const crit = Math.random() < 0.18; if (crit) dmg *= 1.8;
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
      case 'buff': SK.until[s.id] = now + (p.dur || s.dur) * 1000; if (visible()) fx('skilltxt', { left: '50%', top: '24%' }, 1100, s.ic + ' ' + s.n); break;
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
    if (!X.enemy) { if (X.wait > 0) { X.wait--; return; } spawn(takeQueued()); }
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
    // przeciwnik oddaje we własnym rytmie (nie, gdy ogłuszony)
    e.t = (e.t || 0) + 1;
    if (e.enrage && !e.enraged && e.hp / e.max < e.enrage.at) { e.enraged = true; e.every = e.enrage.every; say('💢 SZAŁ', e.name + ' atakuje szybciej'); }
    const every = e.every || 3;
    if (e.t % every === 0) {
      if (SK.stun > 0) { SK.stun--; if (visible()) fx('skilltxt', { left: '50%', top: '30%' }, 800, '💫 ogłuszony'); }
      else {
        const left = e.unit ? Math.ceil(e.hp / e.unit) : 1;
        let hit = e.dmg !== undefined ? e.dmg * left * rnd(0.85, 1.15) : (3 + e.lvl * 2.4) * (e.kind === 'boss' ? 2.2 : e.kind === 'target' ? 0 : 1) * rnd(0.8, 1.2);
        if (e.charge && e.dmg !== undefined && (e.t / every) % e.charge === 0) { hit *= 2; if (visible()) fx('skilltxt', { left: '50%', top: '30%' }, 900, e.ic + ' Szarża!'); }
        if (buffOn('sw1')) hit *= 1.2;
        if (buffOn('sw2')) hit *= 1 - SKILLS.find(s => s.id === 'sw2').p(rankOf('sw2')).red;
        hit = Math.round(hit);
        if (hit > 0) {
          if (SK.channel && e.kind === 'boss') { SK.channel = null; if (visible()) say('🔆 Promień przerwany', 'silny atak bossa'); }
          P.hp = Math.max(0, P.hp - hit); fxHurt(hit);
          if (P.hp <= 0) { const wasSpecial = e.kind !== 'mob'; X.rest = 4; X.enemy = null; SK.channel = null; SK.windup = null; syncEnemy(false); if (wasSpecial) { Inventory.exec('encounter_abort'); say('☠ POWALONY', e.name + ' uciekł. Możesz spróbować ponownie'); } else say('☠ POWALONY', 'Odpoczywasz kilka sekund'); }
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
    window.Inventory.reward({ tier: m.tier, kind: e.kind, map: m.id }).then(res => {
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
    const left = e.unit ? Math.max(1, Math.ceil(e.hp / e.unit)) : 1; e._left = left;
    en.textContent = e.unit ? e.base.repeat(left) : e.ic; en.className = 'xenemy ' + e.kind + (e.cls ? ' ' + e.cls : ''); if (spawned) { void en.offsetWidth; en.classList.add('spawn'); }
    stageEl.classList.toggle('bosswin', e.kind === 'boss'); stageEl.classList.toggle('targetwin', e.kind === 'target');
    pan.classList.remove('hidden'); pan.className = 'xpanel ' + e.kind + (e.cls ? ' ' + e.cls : '');
    $('#xname', root).textContent = (e.kind === 'boss' ? '☠ BOSS · ' : e.kind === 'target' ? '🎯 CEL · ' : '') + e.name + (e.unit ? ' ×' + left : '') + `  (poz. ${e.lvl})`;
  }
  // stan „czy trwa wyprawa" zawsze pochodzi z serwera (klient go nie zmienia sam)
  function applyServer() {
    const on = serverExp();
    if (X.on && !on) { X.enemy = null; X.rest = 0; syncEnemy(false); }
    if (on && !X.on) initSched();
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
  setInterval(() => { if (visible()) { drawSkillBar(); drawEnc(); } }, 250);
  addEventListener('keydown', e => { if (!visible() || e.target.tagName === 'INPUT') return; const n = parseInt(e.key, 10); if (n >= 1 && n <= 5) { const s = mySkills()[n - 1]; if (s) cast(s, true); } });
  addEventListener('inv:update', () => { if (visible()) drawSkillBar(); });
  // ---- przyciski celów (boss / Spaczony Korzeń): stan i odnowienie pochodzą z serwera ----
  function drawEnc() {
    if (!root) return; const box = $('#xenc', root), m = MAPS[X.map], s = window.Inventory && Inventory.state; if (!s) return;
    const def = { boss: { ic: '☠', n: m.spec ? m.spec.boss.n : m.boss[0], c: 'boss' }, target: { ic: '🌳', n: m.spec ? m.spec.target.n : m.target[0], c: 'target' } };
    if (!m.spec) def.target.ic = '🎯';
    const enc = s.enc || {}, busy = Object.values(enc).some(q => q.st === 'queued' || q.st === 'active'), now = Date.now();
    if (!box.firstChild) for (const k of ['boss', 'target']) { const b = el('button', 'enc ' + def[k].c); b.dataset.k = k; b.append(el('i', ''), el('b', ''), el('small', '')); b.onclick = () => Inventory.exec('encounter_call', { map: MAPS[X.map].id, kind: k }); box.append(b); }
    box.querySelectorAll('.enc').forEach(b => {
      const k = b.dataset.k, e = enc[m.id + ':' + k] || { st: 'ready', cd: 0 }, cd = e.cd > now ? e.cd - now : 0;
      let state = 'ready', txt = 'WYWOŁAJ';
      if (e.st === 'queued') { state = 'queued'; txt = 'Wywołany: pojawi się po zabiciu stwora'; }
      else if (e.st === 'active') { state = 'active'; txt = 'Walka trwa!'; }
      else if (cd > 0) { const t = Math.ceil(cd / 1000); state = 'cool'; txt = '⏳ ponownie za ' + Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); }
      else if (!X.on) { state = 'off'; txt = 'Rozpocznij wyprawę'; }
      else if (busy) { state = 'off'; txt = 'Inny cel jest już wywołany'; }
      b.className = 'enc ' + def[k].c + ' ' + state;
      b.disabled = state !== 'ready';
      b.children[0].textContent = def[k].ic; b.children[1].textContent = def[k].n; b.children[2].textContent = txt;
    });
  }
  function sync() {
    if (!root) return; drawSkillBar(); drawEnc();
    const busyOther = (() => { const s = Inventory.state; return s && s.activity && s.activity.kind !== 'exp' ? ACT_NAMES[s.activity.kind] : null; })(); const e = X.enemy, hm = hpMax(P), mm = mpMax(P);
    if (e && e.unit && e.hp > 0 && Math.ceil(e.hp / e.unit) !== e._left) syncEnemy(false);
    $('#xtimers', root).textContent = '';
    if (e) { $('#xbar', root).style.width = (100 * e.hp / e.max) + '%'; $('#xtxt', root).textContent = `${fmt(e.hp)} / ${fmt(e.max)} HP`; }
    $('#xhp', root).style.width = (100 * P.hp / hm) + '%'; $('#xhpt', root).textContent = `${fmt(P.hp)} / ${fmt(hm)}`;
    $('#xmp', root).style.width = (100 * P.mp / mm) + '%'; $('#xmpt', root).textContent = `${fmt(P.mp)} / ${fmt(mm)}`;
    $('#xxp', root).style.width = (100 * P.xp) + '%'; $('#xlvl', root).textContent = 'Poz. ' + P.lvl;
    $('#xgold', root).textContent = fmt(P.gold);
    const sb = $('#xstart', root); sb.textContent = busyOther ? '🔒 Zajęty: ' + busyOther : (X.on ? '⏸ Zatrzymaj wyprawę' : '▶ ZACZNIJ WYPRAWĘ');
    sb.disabled = pending || !!busyOther; sb.classList.toggle('go', !X.on && !busyOther);
    $('#xstat', root).textContent = `Pokonanych: ${X.kills} · Bossów: ${X.bosses} · Celów specjalnych: ${X.targets}`;
    const rc = $('#xrecent', root); rc.replaceChildren(); X.recent.forEach(r => { const c = el('span', 'xchip', r.ic + ' ' + r.n); c.style.borderColor = r.col; rc.append(c); });
    const tiles = $('#xmaps', root); tiles.replaceChildren();
    MAPS.forEach((m, i) => { const open = P.lvl >= m.req, b = el('button', 'xmap' + (X.map === i ? ' on' : '') + (open ? '' : ' lock')); b.disabled = !open || X.on || pending; if (X.on && open && X.map !== i) b.title = 'Zatrzymaj wyprawę, aby zmienić mapę'; b.append(el('i', '', open ? m.ic : '🔒'), el('b', '', m.k), el('small', '', open ? (m.range || `poziom potworów ${m.lvl}+`) : `od poziomu ${m.req}`)); b.onclick = () => { if (X.map === i) return; X.map = i; X.enemy = null; X.wait = 0; initSched(); stageEl.dataset.map = i; syncEnemy(false); sync(); }; tiles.append(b); });
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
      <div class="xp-ctl"><button class="xstart go" id="xstart">▶ ZACZNIJ WYPRAWĘ</button></div>
      <div class="xenc" id="xenc"></div>
      <div id="xmaps" class="xmaps"></div>
      <div class="xp-foot"><span id="xstat"></span><span id="xtimers" class="xtimers"></span><div id="xrecent" class="xrecent"></div></div>
    </div>`;
    document.body.append(root); stageEl = $('#xstage', root);
    $('#xclose', root).onclick = close; root.onclick = e => { if (e.target === root) close(); };
    addEventListener('keydown', e => { if (e.key === 'Escape' && visible()) close(); });
    $('#xstart', root).onclick = async () => {
      if (pending) return; pending = true; sync();
      const res = X.on ? await Inventory.exec('activity_stop') : await Inventory.exec('activity_start', { kind: 'exp', detail: MAPS[X.map].k });
      pending = false; applyServer(); sync(); void res;
    };
    const p = $('#xparts', root); for (let k = 0; k < 20; k++) { const i = el('i'); i.style.left = rnd(2, 98) + '%'; i.style.top = rnd(10, 90) + '%'; i.style.animationDelay = rnd(0, 6) + 's'; i.style.animationDuration = rnd(5, 10) + 's'; p.append(i); }
  }
  function open() { if (!root) { build(); X.map = Math.max(0, MAPS.reduce((a, m, i) => P.lvl >= m.req ? i : a, 0)); stageEl.dataset.map = X.map; } root.hidden = false; document.body.classList.add('inv-open'); syncEnemy(false); sync(); }
  function close() { if (!root) return; root.hidden = true; document.body.classList.remove("inv-open"); }
  window.Expedition = { get enemy() { return X.enemy; }, get sched() { return X.sched; }, open, close, get running() { return X.on; }, get map() { return MAPS[X.map].k; } };
})();
