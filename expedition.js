// WYPRAWY — walka z potworami (prototyp). Łup losuje serwer (Inventory.reward), klient pokazuje efekty.
'use strict';
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const el = (t, c, txt) => { const e = document.createElement(t); if (c) e.className = c; if (txt !== undefined) e.textContent = txt; return e; };
  const rnd = (a, b) => a + Math.random() * (b - a), pick = a => a[Math.floor(Math.random() * a.length)];
  const fmt = n => Math.round(n).toLocaleString('pl-PL');

  // MAPY: na razie tylko POLANKA. Potwory: hp, atak (min–max na sekundę), stałe EXP, złoto (min–max) z szansą 50%.
  const MAPS = [
    { id: 'polanka', k: 'POLANKA', ic: '🌼', req: 1, lvl: 1, tier: 0, range: 'poziom 1–5', spec: {
      interval: 30 * 60 * 1000,
      mobs: [
        { n: 'Polny Żuk', ic: '🪲', lvl: 1, hp: 31, def: 5, lo: 6, hi: 8, xp: 15, g: [5, 15], gc: 0.5 },
        { n: 'Wściekły Lis', ic: '🦊', lvl: 2, hp: 48, def: 11, lo: 5, hi: 12, xp: 29, g: [10, 25], gc: 0.5 },
        { n: 'Kolczasty Dzik', ic: '🐗', lvl: 3, hp: 65, def: 16, lo: 10, hi: 20, xp: 45, g: [15, 35], gc: 0.5 },
        { n: 'Leśny Włóczęga', ic: '👺', lvl: 4, hp: 85, def: 22, lo: 15, hi: 25, xp: 67, g: [20, 45], gc: 0.5 },
        { n: 'Młody Niedźwiedź', ic: '🐻', lvl: 5, hp: 110, def: 28, lo: 20, hi: 35, xp: 93, g: [20, 65], gc: 0.5 },
      ],
      boss: { n: 'Krwawy Rogacz', ic: '🦌', lvl: 7, hp: 400, lo: 45, hi: 60, xp: 400, g: [100, 300], gc: 1, enrage: { at: 0.3, mult: 1.5 } },   // EXP/złoto/szał: tymczasowe
      target: { n: 'Spaczony Korzeń', ic: '🌳', lvl: 5, hp: 2000, lo: 0, hi: 0, xp: 200, g: [50, 150], gc: 1, cls: 'root' },   // EXP/złoto: tymczasowe
    } },
  ];
  const REWARD_LVL_GAP = 10;   // EXP i złoto tylko, gdy poziom gracza − poziom potwora ≤ 10
  // wybór potworów na mapie (zatwierdza serwer: Inventory.state.mobFilter[mapId] = [indeksy])
  const selMobs = () => { const m = MAPS[X.map], s = window.Inventory && Inventory.state, f = s && s.mobFilter && s.mobFilter[m.id]; const n = m.spec.mobs.length; const all = m.spec.mobs.map((_, i) => i); const ids = (f && f.length ? f : all).filter(i => i < n); return ids.length ? ids : all; };
  let pending = false;
  const serverExp = () => { const s = window.Inventory && Inventory.state; return !!(s && s.activity && s.activity.kind === 'exp'); };
  const ACT_NAMES = { exp: 'Wyprawy', gather: 'Zbieractwo', craft: 'Rzemiosło' };
  const X = { heals: [], potLock: { hp: 0, mp: 0 }, on: false, map: 0, enemy: null, wait: 0, rest: 0, n: 0, kills: 0, bosses: 0, targets: 0, recent: [] };
  let root, stageEl;

  // mnożnik EXP za różnicę poziomów (poziom potwora − poziom gracza): tabela Metin2
  function diffMult(d) {
    if (d >= 15) return 1.3; if (d >= 10) return 1.2; if (d >= 5) return 1.1; if (d >= 1) return 1.02; if (d >= 0) return 1;
    const t = { '-1': 1, '-2': .98, '-3': .96, '-4': .94, '-5': .92, '-6': .9, '-7': .85, '-8': .8, '-9': .7, '-10': .5, '-11': .3, '-12': .2, '-13': .1, '-14': .05 };
    return d <= -15 ? 0.01 : t[d];
  }
  const equipAtk = (useMag) => { const s = window.Inventory && Inventory.state; if (!s) return 0; const it = s.items[s.equip.weapon], q = itemStats(it); const m = useMag && q.mag, lo = m ? q.mlo : q.lo, hi = m ? q.mhi : q.hi; return Math.round(lo + Math.random() * (hi - lo)); };   // obrażenia losowane z przedziału broni
  const weaponKind = () => { const s = Inventory.state; return (s && s.cls && CLASSES[s.cls].w) || 'sword'; };
  const stb = () => statBonus(window.Inventory && Inventory.state ? Inventory.state.stats : null);
  const statAtk = useMag => { const w = weaponKind(), b = stb(); return w === 'sword' ? b.sword : w === 'bow' ? b.bow : (useMag ? b.mag : 0); };   // Magia dodaje się do ataku magicznego (umiejętności Różdżki)
    const playerDmg = useMag => equipAtk(useMag) + statAtk(useMag);   // tylko założona broń + punkty statusu (bez bazy z poziomu i bez mnożników klasy)
  const totalDef = () => { const s = window.Inventory && Inventory.state; let d = stb().def; if (s) for (const u of Object.values(s.equip)) d += itemStats(s.items[u]).def; return d; };
  // moc wzorcowa mapy: podstawa postaci + miecz etapu mapy z ulepszeniem +4 (średni sprzęt)

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
    const m = MAPS[X.map], sp = m.spec; let def, kind = 'mob';
    if (force === 'boss') { kind = 'boss'; def = sp.boss; }
    else if (force === 'target') { kind = 'target'; def = sp.target; }
    else { def = sp.mobs[pick(selMobs())]; }
    const pack = kind === 'mob' ? 3 : 1;
    X.enemy = { pack, name: def.n, ic: def.ic, base: def.ic, kind, lvl: def.lvl, hp: def.hp, max: def.hp, dead: false, lo: def.lo, hi: def.hi, def: def.def || 0, xp: def.xp, g: def.g, gc: def.gc, enrage: def.enrage, cls: def.cls, t: 0 };
    X.wait = 0; SK.dot = null; SK.vuln = null; SK.channel = null; SK.windup = null; SK.stun = 0; SK.charges = 0; syncEnemy(true);
    if (pack > 1) say(def.ic.repeat(pack), 'BANDA ×' + pack + ': ' + def.n + ' — walczą razem!'); else if (kind === 'boss') say('☠ BOSS', def.n); else if (kind === 'target') say('🌳 SPACZONY KORZEŃ', 'wyrósł z ziemi');
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
    if (e.lvl - P.lvl >= 4 && Math.random() < 0.3) { if (visible()) fx('skilltxt', { left: '50%', top: '38%' }, 700, '✖ PUDŁO'); return 0; }   // kara za różnicę poziomów
    let dmg = playerDmg(!!skill) * mult - (e.def || 0);   // obrona potwora odejmowana od ataku (jak w Metin2)
    if (dmg < 3) dmg = Math.floor(rnd(1, 6));   // Metin2: poniżej 3 obrażeń → losowo 1–5
    const crit = false;   // brak bazowego krytyka: bonusy dopiero z ekwipunku
    if (SK.vuln && SK.vuln.until > Date.now()) dmg *= 1 + SK.vuln.v;
    dmg = Math.max(1, Math.round(dmg)); e.hp = Math.max(0, e.hp - dmg);
    fxHit(dmg, crit, skill);
    if (e.hp <= 0 && !e.dead) {
      if (e.pack > 1) { kill(e); e.pack--; e.hp = e.max; if (visible()) { fx('skilltxt', { left: '50%', top: '30%' }, 900, e.ic.repeat(e.pack) + ' zostało: ' + e.pack); say(e.pack === 1 ? '☝ OSTATNI' : '✌ DRUGI', e.name); } syncEnemy(true); }
      else { e.dead = true; kill(e); }
    }
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
  // ---- MIKSTURY: leczą stopniowo (co tick), automat używa poniżej progu ----
  const potCount = id => ((window.Inventory && Inventory.state && Inventory.state.potions) || {})[id] || 0;
  const potCfg = () => (window.Inventory && Inventory.state && Inventory.state.pcfg) || { hpOn: false, hpThr: 50, hpId: 'hp_s', mpOn: false, mpThr: 30, mpId: 'mp_s' };
  const pending2 = kind => X.heals.filter(q => q.kind === kind).reduce((a, q) => a + q.per * q.left, 0);
  function usePotion(id) {
    const pd = POTIONS[id]; if (!pd || !X.on || X.rest > 0 || !X.enemy && false || potCount(id) < 1 || P.hp <= 0) return false;
    if (X.potLock[pd.kind] > Date.now()) return false;
    X.potLock[pd.kind] = Date.now() + 1400;
    Inventory.exec('potion_use', { id }).then(res => {
      if (!(res && res.ok)) { X.potLock[pd.kind] = 0; return; }
      const ticks = Math.max(2, Math.round(pd.secs / 0.9)); X.heals.push({ kind: pd.kind, per: pd.v / ticks, left: ticks, ic: pd.ic });
      if (visible()) { flash(pd.kind === 'hp' ? 'heal' : 'mana'); fx('potfly', { left: '50%', top: '60%' }, 900, pd.ic); say(pd.kind === 'hp' ? '❤ MIKSTURA ŻYCIA' : '💧 MIKSTURA MANY', '+' + pd.v + ' przez ' + pd.secs + ' s'); }
      drawPots(true); sync();
    });
    return true;
  }
  function healTick(hm, mm) {
    if (!X.heals.length) return;
    for (const q of X.heals) {
      q.left--;
      if (q.kind === 'hp') { const a = Math.min(hm - P.hp, q.per); if (a > 0) { P.hp += a; if (visible()) fx('hnum heal', { left: (18 + rnd(-4, 4)) + '%', top: '72%' }, 900, '+' + Math.round(q.per)); } }
      else { const a = Math.min(mm - P.mp, q.per); if (a > 0) { P.mp += a; if (visible()) fx('hnum mana', { left: (80 + rnd(-4, 4)) + '%', top: '72%' }, 900, '+' + Math.round(q.per)); } }
    }
    X.heals = X.heals.filter(q => q.left > 0);
  }
  function autoPotions(hm, mm) {
    const cf = potCfg();
    if (cf.hpOn && (P.hp + pending2('hp')) / hm * 100 < cf.hpThr) usePotion(cf.hpId);
    if (cf.mpOn && (P.mp + pending2('mp')) / mm * 100 < cf.mpThr) usePotion(cf.mpId);
  }
  function tick() {
    if (!X.on) { X.heals = []; return; }
    const hm = hpMax(P), mm = mpMax(P);
    if (P.hp === undefined) P.hp = hm; if (P.mp === undefined) P.mp = mm;
    if (X.rest > 0) { X.heals = []; }
    else { healTick(hm, mm); autoPotions(hm, mm); }
    if (X.rest > 0) { X.rest--; if (X.rest === 0) { P.hp = Math.round(hm * 0.6); say('✔ WSTAJESZ', 'Wracasz do walki'); } sync(); return; }
    if (!X.enemy) { if (X.wait > 0) { X.wait--; return; } spawn(takeQueued()); }
    const e = X.enemy; if (e.dead) { X.enemy = null; X.wait = 1; syncEnemy(false); return; }
    X.n++;
    P.mp = Math.min(mm, P.mp + 3 * (1 + stb().mpRegen));
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
    // przeciwnik zadaje obrażenia co tick (0,9 s): losowane z przedziału „atak na sekundę" × 0,9
    if (e.enrage && !e.enraged && e.hp / e.max < e.enrage.at) { e.enraged = true; say('💢 SZAŁ', e.name + ' atakuje mocniej'); }
    {
      if (SK.stun > 0) { SK.stun--; if (visible()) fx('skilltxt', { left: '50%', top: '30%' }, 800, '💫 ogłuszony'); }
      else {
        let hit = 0; for (let q = 0; q < (e.pack || 1); q++) hit += rnd(e.lo, e.hi) * 0.9 * (e.enraged ? e.enrage.mult : 1);   // każdy żywy z bandy atakuje w każdym ticku
        { const dd = totalDef(); hit *= 1 - dd / (dd + 40 + 14 * e.lvl); }   // obrona wyłącznie z pancerza i punktów Życia (malejące przyrosty)
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
    const m = MAPS[X.map], far = P.lvl - e.lvl > REWARD_LVL_GAP;   // za słaby potwór: brak EXP i złota
    const xp = far ? 0 : Math.max(1, Math.round(e.xp * diffMult(e.lvl - P.lvl)));
    const need = expFor(P.lvl); P.xp += xp / need;
    const cards = far ? [{ t: 'za słaby potwór: brak EXP i złota', c: 'xp' }] : [{ t: `+${fmt(xp)} EXP`, c: 'xp' }];
    let lv = false; while (P.xp >= 1) { P.xp -= 1; P.lvl++; lv = true; }
    if (lv) { P.hp = hpMax(P); P.mp = mpMax(P); say('⭐ AWANS!', 'Poziom ' + P.lvl); Inventory.exec('sync_level', { lvl: P.lvl }); if (window.GameFeed) { GameFeed('⭐ Awans na poziom ' + P.lvl + '!', 'good'); GameFeed('✨ Nowe punkty: 1 umiejętności i 3 statusu. Otwórz Umiejętności.', 'good'); } }
    if (window.GameFeed) { if (e.kind === 'boss') GameFeed('☠ Pokonano bossa: ' + e.name, 'boss'); else if (e.kind === 'target') GameFeed('🎯 Zniszczono cel specjalny: ' + e.name, 'good'); }
    window.Inventory.reward({ tier: m.tier, kind: e.kind, map: m.id, lvl: e.lvl }).then(res => {
      if (res && !res.ok) { applyServer(); sync(); return; }
      if (res && res.ok && res.snapshot) P.gold = res.snapshot.gold;
      if (res && res.ok) for (const ev of res.events) {
        if (ev.t === 'gold_added') cards.push({ t: `🪙 +${fmt(ev.gold)}`, c: 'gold' });
        if (ev.t === 'loot_added') cards.push({ t: `${ev.ic} ${ev.name} +${ev.plus} → torba łupu ×${ev.qty}`, c: 'item' });
        else if (ev.t === 'item_added') { if (ev.where === 'sold') cards.push({ t: `${ev.ic} ${ev.name} → sprzedano (+${ev.gold} 🪙)`, c: 'gold' }); else { const it = res.snapshot.items[ev.uid]; if (it) { cards.push({ t: `${it.ic} ${it.name} (${RARITY[it.rarity].n})${ev.where === 'stash' ? ' → skrytka' : ''}`, c: 'item', col: RARITY[it.rarity].c }); X.recent.unshift({ ic: it.ic, n: it.name, col: RARITY[it.rarity].c }); X.recent.length = Math.min(X.recent.length, 10); } } }
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
    const left = e.pack || 1; e._left = left;
    en.textContent = e.ic.repeat(left); en.dataset.n = left; en.className = 'xenemy ' + e.kind + (e.cls ? ' ' + e.cls : ''); if (spawned) { void en.offsetWidth; en.classList.add('spawn'); }
    stageEl.classList.toggle('bosswin', e.kind === 'boss'); stageEl.classList.toggle('targetwin', e.kind === 'target');
    pan.classList.remove('hidden'); pan.className = 'xpanel ' + e.kind + (e.cls ? ' ' + e.cls : '');
    $('#xname', root).textContent = (e.kind === 'boss' ? '☠ BOSS · ' : e.kind === 'target' ? '🎯 CEL · ' : '') + e.name + (left > 1 ? ' ×' + left : '') + `  (poz. ${e.lvl})`;
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
    drawPots(false);
    const sb = $('#xstart', root); sb.textContent = busyOther ? '🔒 Zajęty: ' + busyOther : (X.on ? '⏸ Zatrzymaj wyprawę' : '▶ ZACZNIJ WYPRAWĘ');
    const lootN = (() => { const l = Inventory.state && Inventory.state.loot; return l ? Object.values(l).reduce((a, q) => a + q.qty, 0) : 0; })();
    if (!X.on && !busyOther && lootN) sb.textContent = '🔒 Odbierz łup (' + lootN + '), aby wyruszyć';
    sb.disabled = pending || !!busyOther || (!X.on && lootN > 0); sb.classList.toggle('go', !X.on && !busyOther && !lootN);
    drawBag(lootN);
    $('#xstat', root).textContent = `Pokonanych: ${X.kills} · Bossów: ${X.bosses} · Celów specjalnych: ${X.targets}`;
    const rc = $('#xrecent', root); rc.replaceChildren(); X.recent.forEach(r => { const c = el('span', 'xchip', r.ic + ' ' + r.n); c.style.borderColor = r.col; rc.append(c); });
    { const box = $('#xmobs', root), m = MAPS[X.map], sel = selMobs(), sig = X.map + ':' + sel.join(',');
      if (box._sig !== sig) { box._sig = sig; box.replaceChildren(); box.append(el('b', '', 'Potwory na mapie (kliknij, aby wyłączyć):'));
        m.spec.mobs.forEach((mb, i) => { const on = sel.includes(i), c = el('button', 'xmob' + (on ? ' on' : '')); c.title = 'HP ' + mb.hp + ' · atak ' + mb.lo + '–' + mb.hi + '/s · ' + mb.xp + ' EXP';
          c.append(el('i', '', mb.ic), el('span', '', mb.n + ' (poz. ' + mb.lvl + ')'), el('small', '', mb.xp + ' EXP'));
          c.onclick = async () => { const next = on ? sel.filter(q => q !== i) : sel.concat(i).sort(); if (!next.length) return; await Inventory.exec('mob_filter', { map: m.id, ids: next }); box._sig = ''; sync(); };
          box.append(c); }); } }
    { const box = $('#xdrops', root), m = MAPS[X.map], dr = MAP_DROPS[m.id], sel = selMobs(), cls = Inventory.state && Inventory.state.cls, sig = m.id + ':' + sel.join(',') + ':' + cls;
      if (dr && box._sig !== sig) { box._sig = sig; box.replaceChildren(); box.append(el('b', '', 'Możliwy łup na mapie:'));
        const lv = sel.map(i => m.spec.mobs[i].lvl), lo = Math.min(...lv.map(l => dr.mob[l] || 0)), hi = Math.max(...lv.map(l => dr.mob[l] || 0));
        const nm = { weapon: cls ? WEAPON_NAMES[CLASSES[cls].w][0] : 'Drewniana broń', helm: ARMOR_NAMES.helm[0], armor: ARMOR_NAMES.armor[0], boots: ARMOR_NAMES.boots[0], shield: ARMOR_NAMES.shield[0] };
        const ic = { weapon: cls ? { sword: '🗡️', bow: '🏹', wand: '🪄' }[CLASSES[cls].w] : '⚔️', helm: '🪖', armor: '🥋', boots: '🥾', shield: '🛡️' };
        const pct = v => (v * 100).toLocaleString('pl-PL', { maximumFractionDigits: 1 }) + '%';
        dr.parts.forEach(p => { const c = el('span', 'xdrop'); c.title = nm[p] + ' +0 lub +1 · ' + (lo === hi ? pct(lo) : pct(lo) + '–' + pct(hi)) + ' z potwora · boss i korzeń: łup wkrótce'; c.append(el('i', '', ic[p]), el('small', '', '+0/+1')); box.append(c); }); } }
    const tiles = $('#xmaps', root); tiles.replaceChildren();
    MAPS.forEach((m, i) => { const open = P.lvl >= m.req, b = el('button', 'xmap' + (X.map === i ? ' on' : '') + (open ? '' : ' lock')); b.disabled = !open || X.on || pending; if (X.on && open && X.map !== i) b.title = 'Zatrzymaj wyprawę, aby zmienić mapę'; b.append(el('i', '', open ? m.ic : '🔒'), el('b', '', m.k), el('small', '', open ? (m.range || `poziom potworów ${m.lvl}+`) : `od poziomu ${m.req}`)); b.onclick = () => { if (X.map === i) return; X.map = i; X.enemy = null; X.wait = 0; initSched(); stageEl.dataset.map = i; syncEnemy(false); sync(); }; tiles.append(b); });
  }

  // ---- PASEK MIKSTUR ----
  function drawPots(force) {
    const box = $('#xpotbar', root); if (!box) return;
    const cf = potCfg(), sig = ['hp_s', 'hp_m', 'hp_l', 'mp_s', 'mp_m', 'mp_l'].map(potCount).join(',') + JSON.stringify(cf) + X.heals.length;
    if (!force && box._sig === sig) return; box._sig = sig; box.replaceChildren();
    const bottle = (id, key) => {
      const pd = POTIONS[id], n = potCount(id), b = el('button', 'xbot ' + pd.kind + (n ? '' : ' empty') + (X.heals.some(q => q.kind === pd.kind) ? ' active' : ''));
      b.title = pd.n + ': +' + pd.v + ' przez ' + pd.secs + ' s · klawisz ' + key.toUpperCase();
      const g = el('span', 'xbotglass'); g.append(el('i', 'xbotliq'), el('em', '', pd.ic)); b.append(g, el('b', '', pd.size), el('small', '', '×' + n), el('kbd', '', key.toUpperCase()));
      b.disabled = !n; b.onclick = () => usePotion(id); return b;
    };
    const grpHp = el('div', 'xbotgrp'), grpMp = el('div', 'xbotgrp');
    [['hp_s', 'q'], ['hp_m', 'w'], ['hp_l', 'e']].forEach(([id, k]) => grpHp.append(bottle(id, k)));
    [['mp_s', 'a'], ['mp_m', 's'], ['mp_l', 'd']].forEach(([id, k]) => grpMp.append(bottle(id, k)));
    const auto = (kind, grp) => {
      const on = cf[kind + 'On'], row = el('div', 'xauto ' + kind + (on ? ' on' : ''));
      const t = el('button', 'xautot', (on ? '✔ AUTO ' : 'AUTO ') + (kind === 'hp' ? '❤' : '💧'));
      const rng = el('input'); rng.type = 'range'; rng.min = 5; rng.max = 95; rng.step = 5; rng.value = cf[kind + 'Thr'];
      const lab = el('span', 'xautov', 'poniżej ' + cf[kind + 'Thr'] + '%');
      const sz = el('div', 'xautosz'); ['s', 'm', 'l'].forEach(z => { const b = el('button', cf[kind + 'Id'] === kind + '_' + z ? 'on' : '', z.toUpperCase()); b.onclick = () => save({ [kind + 'Id']: kind + '_' + z }); sz.append(b); });
      const save = patch => { const n = { ...cf, ...patch }; Inventory.exec('potion_cfg', n).then(() => { box._sig = ''; sync(); }); };
      t.onclick = () => save({ [kind + 'On']: !on });
      rng.oninput = () => { lab.textContent = 'poniżej ' + rng.value + '%'; }; rng.onchange = () => save({ [kind + 'Thr']: +rng.value });
      row.append(t, rng, lab, sz); return row;
    };
    const mid = el('div', 'xautos'); mid.append(auto('hp'), auto('mp'));
    box.append(grpHp, mid, grpMp);
  }
  addEventListener('keydown', e => {
    if (!visible() || e.target.tagName === 'INPUT' || e.ctrlKey || e.metaKey || e.altKey) return;
    const m = { q: 'hp_s', w: 'hp_m', e: 'hp_l', a: 'mp_s', s: 'mp_m', d: 'mp_l' }[e.key.toLowerCase()]; if (m) usePotion(m);
  });
  // ---- TORBA ŁUPU ----
  const bagPrev = {};
  async function bagAct(cmd, payload, cardEl) {
    if (pending) return; pending = true; if (cardEl) cardEl.classList.add('fly'); else root.querySelectorAll('.xbagcard').forEach(q => q.classList.add('fly'));
    await new Promise(q => setTimeout(q, 380));
    const res = await Inventory.exec(cmd, payload); pending = false;
    if (res && res.ok) { const ev = res.events || []; const g = ev.filter(q => q.t === 'loot_sold').reduce((a, q) => a + q.gold, 0), n = ev.filter(q => q.t === 'loot_claimed' || q.t === 'loot_sold').reduce((a, q) => a + q.n, 0);
      if (g) { say('💰 SPRZEDANO ×' + n, '+' + fmt(g) + ' złota'); } else say('🎒 ODEBRANO ×' + n, 'przedmioty są w plecaku'); }
    else if (res && res.error) say('⚠', res.error);
    sync();
  }
  function drawBag(lootN) {
    const box = $('#xbag', root), L = (Inventory.state && Inventory.state.loot) || {}, keys = Object.keys(L).sort();
    box.hidden = !keys.length; if (!keys.length) { box._sig = ''; return; }
    const sig = keys.map(k => k + ':' + L[k].qty).join(',') + (pending ? 'p' : ''); if (box._sig === sig) return; box._sig = sig;
    box.replaceChildren();
    const total = keys.reduce((a, k) => a + L[k].qty, 0), worth = keys.reduce((a, k) => a + L[k].qty * L[k].it.value, 0);
    const h = el('div', 'xbaghead'); h.append(el('b', '', '🎁 ŁUP Z WYPRAWY'), el('span', '', total + ' przedmiotów · warte ' + fmt(worth) + ' 🪙')); box.append(h);
    box.append(el('p', 'xbagnote', 'Najedź na przedmiot, aby zobaczyć statystyki. Odbierz łup do plecaka albo sprzedaj go; dopóki tego nie zrobisz, nie wyruszysz na kolejną wyprawę.'));
    const row = el('div', 'xbagrow');
    keys.forEach(k => {
      const e = L[k], it = e.it, c = el('div', 'xbagcard' + (bagPrev[k] !== undefined && e.qty > bagPrev[k] ? ' pop' : bagPrev[k] === undefined ? ' newc' : ''));
      c.append(el('i', 'xbagic', it.ic), el('b', '', it.name + (it.plus ? ' +' + it.plus : ' +0')), el('span', 'xbagq', '×' + e.qty));
      const bt = el('div', 'xbagbt'); const a = el('button', 'xclaim', '🎒 Do EQ'), sl = el('button', 'xsell', '💰 +' + fmt(e.qty * it.value));
      a.onclick = () => bagAct('loot_claim', { key: k }, c); sl.onclick = () => bagAct('loot_sell', { key: k }, c); bt.append(a, sl); c.append(bt); row.append(c);
      c.onmouseenter = ev => { const m = { ...it, uid: 'loot' }; Inventory.tip.show(m, ev, false); }; c.onmousemove = ev => Inventory.tip.move(ev); c.onmouseleave = () => Inventory.tip.hide();
      bagPrev[k] = e.qty;
    });
    for (const k of Object.keys(bagPrev)) if (!L[k]) delete bagPrev[k];
    box.append(row);

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
      <div class="xpotbar" id="xpotbar"></div>
      <div class="xp-ctl"><button class="xstart go" id="xstart">▶ ZACZNIJ WYPRAWĘ</button></div>
      <div class="xenc" id="xenc"></div>
      <div class="xmobs" id="xmobs"></div>
      <div class="xdrops" id="xdrops"></div>
      <div class="xbag" id="xbag" hidden></div>
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
