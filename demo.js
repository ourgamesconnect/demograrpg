'use strict';
// DEMO: całość liczona w przeglądarce. W prawdziwej grze tę symulację wykonuje serwer.
const $ = s => document.querySelector(s);
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];

const TIERS = [['drewniany', 'drewniana', 'drewniane'], ['miedziany', 'miedziana', 'miedziane'], ['żelazny', 'żelazna', 'żelazne'], ['stalowy', 'stalowa', 'stalowe'], ['hartowany', 'hartowana', 'hartowane']];
const QUAL = [
  { n: 'zwykły', m: 1, c: '#b8bdd0' }, { n: 'dobry', m: 1.25, c: '#5fd38a' }, { n: 'wybitny', m: 1.6, c: '#4da3ff' },
  { n: 'mistrzowski', m: 2.1, c: '#b979ff' }, { n: 'legendarny', m: 3, c: '#ffb340' },
];
const G = { m: 0, f: 1, n: 2 };
const SLOTS = [ // w = wagi statystyk; bases = realne typy przedmiotów
  { k: 'weapon', n: 'Broń', w: { atk: 1.2 }, bases: [['Miecz', 'm'], ['Topór', 'm'], ['Włócznia', 'f'], ['Szabla', 'f'], ['Łuk', 'm'], ['Młot bojowy', 'm'], ['Sztylet', 'm']] },
  { k: 'shield', n: 'Tarcza', w: { atk: 0.3, crit: 0.3 }, bases: [['Tarcza', 'f'], ['Puklerz', 'm']] },
  { k: 'helmet', n: 'Hełm', w: { crit: 0.4, spd: 0.3 }, bases: [['Hełm', 'm'], ['Kaptur', 'm']] },
  { k: 'armor', n: 'Zbroja', w: { atk: 0.5, spd: 0.4 }, bases: [['Zbroja płytowa', 'f'], ['Kolczuga', 'f'], ['Zbroja skórzana', 'f']] },
  { k: 'gloves', n: 'Rękawice', w: { atk: 0.2, spd: 0.5 }, bases: [['Rękawice', 'n']] },
  { k: 'boots', n: 'Buty', w: { spd: 0.6 }, bases: [['Buty', 'n']] },
  { k: 'neck', n: 'Naszyjnik', w: { atk: 0.3, crit: 0.5 }, bases: [['Naszyjnik', 'm'], ['Amulet', 'm']] },
  { k: 'ring1', n: 'Pierścień', w: { atk: 0.3, crit: 0.2 }, bases: [['Pierścień', 'm'], ['Sygnet', 'm']] },
  { k: 'ring2', n: 'Pierścień', w: { atk: 0.3, crit: 0.2 }, bases: [['Pierścień', 'm'], ['Sygnet', 'm']] },
  { k: 'belt', n: 'Pas', w: { atk: 0.3, spd: 0.3 }, bases: [['Pas', 'm']] },
];
const INV_SIZE = 35;
// Umiejętności: per = efekt na poziom, unit = jednostka. weap/armor = typy przedmiotów, dla których działa mistrzostwo.
const SKILLS = [
  { k: 'Miecze i szable', cat: 'Mistrzostwo broni', icon: '🗡️', per: 2, unit: '% ATK', weap: ['Miecz', 'Szabla'], desc: 'Obrażenia mieczy i szabel.' },
  { k: 'Topory', cat: 'Mistrzostwo broni', icon: '🪓', per: 2, unit: '% ATK', weap: ['Topór'], desc: 'Obrażenia toporów.' },
  { k: 'Włócznie', cat: 'Mistrzostwo broni', icon: '🔱', per: 2, unit: '% ATK', weap: ['Włócznia'], desc: 'Obrażenia włóczni.' },
  { k: 'Łuki', cat: 'Mistrzostwo broni', icon: '🏹', per: 2, unit: '% ATK', weap: ['Łuk'], desc: 'Obrażenia łuków.' },
  { k: 'Młoty bojowe', cat: 'Mistrzostwo broni', icon: '🔨', per: 2, unit: '% ATK', weap: ['Młot bojowy'], desc: 'Obrażenia młotów.' },
  { k: 'Sztylety', cat: 'Mistrzostwo broni', icon: '🔪', per: 2, unit: '% ATK', weap: ['Sztylet'], desc: 'Obrażenia sztyletów.' },
  { k: 'Zbroje płytowe', cat: 'Pancerze i obrona', icon: '🦺', per: 2, unit: '% bonusów sprzętu', armor: ['Zbroja płytowa'], desc: 'Wzmacnia bonusy sprzętu, gdy nosisz zbroję płytową.' },
  { k: 'Kolczugi', cat: 'Pancerze i obrona', icon: '🥋', per: 2, unit: '% bonusów sprzętu', armor: ['Kolczuga'], desc: 'Wzmacnia bonusy sprzętu, gdy nosisz kolczugę.' },
  { k: 'Zbroje skórzane', cat: 'Pancerze i obrona', icon: '🧥', per: 2, unit: '% bonusów sprzętu', armor: ['Zbroja skórzana'], desc: 'Wzmacnia bonusy sprzętu, gdy nosisz zbroję skórzaną.' },
  { k: 'Tarcze', cat: 'Pancerze i obrona', icon: '🛡️', per: 2, unit: '% bonusów sprzętu', desc: 'Wzmacnia bonusy sprzętu, gdy nosisz tarczę.' },
  { k: 'Krytyk', cat: 'Walka', icon: '🎯', per: 0.3, unit: '% szansy krytyka', desc: 'Szansa na cios krytyczny.' },
  { k: 'Szybkość ataku', cat: 'Walka', icon: '⚡', per: 1, unit: '% szybkości ataku', desc: 'Szybsze ataki, czyli szybsze zabijanie.' },
  { k: 'Siła ciosu', cat: 'Walka', icon: '💥', per: 1, unit: '% ATK', desc: 'Mocniejsze ciosy.' },
  { k: 'Obrażenia krytyczne', cat: 'Walka', icon: '💢', per: 2, unit: '% obrażeń krytycznych', desc: 'Silniejsze trafienia krytyczne.' },
  { k: 'Cios Wirujący', cat: 'Umiejętności czynne', icon: '🌀', per: 3, unit: '% obrażeń', desc: 'Silniejszy cios wirujący (co 5 sek.).' },
  { k: 'Furia', cat: 'Umiejętności czynne', icon: '🔥', per: 3, unit: '% obrażeń', desc: 'Silniejszy cios furii (co 10 sek.).' },
  { k: 'Nauka', cat: 'Rozwój', icon: '📖', per: 1, unit: '% XP', desc: 'Więcej doświadczenia z walk.' },
  { k: 'Poszukiwacz', cat: 'Rozwój', icon: '🧭', per: 1, unit: '% szansy na bonus', desc: 'Szansa na dodatkowy przedmiot z lochu.' },
  { k: 'Zbieractwo', cat: 'Rzemiosło i zbieractwo', icon: '🧺', per: 3, unit: ' lvl', desc: 'Rzadkie znaleziska ze sprzątania.' },
  { k: 'Mechanika', cat: 'Rzemiosło i zbieractwo', icon: '🔧', per: 3, unit: ' lvl', desc: 'Części i mechanizmy ze złomowiska.' },
  { k: 'Pszczelarstwo', cat: 'Rzemiosło i zbieractwo', icon: '🐝', per: 3, unit: ' lvl', desc: 'Wosk i rzadki miód z pasieki.' },
  { k: 'Wędkarstwo', cat: 'Rzemiosło i zbieractwo', icon: '🎣', per: 3, unit: ' lvl', desc: 'Duże ryby i perły z jeziora.' },
  { k: 'Górnictwo', cat: 'Rzemiosło i zbieractwo', icon: '⛏️', per: 1, unit: ' lvl', desc: 'Szlachetne rudy i kryształy z kopalni.' },
  { k: 'Łowiectwo', cat: 'Rzemiosło i zbieractwo', icon: '🦌', per: 1, unit: ' lvl', desc: 'Skóry, mięso i trofea z lasu.' },
  { k: 'Kowalstwo', cat: 'Rzemiosło i zbieractwo', icon: '⚒️', per: 0.5, unit: '% szansy ulepszeń', desc: 'Większa szansa sukcesu u kowala.' },
  { k: 'Handel', cat: 'Rzemiosło i zbieractwo', icon: '⚖️', per: 1, unit: '% ceny sprzedaży', desc: 'Lepsze ceny sprzedaży.' },
  { k: 'Dowodzenie', cat: 'Dowodzenie miastem', icon: '🚩', per: 2, unit: '% chwały', desc: 'Więcej chwały miasta, a przy Kamieniach Wojny rzadsze łupy.' },
  { k: 'Strateg', cat: 'Dowodzenie miastem', icon: '♟️', per: 1, unit: '% mocy w wojnie', desc: 'Silniejszy w wojnach miast.' },
  { k: 'Patriotyzm', cat: 'Dowodzenie miastem', icon: '🏅', per: 1, unit: '% nagród z wojen', desc: 'Większe nagrody z wojen.' },
];
const CATS = [...new Set(SKILLS.map(x => x.cat))];
const ICON = { 'Miecz': '🗡️', 'Topór': '🪓', 'Włócznia': '🔱', 'Szabla': '⚔️', 'Łuk': '🏹', 'Młot bojowy': '🔨', 'Sztylet': '🔪',
  'Tarcza': '🛡️', 'Puklerz': '🥏', 'Hełm': '🪖', 'Kaptur': '🧢', 'Zbroja płytowa': '🦺', 'Kolczuga': '🥋', 'Zbroja skórzana': '🧥',
  'Rękawice': '🧤', 'Buty': '🥾', 'Naszyjnik': '📿', 'Amulet': '🧿', 'Pierścień': '💍', 'Sygnet': '💍', 'Pas': '🎗️' };
const slotOf = k => SLOTS.find(s => s.k === k);
let itemId = 1;
function mk(slot, tier, q) {
  const sl = slotOf(slot), [base, g] = pick(sl.bases);
  return { id: itemId++, slot, name: `${base} ${TIERS[tier][G[g]]}`, icon: ICON[base] || '❔', base, tier, q, plus: 0 };
}
const val = it => 10 * 1.9 ** it.tier * QUAL[it.q].m * (1 + it.plus * 0.2);
function stats(it) {
  const w = slotOf(it.slot).w, v = val(it);
  return { atk: Math.round((w.atk || 0) * v), spd: +((w.spd || 0) * v * 0.1).toFixed(1), crit: +((w.crit || 0) * v * 0.05).toFixed(1) };
}
// bonus kompletu: ile przedmiotów tego samego tieru nosisz (3 → +5%, 6 → +12%, 9 → +25%)
const setInfo = eq => {
  const c = {}; for (const it of Object.values(eq)) if (it) c[it.tier] = (c[it.tier] || 0) + 1;
  let best = 0, tier = 0; for (const [t, n] of Object.entries(c)) if (n > best) { best = n; tier = +t; }
  return { tier, count: best, bonus: best >= 9 ? 0.25 : best >= 6 ? 0.12 : best >= 3 ? 0.05 : 0 };
};
const tot = () => {
  const t = { atk: 0, spd: 0, crit: 0 };
  for (const it of Object.values(S.eq)) if (it) { const x = stats(it); t.atk += x.atk; t.spd += x.spd; t.crit += x.crit; }
  const k = 1 + setInfo(S.eq).bonus + aMast(); t.atk = Math.round(t.atk * k); t.spd = +(t.spd * k).toFixed(1); t.crit = +(t.crit * k).toFixed(1);
  return t;
};
const statsAt = (it, plus) => stats({ ...it, plus });
const itemTxt = it => { const s = stats(it); return [s.atk && `ATK +${s.atk}`, s.spd && `Szybkość +${s.spd}%`, s.crit && `Krytyk +${s.crit}%`].filter(Boolean).join(' · '); };
const sellPrice = it => Math.round(val(it) * 3 * (1 + lv('Handel') * 0.01));
const selItem = () => { for (const it of [...Object.values(S.eq), ...S.inv]) if (it && it.id === S.sel) return it; return null; };
const CHANCE = [100, 100, 100, 80, 60, 45, 30, 20, 10]; // +0→+1 ... +8→+9

const S = {
  lvl: 1, xp: 0, gold: 0, points: 0,
  eq: {}, inv: [], sel: null,
  duel: { phase: 'idle', opp: null, day: '', used: 0, div: 0, pts: 0, streak: 0, wins: 0, losses: 0, hist: [], last: null },
  dung: { active: null, report: '', sel: 0, dur: 0, used: 0, day: '', got: {}, recent: [], last: null }, gather: { active: null, day: '', used: 0, report: '', loc: 0, dur: 0, interval: 9, queue: [], recent: [], got: {} },
  war: { signed: false, running: false, hist: [], opp: 'Warszawa' },
  exp: { on: true, map: 0, enemy: null, wait: 0, kills: 0, metins: 0, dmg: 0, recent: [] }, sub: 'dung',
  sk: {}, skOpen: null, lootOpen: {}, train: null, autoTrain: false, view: 'fight',
  sets: { main: {}, pvp: {} }, setName: 'main', markMode: false, marked: new Set(),
  bag: { 'Ruda': 0, 'Skóra': 0, 'Kamień Ochrony': 0, 'Kamień Przemiany': 0, 'Złom': 0, 'Szmaty': 0, 'Drewno': 0, 'Zioła': 0, 'Mięso': 0, 'Ryba': 0, 'Perła': 0, 'Części': 0, 'Mechanizm': 0, 'Miód': 0, 'Wosk': 0 },
  glory: 0, paused: false, speed: Math.min(600, +new URLSearchParams(location.search).get('szybko') || 1),
  offline: false,
};
const xpNeed = l => Math.round(40 * Math.pow(l, 1.5));
const lv = k => S.sk[k] || 0;
const skillFor = (kind, base) => SKILLS.find(x => x[kind] && x[kind].includes(base));
const wMast = () => { const x = S.eq.weapon && skillFor('weap', S.eq.weapon.base); return x ? lv(x.k) * 0.02 : 0; };
const aMast = () => { const x = S.eq.armor && skillFor('armor', S.eq.armor.base); return (x ? lv(x.k) * 0.02 : 0) + (S.eq.shield ? lv('Tarcze') * 0.02 : 0); };
const atkTotal = () => (18 + S.lvl * 2 + tot().atk) * (1 + wMast() + lv('Siła ciosu') * 0.01);
const weaponDmg = atkTotal;
const spdMult = () => 1 + tot().spd / 100 + lv('Szybkość ataku') * 0.01;
const critCh = () => Math.min(0.9, 0.11 + tot().crit / 100 + lv('Krytyk') * 0.003);
const critMult = () => 2 + lv('Obrażenia krytyczne') * 0.02;
const skillBonus = () => atkTotal() * (2.5 * (1 + lv('Cios Wirujący') * 0.03) / 5 + 4 * (1 + lv('Furia') * 0.03) / 10); // obrażenia na sek. z umiejętności czynnych
const baseDps = () => atkTotal() * spdMult() * (1 + critCh() * (critMult() - 1));
const dps = () => baseDps() + skillBonus();
const warMult = () => 1 + lv('Strateg') * 0.01;
const power = () => Math.round(dps() * 2.2);
const powerWith = eq => { const old = S.eq; S.eq = eq; const p = power(); S.eq = old; return p; };
const trainSecs = k => Math.round(10 * (lv(k) + 1) ** 1.6);
const trainCost = k => Math.round(20 * (lv(k) + 1) ** 1.5);
const skillCap = () => Math.min(50, S.lvl);
function startTrain(k) {
  if (S.train || lv(k) >= skillCap() || S.gold < trainCost(k)) return false;
  S.gold -= trainCost(k); const t = trainSecs(k); S.train = { k, left: t, total: t }; return true;
}
function trainTick() {
  if (!S.train) return;
  if (--S.train.left > 0) return;
  const k = S.train.k; S.sk[k] = lv(k) + 1; S.train = null;
  log(`✨ Umiejętność „${k}” osiągnęła poziom ${lv(k)}!`, 'crit');
  if (S.autoTrain) startTrain(k);
}
S.eq = S.sets.main;
S.eq.weapon = mk('weapon', 0, 0); S.eq.armor = mk('armor', 0, 0); S.eq.helmet = mk('helmet', 0, 0);
S.sel = S.eq.weapon.id;

function equip(it) {
  const idx = S.inv.indexOf(it); if (idx < 0) return;
  let slot = it.slot;
  if (slot === 'ring1' && S.eq.ring1 && !S.eq.ring2) slot = 'ring2';
  S.inv.splice(idx, 1);
  if (S.eq[slot]) S.inv.push(S.eq[slot]);
  S.eq[slot] = { ...it, slot };
  if (S.sel === it.id) S.sel = S.eq[slot].id;
  render();
}
function sell(it) {
  const idx = S.inv.indexOf(it); if (idx < 0) return;
  S.inv.splice(idx, 1); S.gold += sellPrice(it); if (S.sel === it.id) S.sel = null; render();
}

function log(text, cls) {
  if (S.offline) return;
  const d = document.createElement('div'); d.className = cls || ''; d.textContent = text;
  const box = $('#log'); box.prepend(d);
  while (box.children.length > 60) box.lastChild.remove();
}
function gainXp(x) {
  S.xp += x;
  while (S.xp >= xpNeed(S.lvl)) { S.xp -= xpNeed(S.lvl); S.lvl++; S.points += 1; log(`🎉 Awans na poziom ${S.lvl}! (+1 punkt umiejętności)`, 'loot'); }
}

// ================= KOWAL: wybór przedmiotu, koszty, szanse i animacja kucia =================
const smith = { busy: false, hist: [] };
const upChance = it => Math.min(100, CHANCE[it.plus] + lv('Kowalstwo') * 0.5);
const BOOST = 10; // Kamień Przemiany dodaje tyle punktów procentowych szansy
// koszt kolejnego poziomu: złoto + materiały (im wyżej, tym więcej i bardziej zaawansowane)
const upCost = it => {
  const n = it.plus + 1, mats = { 'Ruda': n * 2 };
  if (n >= 4) mats['Złom'] = (n - 2) * 3;
  if (n >= 7) mats['Części'] = (n - 5) * 2;
  return { gold: Math.round(50 * n * n * (1 + it.tier * 1.2)), mats };
};
const auraOf = p => p >= 9 ? 'a4' : p >= 7 ? 'a3' : p >= 4 ? 'a2' : p >= 1 ? 'a1' : '';
const equippedKey = it => Object.keys(S.eq).find(k => S.eq[k] && S.eq[k].id === it.id);

function canAfford(it) { const c = upCost(it); return S.gold >= c.gold && Object.entries(c.mats).every(([k, v]) => (S.bag[k] || 0) >= v); }

function renderSmith() {
  const pick1 = it => () => { if (!smith.busy) { S.sel = it.id; render(); } };
  const g = $('#sm-grid'); g.replaceChildren();
  for (const sl of SLOTS) { const it = S.eq[sl.k]; g.append(cell(it, { area: sl.k, label: sl.n, color: it && QUAL[it.q].c, plus: it && it.plus, sel: it && S.sel === it.id, title: it && itemTitle(it), onclick: it && pick1(it) })); }
  const inv = $('#sm-inv'); inv.replaceChildren();
  for (const it of S.inv) inv.append(cell(it, { color: QUAL[it.q].c, plus: it.plus, sel: S.sel === it.id, title: itemTitle(it), onclick: pick1(it) }));
  if (!S.inv.length) { const p = document.createElement('p'); p.className = 'muted small'; p.style.gridColumn = '1 / -1'; p.textContent = 'Plecak pusty. Przedmioty zdobywasz w lochach i na mapach EXP.'; inv.append(p); }
  const hist = $('#sm-hist'); hist.replaceChildren();
  for (const h of smith.hist) { const d = document.createElement('div'); d.className = 'hrow ' + (h.ok ? 'w' : 'l'); d.textContent = `${h.ok ? '✅' : h.prot ? '🛡️' : '❌'} ${h.name} +${h.from} → +${h.to}`; hist.append(d); }
  if (smith.busy) return; // w trakcie kucia nie ruszamy kuźni
  fillForge(selItem());
}

function fillForge(it) {
  const fi = $('#fg-item'), fp = $('#fg-plus'), fn = $('#fg-name'), aura = $('#fg-aura');
  const info = $('#sm-info'), costs = $('#sm-costs'), btn = $('#b-upgrade');
  info.replaceChildren(); costs.replaceChildren();
  if (!it) {
    fi.textContent = '⚒️'; fp.textContent = ''; fn.textContent = 'Wybierz przedmiot'; aura.className = 'fgaura';
    info.textContent = 'Kliknij przedmiot z ekwipunku lub plecaka po lewej, aby zobaczyć koszt i szansę ulepszenia.';
    $('#sm-chance').textContent = '—'; $('#sm-gauge').style.width = '0'; $('#sm-fail').textContent = '';
    btn.disabled = true; btn.textContent = '🔨 ULEPSZ'; return;
  }
  fi.textContent = it.icon; fp.textContent = it.plus ? '+' + it.plus : ''; fn.textContent = it.name; fn.style.color = QUAL[it.q].c; aura.className = 'fgaura ' + auraOf(it.plus);
  const max = it.plus >= 9;
  // podgląd statystyk przed i po
  const now = stats(it), nxt = max ? now : statsAt(it, it.plus + 1);
  const head = document.createElement('div'); head.className = 'smhead'; head.textContent = `${it.name} +${it.plus}${max ? '' : ' → +' + (it.plus + 1)}`; head.style.color = QUAL[it.q].c; info.append(head);
  const sub = document.createElement('div'); sub.className = 'muted small'; sub.textContent = `${QUAL[it.q].n} · tier T${it.tier + 1} · ${equippedKey(it) ? 'założony' : 'w plecaku'}`; info.append(sub);
  const rows = document.createElement('div'); rows.className = 'kv';
  const stat = (n, a, b, suf = '') => { if (!a && !b) return; const d = document.createElement('div'); const x = document.createElement('span'); x.textContent = n; const y = document.createElement('b'); y.textContent = max || a === b ? `${a}${suf}` : `${a}${suf} → ${b}${suf}  (+${+(b - a).toFixed(1)}${suf})`; if (!max && b > a) y.style.color = '#3ecf8e'; d.append(x, y); rows.append(d); };
  stat('⚔️ ATK', now.atk, nxt.atk); stat('⚡ Szybkość ataku', now.spd, nxt.spd, '%'); stat('🎯 Krytyk', now.crit, nxt.crit, '%');
  const k = equippedKey(it);
  if (k && !max) { const eq2 = { ...S.eq, [k]: { ...it, plus: it.plus + 1 } }, d = powerWith(eq2) - power(); const r = document.createElement('div'); const x = document.createElement('span'); x.textContent = '💪 SIŁA'; const y = document.createElement('b'); y.textContent = `${power()} → ${power() + d}  (+${d})`; y.style.color = '#ffd24d'; r.append(x, y); rows.append(r); }
  info.append(rows);
  if (max) {
    $('#sm-chance').textContent = 'MAKSYMALNY POZIOM'; $('#sm-gauge').style.width = '100%'; $('#sm-fail').textContent = 'Ten przedmiot jest już ulepszony do +9.';
    btn.disabled = true; btn.textContent = '✨ +9 MAKSYMALNIE'; return;
  }
  // koszty
  const c = upCost(it), chip = (ic, txt, ok) => { const e = document.createElement('div'); e.className = 'costchip ' + (ok ? 'ok' : 'no'); e.textContent = `${ic} ${txt}`; costs.append(e); };
  chip('🪙', `${c.gold} / ${S.gold}`, S.gold >= c.gold);
  for (const [m, v] of Object.entries(c.mats)) chip(MAT_ICON[m] || '📦', `${m} ${v} / ${S.bag[m] || 0}`, (S.bag[m] || 0) >= v);
  // szansa
  const base = upChance(it), useBoost = $('#use-boost').checked && S.bag['Kamień Przemiany'] > 0, chance = Math.min(100, base + (useBoost ? BOOST : 0));
  $('#sm-gauge').style.width = chance + '%'; $('#sm-gauge').className = chance >= 70 ? 'g-hi' : chance >= 40 ? 'g-mid' : 'g-lo';
  $('#sm-chance').textContent = `Szansa sukcesu: ${+chance.toFixed(1)}%${useBoost ? ` (w tym +${BOOST}% z kamienia)` : ''}`;
  $('#sm-fail').textContent = chance >= 100 ? 'Ulepszenie pewne, bez ryzyka.' : `Porażka ${+(100 - chance).toFixed(1)}%: przedmiot spada do +${Math.max(0, it.plus - 1)}${S.bag['Kamień Ochrony'] > 0 ? ' (chyba że użyjesz Kamienia Ochrony)' : ''}.`;
  $('#opt-prot-n').textContent = `(masz ${S.bag['Kamień Ochrony']})`; $('#opt-boost-n').textContent = `(masz ${S.bag['Kamień Przemiany']})`;
  btn.disabled = !canAfford(it); btn.textContent = canAfford(it) ? '🔨  ULEPSZ  🔨' : 'BRAK MATERIAŁÓW';
}

// ---- animacja kucia ----
function forgeEl(cls, css, ms = 700, text = '') {
  const el = document.createElement('div'); el.className = 'fx ' + cls; if (text) el.textContent = text;
  for (const [k, v] of Object.entries(css || {})) k.startsWith('--') ? el.style.setProperty(k, v) : (el.style[k] = v);
  $('#fg-field').append(el); setTimeout(() => el.remove(), ms); return el;
}
function forgeInit() {
  const e = $('#embers'); if (!e || e.children.length) return;
  for (let k = 0; k < 26; k++) { const i = document.createElement('i'); i.style.left = rnd(4, 96) + '%'; i.style.animationDelay = rnd(0, 5) + 's'; i.style.animationDuration = rnd(3, 6) + 's'; e.append(i); }
}
function strike(big) {
  const h = $('#fg-hammer'), f = $('#forge'); h.classList.remove('swing'); void h.offsetWidth; h.classList.add('swing');
  setTimeout(() => {
    const n = big ? 20 : 9;
    for (let k = 0; k < n; k++) { const a = rnd(-Math.PI, 0), d = rnd(50, big ? 200 : 120); forgeEl('spark', { left: '50%', bottom: '104px', '--dx': Math.cos(a) * d + 'px', '--dy': Math.sin(a) * d + 'px', background: pick(['#ffd24d', '#ff9a3c', '#fff3b0']) }, 600); }
    forgeEl('impact' + (big ? ' crit' : ''), { left: '50%', bottom: '104px', top: 'auto' }, 600);
    f.classList.remove('shake'); void f.offsetWidth; f.classList.add('shake');
    $('#fg-item').classList.remove('hotpulse'); void $('#fg-item').offsetWidth; $('#fg-item').classList.add('hotpulse');
  }, 230);
}
function upgrade() {
  const it = selItem(), msg = $('#smith-msg'); msg.textContent = '';
  if (!it) { msg.textContent = 'Wybierz przedmiot.'; return; }
  if (smith.busy || it.plus >= 9) return;
  if (!canAfford(it)) { msg.textContent = 'Brakuje materiałów lub złota.'; return; }
  const c = upCost(it);
  S.gold -= c.gold; for (const [k, v] of Object.entries(c.mats)) S.bag[k] -= v;
  const boost = $('#use-boost').checked && S.bag['Kamień Przemiany'] > 0; if (boost) S.bag['Kamień Przemiany']--;
  const hasProt = $('#use-prot').checked && S.bag['Kamień Ochrony'] > 0;
  const chance = Math.min(100, upChance(it) + (boost ? BOOST : 0)), ok = Math.random() * 100 < chance, from = it.plus;
  smith.busy = true; $('#b-upgrade').disabled = true; $('#b-upgrade').textContent = '⚒️ KUJĘ…';
  const label = $('#fg-state'); label.textContent = `Szansa ${+chance.toFixed(1)}%`;
  const hot = $('#forge'); hot.classList.add('hot');
  strike(false); label.textContent = 'Uderzenie 1/3…';
  setTimeout(() => { strike(false); label.textContent = 'Uderzenie 2/3…'; }, 760);
  setTimeout(() => { strike(false); label.textContent = 'Uderzenie 3/3…'; }, 1520);
  setTimeout(() => { label.textContent = '…'; $('#forge').classList.add('tense'); }, 2250);
  setTimeout(() => { strike(true); }, 3000);
  setTimeout(() => { // wynik
    $('#forge').classList.remove('tense'); hot.classList.remove('hot');
    const flash = $('#fg-flash'), ban = $('#fg-banner'); let prot = false;
    flash.className = 'xflash'; void flash.offsetWidth;
    if (ok) {
      it.plus++; flash.classList.add('gold', 'go'); ban.className = 'fgbanner show ok'; ban.textContent = `SUKCES!  +${it.plus}`;
      forgeEl('shock', { left: '50%', bottom: '104px', top: 'auto' }, 800);
      for (let k = 0; k < 24; k++) { const a = rnd(0, Math.PI * 2), d = rnd(90, 240); forgeEl('burst', { left: '50%', top: '44%', '--dx': Math.cos(a) * d + 'px', '--dy': Math.sin(a) * d + 'px', '--rs': rnd(-200, 200) + 'deg' }, 1000, pick(['✨', '⭐', '💫', '✦'])); }
      log(`🔨 Kowal: ${it.name} → +${it.plus}`, it.plus >= 7 ? 'crit' : 'loot');
    } else if (hasProt) {
      prot = true; S.bag['Kamień Ochrony']--; flash.classList.add('blue', 'go'); ban.className = 'fgbanner show prot'; ban.textContent = '🛡️ OCHRONA! Przedmiot ocalony';
      for (let k = 0; k < 10; k++) { const a = rnd(0, Math.PI * 2), d = rnd(70, 170); forgeEl('burst', { left: '50%', top: '44%', '--dx': Math.cos(a) * d + 'px', '--dy': Math.sin(a) * d + 'px', '--rs': '0deg' }, 900, '🛡️'); }
    } else {
      it.plus = Math.max(0, it.plus - 1); flash.classList.add('red', 'go'); ban.className = 'fgbanner show bad'; ban.textContent = `PORAŻKA  +${it.plus}`;
      $('#fg-item').classList.add('crack'); setTimeout(() => $('#fg-item').classList.remove('crack'), 1200);
      for (let k = 0; k < 12; k++) { const a = rnd(0, Math.PI * 2), d = rnd(60, 160); forgeEl('burst', { left: '50%', top: '44%', '--dx': Math.cos(a) * d + 'px', '--dy': Math.sin(a) * d + 'px', '--rs': rnd(-300, 300) + 'deg' }, 900, pick(['💥', '🔥', '💔'])); }
    }
    smith.hist.unshift({ name: it.name, from, to: it.plus, ok, prot }); if (smith.hist.length > 8) smith.hist.pop();
    $('#fg-plus').textContent = it.plus ? '+' + it.plus : ''; $('#fg-aura').className = 'fgaura ' + auraOf(it.plus);
    $('#fg-state').textContent = ok ? '🎉 Udało się!' : prot ? 'Ocalony!' : 'Nie udało się…';
  }, 3500);
  setTimeout(() => { $('#fg-banner').className = 'fgbanner'; smith.busy = false; render(); }, 5600);
}

const MAT_ICON = { 'Ruda': '🪨', 'Skóra': '🟤', 'Kamień Ochrony': '💎', 'Kamień Przemiany': '🔮', 'Złom': '⚙️', 'Szmaty': '🧵', 'Drewno': '🪵', 'Zioła': '🌿', 'Mięso': '🍖', 'Ryba': '🐟', 'Perła': '🦪', 'Części': '🔩', 'Mechanizm': '⚙️', 'Miód': '🍯', 'Wosk': '🕯️' };
function cell(it, o = {}) {
  const d = document.createElement('div');
  d.className = 'cell' + (it ? '' : ' empty') + (o.sel ? ' sel' : '') + (o.mark ? ' mark' : '');
  if (o.area) d.style.gridArea = o.area;
  if (it) {
    d.style.borderColor = o.color || '';
    const i = document.createElement('span'); i.className = 'ico'; i.textContent = it.icon; d.append(i);
    if (o.plus) { const p = document.createElement('em'); p.className = 'plus'; p.textContent = '+' + o.plus; d.append(p); }
    if (o.count) { const c = document.createElement('em'); c.className = 'cnt'; c.textContent = o.count; d.append(c); }
    d.title = o.title || '';
  } else if (o.label) { const l = document.createElement('span'); l.className = 'lbl'; l.textContent = o.label; d.append(l); }
  if (o.onclick) d.onclick = o.onclick;
  return d;
}
const itemTitle = it => `${it.name}${it.plus ? ' +' + it.plus : ''}\n${QUAL[it.q].n} · tier ${it.tier + 1}\n${itemTxt(it)}`;

function renderEq() {
  // lalka ze slotami
  const g = $('#eq-grid'); g.replaceChildren();
  for (const sl of SLOTS) {
    const it = S.eq[sl.k];
    g.append(cell(it, {
      area: sl.k, label: sl.n, color: it && QUAL[it.q].c, plus: it && it.plus, sel: it && S.sel === it.id,
      title: it && itemTitle(it), onclick: it && (() => { S.sel = it.id; render(); }),
    }));
  }
  const t = tot(); const si = setInfo(S.eq);
  $('#eq-sum').textContent = `Razem: ATK +${t.atk} · Szybkość +${t.spd}% · Krytyk +${t.crit}% · SIŁA ${power()}` +
    (si.bonus ? ` · komplet T${si.tier + 1}: ${si.count} szt. (+${Math.round(si.bonus * 100)}%)` : ` · komplet: ${si.count}/3 do +5%`);
  document.querySelectorAll('[data-set]').forEach(b => b.classList.toggle('on', b.dataset.set === S.setName));

  // inwentarz: siatka 5×7, przedmioty, potem stosy materiałów
  const inv = $('#inv'); inv.replaceChildren();
  $('#inv-count').textContent = `${S.inv.length} / ${INV_SIZE}`;
  let used = 0;
  for (const it of S.inv) {
    inv.append(cell(it, {
      color: QUAL[it.q].c, plus: it.plus, sel: S.sel === it.id, mark: S.marked.has(it.id), title: itemTitle(it),
      onclick: () => { if (S.markMode) { S.marked.has(it.id) ? S.marked.delete(it.id) : S.marked.add(it.id); } else S.sel = it.id; render(); },
    })); used++;
  }
  for (const [k, v] of Object.entries(S.bag)) {
    if (v > 0) { inv.append(cell({ icon: MAT_ICON[k] }, { count: v, title: `${k} ×${v}` })); used++; }
  }
  for (let i = used; i < INV_SIZE; i++) inv.append(cell(null));

  // szczegóły zaznaczonego przedmiotu
  const det = $('#inv-detail'); det.replaceChildren();
  const it = selItem(), inInv = it && S.inv.includes(it);
  if (it) {
    const n = document.createElement('b'); n.textContent = `${it.name}${it.plus ? ' +' + it.plus : ''}`; n.style.color = QUAL[it.q].c;
    const s = document.createElement('small'); s.className = 'muted'; s.textContent = `${QUAL[it.q].n} · ${itemTxt(it)}`;
    det.append(n, document.createElement('br'), s);
    if (inInv) {
      const eq2 = { ...S.eq }; let sl2 = it.slot; if (sl2 === 'ring1' && eq2.ring1 && !eq2.ring2) sl2 = 'ring2'; eq2[sl2] = it;
      const dlt = powerWith(eq2) - power(), pr = document.createElement('div');
      pr.className = dlt > 0 ? 'delta up' : dlt < 0 ? 'delta down' : 'delta';
      pr.textContent = `SIŁA po założeniu: ${power()} → ${power() + dlt} (${dlt > 0 ? '+' : ''}${dlt})`; det.append(pr);
      const a = document.createElement('div'); a.className = 'acts';
      const be = document.createElement('button'); be.textContent = 'Załóż'; 
      be.onclick = () => equip(it);
      const bs = document.createElement('button'); bs.textContent = `Sprzedaj (${sellPrice(it)} 🪙)`; bs.className = 'danger'; bs.onclick = () => sell(it);
      a.append(be, bs); det.append(a);
    }
  } else { det.textContent = 'Kliknij przedmiot, aby zobaczyć szczegóły.'; det.className = 'muted'; }
  $('#b-mark').classList.toggle('on', S.markMode);
  const n = S.marked.size;
  $('#b-sellm').classList.toggle('hidden', !S.markMode);
  $('#b-sellm').textContent = `Sprzedaj zaznaczone (${n})`; $('#b-sellm').disabled = !n;


}

// ================= POJEDYNKI 1v1 + LIGI (jak dywizje w EA FC) =================
const DUEL_MAX = 10, PTS_UP = 100;
const DIVS = ['Dywizja 10', 'Dywizja 9', 'Dywizja 8', 'Dywizja 7', 'Dywizja 6', 'Dywizja 5', 'Dywizja 4', 'Dywizja 3', 'Dywizja 2', 'Dywizja 1', 'Elita'];
const divIcon = d => d >= 10 ? '👑' : d >= 8 ? '🟣' : d >= 6 ? '🔵' : d >= 4 ? '🟡' : d >= 2 ? '⚪' : '🟤';
const refPower = d => Math.round(150 * 1.38 ** d); // typowa siła rywala w dywizji
const NICKS = ['Kasztelan', 'Zosia_Łuk', 'Rycerz_Jan', 'Wiktor_Warta', 'Szabla_Ola', 'Młot_Marek', 'Cichy_Łowca', 'Dziki_Kuba', 'Gryf', 'Halabarda_Ania', 'Wilk_Stary', 'Łucznik_Pit', 'Tarcza_Ewa', 'Kowal_Rysiek'];
const OPP_CITIES = ['Warszawa', 'Kraków', 'Wrocław', 'Gdańsk', 'Łódź', 'Szczecin', 'Lublin', 'Katowice', 'Białystok', 'Rzeszów', 'Olsztyn', 'Opole'];
const todayKey = () => new Date().toDateString();
function dayReset() {
  if (S.duel.day !== todayKey()) { S.duel.day = todayKey(); S.duel.used = 0; }
  if (S.gather.day !== todayKey()) { S.gather.day = todayKey(); S.gather.used = 0; }
  if (S.dung.day !== todayKey()) { S.dung.day = todayKey(); S.dung.used = 0; }
}
const pvpEq = () => Object.keys(S.sets.pvp).length ? S.sets.pvp : S.sets.main;
const pvpPower = () => powerWith(pvpEq());

// ---- rywal: losowany z ligi, z własnym ekwipunkiem ----
function withOpp(o, fn) {
  const sv = { eq: S.eq, lvl: S.lvl, sk: S.sk }; S.eq = o.eq; S.lvl = o.lvl; S.sk = {};
  try { return fn(); } finally { S.eq = sv.eq; S.lvl = sv.lvl; S.sk = sv.sk; }
}
const statsNow = () => ({ P: power(), atk: Math.round(atkTotal()), spd: (spdMult() - 1) * 100, crit: critCh() * 100, dps: dps() });
const DUEL_ORDER = ['weapon', 'armor', 'helmet', 'boots', 'gloves', 'belt', 'neck', 'ring1', 'ring2', 'shield'];
function genOpponent(div) {
  const target = refPower(div) * rnd(0.9, 1.1);
  const o = { name: pick(NICKS) + Math.floor(rnd(1, 99)), city: pick(OPP_CITIES), lvl: Math.round(3 + div * 4.5), eq: {} };
  const qual = () => { const r = Math.random() * 100; return r < 55 ? 0 : r < 85 ? 1 : r < 97 ? 2 : 3; };
  const build = (t, n, fixedQ) => { o.eq = {}; DUEL_ORDER.slice(0, n).forEach(k => { o.eq[k] = mk(k, t, fixedQ === undefined ? qual() : fixedQ); }); };
  const P = () => withOpp(o, power);
  let t = 0;
  for (let x = 1; x <= 4; x++) { build(x, 10, 0); if (P() <= target * 1.15) t = x; else break; }
  for (let n = 1; n <= 10; n++) { build(t, n); if (P() >= target * 0.95) break; }
  const slots = Object.keys(o.eq);
  for (let g = 0; P() < target * 0.97 && g < 300; g++) { const it = o.eq[pick(slots)]; if (it.plus < 9) it.plus++; }
  const st = withOpp(o, statsNow); o.P = st.P; o.stats = st; o.dps = st.dps;
  return o;
}

// ---- animowany przebieg: szukanie → rywal znaleziony (VS) → wyścig → wynik ----
let searchIv = null, raceIv = null;
function startSearch() {
  dayReset(); const D = S.duel;
  if (D.used >= DUEL_MAX || D.phase === 'searching' || D.phase === 'found' || D.phase === 'racing') return;
  D.used++; D.phase = 'searching'; D.opp = null; renderStage(); render();
  const box = $('#search-names'), pw = $('#search-power'), ph = $('#search-phrase'), phrases = ['Skanuję ligę…', 'Analizuję ekwipunek rywali…', 'Dopasowuję przeciwnika…'];
  const base = refPower(D.div); let tick = 0;
  searchIv = setInterval(() => {
    tick++;
    box.textContent = pick(NICKS) + Math.floor(rnd(1, 99)) + ' · ' + pick(OPP_CITIES);
    pw.textContent = '⚡ ' + Math.round(base * rnd(0.6, 1.5)); pw.classList.toggle('lock', tick > 24);
    ph.textContent = phrases[Math.min(2, Math.floor(tick / 10))];
  }, 90);
  setTimeout(() => { clearInterval(searchIv); searchIv = null; D.opp = genOpponent(D.div); D.phase = 'found'; renderStage(); render();
    let c = 4; const cd = setInterval(() => { c--; const el = $('#countdown'); if (el) el.textContent = c; if (c <= 0) { clearInterval(cd); fightDuel(); } }, 1000);
  }, 2800);
}
// Pojedynek na arenie: obaj mają pulę zdrowia (tylko na czas walki), uderzają na zmianę, wygrywa ten, kto pierwszy zbije przeciwnika.
// Obrażenia = DPS strony, więc silniejszy (lepszy sprzęt) pada później. Pula = 12 uderzeń przeciętnego DPS, więc walka trwa ok. 12 rund.
let fightTimer = null;
const FOE_AVATARS = ['🥷', '🧛', '🤺', '🦹', '🧟'];
function fightDuel() {
  const D = S.duel; if (D.phase !== 'found') return;
  D.phase = 'racing';
  const old = S.eq; S.eq = pvpEq(); const me = { dps: dps(), P: power(), crit: critCh(), cm: critMult() }; S.eq = old;
  const opp = D.opp, od = opp.dps, H = Math.round(12 * (me.dps + od) / 2);
  let hm = H, ho = H; const ev = [], first = Math.random() < 0.5 ? ['me', 'opp'] : ['opp', 'me'];
  for (let r = 1; r <= 40 && hm > 0 && ho > 0; r++) {
    for (const who of first) {
      if (hm <= 0 || ho <= 0) break;
      if (who === 'me') { const c = Math.random() < me.crit, d = Math.round(me.dps * rnd(0.75, 1.25) * (c ? 1 + (me.cm - 1) * 0.5 : 1)); ho = Math.max(0, ho - d); ev.push({ by: 'me', dmg: d, crit: c, hm, ho, r }); }
      else { const c = Math.random() < 0.15, d = Math.round(od * rnd(0.75, 1.25) * (c ? 1.5 : 1)); hm = Math.max(0, hm - d); ev.push({ by: 'opp', dmg: d, crit: c, hm, ho, r }); }
    }
  }
  const win = ho <= 0 ? true : hm <= 0 ? false : ho < hm;
  renderStage();
  let i = 0;
  const step = () => {
    const e = ev[i++];
    if (!e) { koEnd(win, me.P); return; }
    attack(e, H);
    fightTimer = setTimeout(step, 620);
  };
  fightTimer = setTimeout(step, 1000);
}
function attack(e, H) {
  const mine = e.by === 'me', atk = $(mine ? '#fv-al' : '#fv-ar'), def = $(mine ? '#fv-ar' : '#fv-al');
  if (!atk || !def) return;
  atk.classList.remove('lunge'); void atk.offsetWidth; atk.classList.add('lunge');
  setTimeout(() => {
    def.classList.remove('hit'); void def.offsetWidth; def.classList.add('hit');
    const bar = $(mine ? '#fv-hpr' : '#fv-hpl'), txt = $(mine ? '#fv-tr' : '#fv-tl'), hp = mine ? e.ho : e.hm;
    bar.style.width = (100 * hp / H) + '%'; txt.textContent = `${hp} / ${H}`;
    const f = document.createElement('span'); f.className = 'fnum' + (e.crit ? ' crit' : '') + (mine ? '' : ' foe'); f.textContent = (e.crit ? 'KRYT! ' : '') + '−' + e.dmg;
    f.style.left = (mine ? 70 : 20) + rnd(-4, 6) + '%'; $('#fv-field').append(f); setTimeout(() => f.remove(), 1000);
    const lg = $('#fv-log'); const l = document.createElement('div'); l.textContent = `Runda ${e.r}: ${mine ? 'Ty uderzasz' : $('#fv-nr').dataset.n + ' uderza'} za ${e.dmg}${e.crit ? ' (KRYTYK!)' : ''}`; lg.prepend(l); while (lg.children.length > 3) lg.lastChild.remove();
    $('#fv-round').textContent = 'Runda ' + e.r;
  }, 200);
}
function koEnd(win, myP) {
  const loser = $(win ? '#fv-ar' : '#fv-al'); if (loser) loser.classList.add('ko');
  const b = $('#fv-banner'); if (b) { b.textContent = 'K.O.!'; b.classList.add('show'); }
  fightTimer = setTimeout(() => finishDuel(win, myP), 1900);
}
function buildFightScene(box) {
  const opp = S.duel.opp, av = FOE_AVATARS[opp.name.length % FOE_AVATARS.length], old = S.eq; S.eq = pvpEq(); const myP = power(); S.eq = old;
  box.innerHTML = `<h2 class="center epic">⚔ POJEDYNEK ⚔</h2>
    <div class="fbars">
      <div class="fside"><div class="fname"><b id="fv-nl"></b><small id="fv-pl"></small></div><div class="bar fhp"><div id="fv-hpl"></div></div><small id="fv-tl" class="muted"></small></div>
      <div id="fv-round" class="fround">Start</div>
      <div class="fside r"><div class="fname"><b id="fv-nr"></b><small id="fv-pr"></small></div><div class="bar fhp foe"><div id="fv-hpr"></div></div><small id="fv-tr" class="muted"></small></div>
    </div>
    <div class="fscene"><div class="ground"></div>
      <div id="fv-al" class="fighter l">🧙</div><div id="fv-ar" class="fighter r">${av}</div>
      <div id="fv-field" class="ffield"></div><div id="fv-banner" class="fbanner"></div></div>
    <div id="fv-log" class="flog muted small"></div>`;
  $('#fv-nl').textContent = 'Ty'; $('#fv-pl').textContent = '⚡ ' + myP; $('#fv-nr').textContent = opp.name; $('#fv-nr').dataset.n = opp.name; $('#fv-pr').textContent = '⚡ ' + opp.P;
  $('#fv-hpl').style.width = '100%'; $('#fv-hpr').style.width = '100%';
}

function finishDuel(win, myP) {
  const D = S.duel, opp = D.opp; let delta;
  if (win) { D.streak++; delta = 25 + (D.streak >= 3 ? 5 : 0); D.wins++; } else { D.streak = 0; delta = -12; D.losses++; }
  D.pts += delta; let msg = '';
  if (D.pts >= PTS_UP && D.div < 10) { D.div++; D.pts = 30; msg = `🎉 AWANS do: ${DIVS[D.div]}!`; }
  else if (D.pts < 0) { if (D.div > 0) { D.div--; D.pts = 70; msg = `⬇ Spadek do: ${DIVS[D.div]}`; } else D.pts = 0; }
  const gold = win ? Math.round(refPower(D.div) * 0.25) : Math.round(refPower(D.div) * 0.05);
  S.gold += gold; gainXp(win ? 30 + S.lvl * 2 : 10);
  D.hist.unshift({ name: opp.name, city: opp.city, P: opp.P, win, delta, my: myP }); if (D.hist.length > 12) D.hist.pop();
  D.last = { win, delta, gold, msg, opp }; D.phase = 'result'; renderStage(); render();
}
function miniDoll(eq) {
  const g = document.createElement('div'); g.className = 'eqg';
  for (const sl of SLOTS) { const it = eq[sl.k]; g.append(cell(it, { area: sl.k, label: sl.n, color: it && QUAL[it.q].c, plus: it && it.plus, title: it && itemTitle(it) })); }
  return g;
}
function sideCard(title, sub, st, eq, cls) {
  const d = document.createElement('div'); d.className = 'side ' + cls;
  const h = document.createElement('b'); h.textContent = title; const s2 = document.createElement('small'); s2.className = 'muted'; s2.textContent = sub;
  const p = document.createElement('div'); p.className = 'bigpower'; p.textContent = '⚡ ' + st.P;
  const kvb = document.createElement('div'); kvb.className = 'kv';
  kv(kvb, [['ATK', st.atk], ['Szybkość ataku', '+' + st.spd.toFixed(1) + '%'], ['Krytyk', st.crit.toFixed(1) + '%'], ['Obrażenia/s', Math.round(st.dps)]]);
  d.append(h, s2, p, kvb, miniDoll(eq)); return d;
}
function renderStage() {
  const D = S.duel, root = $('#duel-stage'); root.replaceChildren();
  if (D.phase === 'idle') { root.className = ''; return; }
  root.className = 'overlay';
  const box = document.createElement('div'); box.className = 'modal card reveal'; root.append(box);
  if (D.phase === 'searching') {
    const radar = document.createElement('div'); radar.className = 'radar';
    radar.innerHTML = '<span class="sweep"></span><i></i><i></i><i></i><b>⚔️</b>';
    for (let k = 0; k < 6; k++) { const bl = document.createElement('em'); bl.className = 'blip'; bl.style.left = rnd(12, 82) + '%'; bl.style.top = rnd(12, 82) + '%'; bl.style.animationDelay = (k * 0.35) + 's'; radar.append(bl); }
    const ph = document.createElement('h2'); ph.id = 'search-phrase'; ph.className = 'center epic'; ph.textContent = 'Skanuję ligę…';
    const lg = document.createElement('div'); lg.className = 'center muted'; lg.textContent = DIVS[D.div] + ' · szukam godnego przeciwnika';
    const n = document.createElement('div'); n.id = 'search-names'; n.className = 'center muted flicker'; n.textContent = '…';
    const pwr = document.createElement('div'); pwr.id = 'search-power'; pwr.className = 'center slotpower'; pwr.textContent = '⚡ ???';
    box.append(radar, ph, lg, n, pwr); return;
  }
  if (D.phase === 'racing') { buildFightScene(box); return; }
  if (D.phase === 'found' || D.phase === 'racing') {
    const old = S.eq; S.eq = pvpEq(); const me = statsNow(); const myEq = S.eq; S.eq = old;
    const opp = D.opp, ratio = opp.P / me.P;
    const head = document.createElement('h2'); head.className = 'center'; head.textContent = D.phase === 'found' ? '✅ Rywal znaleziony!' : '⚔️ Walka trwa…'; box.append(head);
    const vs = document.createElement('div'); vs.className = 'vs';
    const mark = document.createElement('div'); mark.className = 'vsmark'; mark.textContent = 'VS';
    vs.append(sideCard('Ty', `Poziom ${S.lvl} · Poznań · Zestaw PvP`, me, myEq, 'me'), mark, sideCard(opp.name, `Poziom ${opp.lvl} · ${opp.city} · ${DIVS[D.div]}`, opp.stats, opp.eq, 'foe'));
    box.append(vs);
    const cmp = document.createElement('p'); cmp.className = 'center ' + (ratio > 1.05 ? 'lose' : ratio < 0.95 ? 'win' : 'muted');
    cmp.textContent = ratio > 1.05 ? `Rywal jest silniejszy o ${Math.round((ratio - 1) * 100)}%` : ratio < 0.95 ? `Jesteś silniejszy o ${Math.round((1 / ratio - 1) * 100)}%` : 'Wyrównana walka';
    box.append(cmp);
    if (D.phase === 'found') {
      box.insertAdjacentHTML('beforeend', '<p class="center countdown">⚔️ Walka rozpocznie się za <b id="countdown">4</b> s…</p>');
    } else {
      box.insertAdjacentHTML('beforeend', '<div class="racewrap"><small>Ty</small><div class="bar"><div id="race-a"></div></div><small>Rywal</small><div class="bar en"><div id="race-b"></div></div><p id="race-txt" class="center muted"></p></div>');
    }
    return;
  }
  if (D.phase === 'result') {
    const L = D.last, h = document.createElement('h2'); h.className = 'center ' + (L.win ? 'win' : 'lose'); h.textContent = L.win ? '🏆 ZWYCIĘSTWO' : '💀 PORAŻKA'; box.append(h);
    const p = document.createElement('p'); p.className = 'center'; p.textContent = `z ${L.opp.name} (${L.opp.city}, Siła ${L.opp.P}) · ${L.delta > 0 ? '+' : ''}${L.delta} pkt ligi · +${L.gold} 🪙 ${L.msg}`; box.append(p);
    const row = document.createElement('div'); row.className = 'acts center';
    const close = document.createElement('button'); close.textContent = 'Zamknij'; close.onclick = () => { D.phase = 'idle'; renderStage(); render(); }; row.append(close);
    if (D.used < DUEL_MAX) { const b = document.createElement('button'); b.className = 'bigbtn'; b.textContent = `🥊 Szukaj kolejnego rywala (${DUEL_MAX - D.used} pozostało)`; b.onclick = () => { D.phase = 'idle'; startSearch(); }; row.append(b); }
    box.append(row);
  }
}

function renderDuel() {
  dayReset(); const D = S.duel, left = DUEL_MAX - D.used;
  $('#duel-used').textContent = `${D.used} / ${DUEL_MAX}`;
  const pips = $('#duel-pips'); pips.replaceChildren();
  for (let k = 0; k < DUEL_MAX; k++) { const p = document.createElement('span'); p.className = 'pip' + (k < D.used ? ' used' : ''); pips.append(p); }
  $('#duel-emblem').textContent = divIcon(D.div);
  $('#duel-div').textContent = DIVS[D.div];
  $('#duel-pts').textContent = D.div === 10 ? `${D.pts} pkt · szczyt ligi` : `${D.pts} / ${PTS_UP} pkt do awansu`;
  $('#duel-bar').style.width = Math.min(100, D.pts) + '%';
  $('#duel-myp').textContent = '⚡ ' + pvpPower();
  $('#duel-refp').textContent = '≈ ' + refPower(D.div);
  $('#duel-record').textContent = `${D.wins}W · ${D.losses}P${D.streak >= 2 ? ' · 🔥' + D.streak : ''}`;
  const busy = D.phase === 'searching' || D.phase === 'found' || D.phase === 'racing';
  const b = $('#b-duel'); b.disabled = left <= 0 || busy;
  b.textContent = left <= 0 ? 'LIMIT DZIENNY WYCZERPANY' : D.phase === 'searching' ? 'SZUKAM RYWALA…' : D.phase === 'found' ? 'RYWAL ZNALEZIONY' : D.phase === 'racing' ? 'WALKA TRWA…' : '⚔  SZUKAJ RYWALA  ⚔';
  const lad = $('#duel-ladder'); lad.replaceChildren();
  for (let d = 10; d >= 0; d--) {
    const r = document.createElement('div'); r.className = 'rung' + (d === D.div ? ' me' : d < D.div ? ' past' : '');
    const nm = document.createElement('span'); nm.textContent = `${divIcon(d)} ${DIVS[d]}${d === D.div ? '  ◀ TY' : ''}`;
    const s2 = document.createElement('small'); s2.className = 'muted'; s2.textContent = `rywale ok. ${refPower(d)} Siły`; r.append(nm, s2); lad.append(r);
  }
  const hist = $('#duel-hist'); hist.replaceChildren();
  if (!D.hist.length) { const e = document.createElement('p'); e.className = 'muted small'; e.textContent = 'Brak pojedynków. Nagrody sezonowe zależą od dywizji, do której dojdziesz.'; hist.append(e); }
  for (const x of D.hist) { const d = document.createElement('div'); d.className = 'hrow ' + (x.win ? 'w' : 'l'); d.textContent = `${x.win ? '🏆' : '💀'} ${x.name} (${x.city}) · Siła ${x.P} vs Ty ${x.my}`; const p = document.createElement('small'); p.textContent = `${x.delta > 0 ? '+' : ''}${x.delta} pkt`; d.append(p); hist.append(d); }
}

// ================= LOCHY =================
const DUNGEONS = [
  { k: 'Katakumby pod Rynkiem', icon: '🕯️', lvl: 1, rec: 150, dur: 180, cd: 300, tier: 0 },
  { k: 'Podziemia zamku', icon: '🏚️', lvl: 5, rec: 380, dur: 600, cd: 1200, tier: 1 },
  { k: 'Kopalnia Zagłady', icon: '⛓️', lvl: 12, rec: 700, dur: 1200, cd: 2700, tier: 1 },
  { k: 'Krypta Kasztelana', icon: '⚰️', lvl: 22, rec: 1300, dur: 2400, cd: 5400, tier: 2 },
  { k: 'Twierdza Cienia', icon: '🗝️', lvl: 35, rec: 2500, dur: 4500, cd: 10800, tier: 3 },
  { k: 'Bastion Smoka', icon: '🐉', lvl: 50, rec: 5000, dur: 9000, cd: 21600, tier: 4 },
];
// Przejście lochu = etapy: pułapka → potwory → elita → skrzynia → boss. Walki: gracz zadaje obrażenia równe swojemu DPS, wróg ma stałe HP, gracz nie ginie.
// Pierwotny czas przejścia (dur) = 40% marsz + 60% walki przy zalecanej Sile; słabszy gracz dłużej bije wrogów, silniejszy kończy szybciej.
const dungTime = d => Math.round(d.dur * (0.4 + 0.6 * Math.min(5, d.rec / Math.max(1, power()))));
const DUNG_LIMIT = 12 * 3600;
const BOSSES = [{ n: 'Król Szczurów', i: '🐀' }, { n: 'Strażnik Bramy', i: '👹' }, { n: 'Widmo Górnika', i: '👻' }, { n: 'Kasztelan', i: '🧛' }, { n: 'Cień Twierdzy', i: '🦂' }, { n: 'Smok', i: '🐉' }];
const MOBS = [['Szczury', '🐀'], ['Zjawy żołnierzy', '👻'], ['Nieumarli górnicy', '🧟'], ['Szkielety', '💀'], ['Cienie', '🌑'], ['Smoczy pomiot', '🦎']];
const ELITES = [['Szkielet-wartownik', '☠️'], ['Rycerz-zjawa', '⚔️'], ['Strażnik kopalni', '👺'], ['Rycerz krypty', '🛡️'], ['Łowca cieni', '🥷'], ['Smoczy kapłan', '🔮']];
const walkSecs = d => Math.max(2, Math.round(d.dur * 0.4 / 5));
const enemyHp = (d, kind) => Math.round(d.rec / 2.2 * d.dur * { mob: 0.12, elite: 0.18, boss: 0.30 }[kind]);
const nodeIcons = i => ['🚪', '🪤', MOBS[i][1], ELITES[i][1], '🧰', BOSSES[i].i];
let popTimer = null;

function newRun(a, d) { const w = walkSecs(d); a.run = { node: 0, sub: 'walk', left: w, total: w, enemy: null, loot: { items: [] } }; }
function startDungeon() {
  dayReset(); const D = S.dung, d = DUNGEONS[D.sel], dur = DURS[D.dur];
  if (D.active || S.lvl < d.lvl || D.used + dur.s > DUNG_LIMIT) return;
  D.used += dur.s; D.got = {}; D.report = ''; D.last = null;
  D.active = { i: D.sel, left: dur.s, total: dur.s, phase: 'run', pLeft: 0, pTotal: 0, runs: 0, gold: 0, xp: 0 };
  newRun(D.active, d); render();
}
function endDungeon(a, how) {
  const D = S.dung; D.active = null;
  if (how === 'stop') D.used = Math.max(0, D.used - a.left); // niewykorzystany czas wraca do limitu
  D.report = `${how === 'stop' ? '⏹ Zatrzymano' : '🏁 Zakończono'} sesję (${DUNGEONS[a.i].k}): ${a.runs} przejść · +${a.gold} 🪙 · +${a.xp} XP`;
  log(D.report, 'loot'); render();
}
function showPop(node, cards) { // wyskakujące karty z łupem nad węzłem
  const box = $('#dloot'); box.replaceChildren(); box.style.left = (node * 20) + '%'; box.className = 'dloot' + (node >= 5 ? ' edge' : '');
  cards.forEach((c, k) => { const e = document.createElement('div'); e.className = 'lcard ' + (c.cls || ''); e.textContent = c.text; e.style.animationDelay = (k * 0.4) + 's'; box.append(e); });
  clearTimeout(popTimer); popTimer = setTimeout(() => box.replaceChildren(), 4200 + cards.length * 400);
}
function openChest(a, d) {
  const items = [], nItems = 2 + (Math.random() < lv('Poszukiwacz') * 0.01 ? 1 : 0);
  for (let n = 0; n < nItems; n++) {
    const r = Math.random() * 100, q = 1 + (r < 40 ? 0 : r < 75 ? 1 : r < 93 ? 2 : 3), it = mk(pick(SLOTS).k, d.tier, q);
    if (S.inv.length < INV_SIZE) { S.inv.push(it); items.push(it); S.dung.recent.unshift({ icon: it.icon, k: it.name, q: it.q }); } else { const g = sellPrice(it); S.gold += g; a.gold += g; }
    if (q === 4) log(`🗝️ Legendarny łup ze skrzyni: ${it.icon} ${it.name}!`, 'crit');
  }
  if (S.dung.recent.length > 12) S.dung.recent.length = 12;
  a.run.loot.items = items;
  showPop(4, items.map(it => ({ text: `${it.icon} ${it.name} (${QUAL[it.q].n})`, cls: it.q >= 4 ? 'legend' : it.q >= 3 ? 'epic' : it.q >= 2 ? 'rare' : '' })));
}
function arrive(a, d, node) {
  const r = a.run; r.node = node; r.enemy = null;
  if (node === 1) { r.sub = 'event'; r.left = r.total = 2; }
  else if (node === 4) { r.sub = 'chest'; r.left = r.total = 4; openChest(a, d); }
  else {
    const kind = node === 2 ? 'mob' : node === 3 ? 'elite' : 'boss', hp = enemyHp(d, kind), nm = node === 2 ? MOBS[a.i] : node === 3 ? ELITES[a.i] : [BOSSES[a.i].n, BOSSES[a.i].i];
    r.sub = 'fight'; r.enemy = { name: nm[0], icon: nm[1], hp, max: hp, kind };
  }
}
function completeRun(a, d) {
  const gold = Math.round(d.rec * 0.9), xp = Math.round(xpNeed(d.lvl + 3) * 0.35 * (1 + lv('Nauka') * 0.01)), ore = d.tier * 4 + 4;
  S.gold += gold; gainXp(xp); S.bag['Ruda'] += ore; a.runs++; a.gold += gold; a.xp += xp;
  const stones = [];
  if (Math.random() < 0.15) { S.bag['Kamień Ochrony']++; stones.push('💎 Kamień Ochrony'); }
  if (Math.random() < 0.10) { S.bag['Kamień Przemiany']++; stones.push('🔮 Kamień Przemiany'); }
  S.dung.last = { gold, xp, ore, items: a.run.loot.items, stones, run: a.runs };
  showPop(5, [{ text: `🪙 +${gold}`, cls: '' }, { text: `⭐ +${xp} XP`, cls: '' }, { text: `🪨 +${ore} Rudy`, cls: '' }, ...stones.map(s => ({ text: s, cls: 'epic' }))]);
  a.phase = 'cd'; a.pTotal = a.pLeft = d.cd;
}
function runTick(a, d) {
  const r = a.run;
  if (r.sub === 'walk') { if (--r.left <= 0) arrive(a, d, r.node + 1); return; }
  if (r.sub === 'fight') {
    r.enemy.hp -= dps() * rnd(0.8, 1.2);
    if (r.enemy.hp <= 0) { r.enemy.hp = 0; r.sub = 'down'; r.left = r.total = 1; }
    return;
  }
  if (--r.left <= 0) { // pułapka / skrzynia / pokonany wróg
    if (r.sub === 'down' && r.node === 5) { completeRun(a, d); return; }
    r.sub = 'walk'; r.left = r.total = walkSecs(d);
  }
}
function dungeonTick() {
  const a = S.dung.active; if (!a) return;
  a.left--; const d = DUNGEONS[a.i];
  if (a.phase === 'run') runTick(a, d);
  else if (--a.pLeft <= 0) {
    if (a.left < dungTime(d)) { endDungeon(a, 'end'); return; }
    a.phase = 'run'; S.dung.last = null; newRun(a, d);
  }
  if (a.left <= 0 && S.dung.active) endDungeon(a, 'end');
}

// ---- scena lochu ----
function renderScene() {
  const D = S.dung, a = D.active, i = a ? a.i : D.sel, d = DUNGEONS[i], boss = BOSSES[i];
  const sc = $('#dung-scene'), track = $('#dtrack'), r = a && a.phase === 'run' ? a.run : null;
  if (sc.dataset.i !== String(i)) {
    sc.dataset.i = i; track.replaceChildren();
    nodeIcons(i).forEach((ic, k) => { const e = document.createElement('div'); e.className = 'dnode' + (k === 5 ? ' boss' : ''); e.style.left = (k * 20) + '%'; e.textContent = ic; track.append(e); });
  }
  const kids = [...track.children];
  const pct = !a ? 0 : a.phase === 'cd' ? 100 : r.sub === 'walk' ? (r.node + (1 - r.left / r.total)) * 20 : r.node * 20;
  sc.classList.toggle('run', !!r && r.sub === 'walk'); sc.classList.toggle('rest', !!a && a.phase === 'cd');
  sc.classList.toggle('bossfight', !!r && r.node === 5 && (r.sub === 'fight' || r.sub === 'down'));
  sc.classList.toggle('fighting', !!r && (r.sub === 'fight'));
  $('#dhero').style.left = pct + '%'; $('#dline-fill').style.width = pct + '%';
  kids.forEach((n, k) => { n.classList.toggle('done', !!a && (a.phase === 'cd' || (r && (k < r.node || (k === r.node && r.sub !== 'fight'))))); n.classList.toggle('active', !!r && k === r.node && r.sub === 'fight'); });
  kids[4].textContent = a && (a.phase === 'cd' || (r && r.node >= 4 && r.sub !== 'walk' || r && r.node > 4)) ? '📦' : '🧰';
  $('#dhero').textContent = a && a.phase === 'cd' ? '😴' : '🧙';
  // panel wroga ze stałym HP
  const en = $('#denemy');
  if (r && r.enemy && (r.sub === 'fight' || r.sub === 'down')) {
    const e = r.enemy; en.classList.remove('hidden'); en.className = 'denemy' + (r.node >= 5 ? ' edge' : ''); en.style.left = (r.node * 20) + '%';
    $('#denemy-name').textContent = `${e.icon} ${e.name}`; $('#denemy-bar').style.width = (100 * e.hp / e.max) + '%';
    $('#denemy-txt').textContent = r.sub === 'down' ? 'pokonany!' : `${Math.round(e.hp)} / ${e.max} HP · jeszcze ok. ${fmtSec(e.hp / Math.max(1, dps()))}`;
  } else { en.classList.add('hidden'); }
  const msg = $('#dscene-msg');
  if (!a) msg.textContent = `${d.icon} ${d.k}: boss „${boss.n}”`;
  else if (a.phase === 'cd') msg.textContent = `🔥 Odpoczynek przy ognisku · następne przejście za ${fmtSec(a.pLeft)}`;
  else if (r.sub === 'walk') msg.textContent = r.node === 0 ? 'Wchodzisz do lochu…' : 'Idziesz dalej…';
  else if (r.sub === 'event') msg.textContent = '🪤 Pułapka! Omijasz ją zwinnie.';
  else if (r.sub === 'chest') msg.textContent = '🧰 Skrzynia otwarta!';
  else if (r.sub === 'down') msg.textContent = `✔ Pokonano: ${r.enemy.name}`;
  else msg.textContent = r.node === 5 ? `⚠ BOSS: ${r.enemy.name}` : `⚔️ Walka: ${r.enemy.name}`;
  const res = $('#dung-result'), L = D.last;
  if (a && L) { res.className = 'center caseres legend'; res.textContent = `🏆 Przejście ${L.run}: +${L.gold} 🪙 · +${L.xp} XP · +${L.ore} Rudy ${L.items.map(x => `· ${x.icon} ${x.name} (${QUAL[x.q].n})`).join(' ')} ${L.stones.join(' ')}`; }
  else { res.className = 'center caseres'; res.textContent = a ? '' : D.report; }
}
setInterval(() => { // liczby obrażeń nad wrogiem
  const a = S.dung.active; if (!a || a.phase !== 'run' || a.run.sub !== 'fight' || S.view !== 'fight') return;
  const node = $('#dtrack').children[a.run.node]; if (!node) return;
  const crit = Math.random() < critCh(), f = document.createElement('span'); f.className = 'dmgnum' + (crit ? ' crit' : '');
  f.textContent = Math.round(dps() * rnd(0.2, 0.45) * (crit ? 1.6 : 1)); f.style.left = rnd(-18, 18) + 'px'; node.append(f); setTimeout(() => f.remove(), 900);
}, 320);

function renderDungTable(d) {
  const box = $('#dung-table'); box.replaceChildren(); const i = DUNGEONS.indexOf(d);
  const head = document.createElement('div'); head.className = 'row'; const t = document.createElement('h2'); t.textContent = `${d.icon} ${d.k}`;
  const sk = document.createElement('span'); sk.className = 'muted small'; sk.textContent = `zalecana Siła ${d.rec} · Twój czas przejścia ok. ${fmtSec(dungTime(d))} · cooldown ${fmtSec(d.cd)}`; head.append(t, sk); box.append(head);
  const list = document.createElement('div'); list.className = 'looktable full'; const D = Math.max(1, dps());
  const add = (n, p, c) => { const r = document.createElement('div'); r.className = 'lootrow ' + (c || 'common'); r.textContent = n; const s = document.createElement('small'); s.textContent = p; r.append(s); list.append(r); };
  const sub = n => { const r = document.createElement('div'); r.className = 'skcat'; r.textContent = n; list.append(r); };
  sub('Etapy i walki (wróg ma stałe HP, Ty nie giniesz)');
  add('🪤 Pułapka', 'omijasz (2 s)');
  add(`${MOBS[i][1]} ${MOBS[i][0]} · HP ${enemyHp(d, 'mob')}`, `ok. ${fmtSec(enemyHp(d, 'mob') / D)} przy Twoim DPS ${Math.round(D)}`);
  add(`${ELITES[i][1]} ${ELITES[i][0]} · HP ${enemyHp(d, 'elite')}`, `ok. ${fmtSec(enemyHp(d, 'elite') / D)}`);
  add(`🧰 Skrzynia`, 'otwiera się po drodze', 'rare');
  add(`${BOSSES[i].i} ${BOSSES[i].n} · HP ${enemyHp(d, 'boss')}`, `ok. ${fmtSec(enemyHp(d, 'boss') / D)}`, 'epic');
  sub('Łupy ze skrzyni (2 przedmioty tieru T' + (d.tier + 1) + ', losowy slot' + (lv('Poszukiwacz') ? `, +${lv('Poszukiwacz')}% szansy na 3.` : '') + ')');
  add('Jakość „dobry”', '40%', 'rare'); add('Jakość „wybitny”', '35%', 'rare'); add('Jakość „mistrzowski”', '18%', 'epic'); add('Jakość „legendarny”', '7%', 'legend');
  sub('Nagroda za bossa');
  add('🪙 Złoto', `${Math.round(d.rec * 0.9)} (pewne)`); add('⭐ XP', `${Math.round(xpNeed(d.lvl + 3) * 0.35 * (1 + lv('Nauka') * 0.01))} (pewne)`); add('🪨 Ruda', `${d.tier * 4 + 4} (pewne)`);
  add('💎 Kamień Ochrony', '15%', 'epic'); add('🔮 Kamień Przemiany', '10%', 'epic');
  box.append(list);
}
function renderDung() {
  dayReset(); const D = S.dung, act = D.active, d = DUNGEONS[D.sel];
  const tiles = $('#dung-tiles'); tiles.replaceChildren();
  DUNGEONS.forEach((x, i) => {
    const t = document.createElement('button'); t.className = 'cattile' + (D.sel === i ? ' on' : ''); t.disabled = !!act;
    const ic = document.createElement('i'); ic.textContent = x.icon; const nm = document.createElement('b'); nm.textContent = x.k;
    const sm = document.createElement('small'); sm.textContent = S.lvl >= x.lvl ? `poz. ${x.lvl}+ · Siła ${x.rec}` : `🔒 od poziomu ${x.lvl}`; t.append(ic, nm, sm);
    t.onclick = () => { D.sel = i; render(); }; tiles.append(t);
  });
  const seg = $('#dung-seg'); seg.replaceChildren();
  DURS.forEach((x, di) => { const b = document.createElement('button'); b.className = D.dur === di ? 'on' : ''; b.disabled = !!act; b.textContent = x.n; b.onclick = () => { D.dur = di; render(); }; seg.append(b); });
  const st = $('#b-dstart'), left = DUNG_LIMIT - D.used, lock = S.lvl < d.lvl;
  st.disabled = lock || left < DURS[D.dur].s; st.textContent = lock ? `WYMAGA POZIOMU ${d.lvl}` : left < DURS[D.dur].s ? 'LIMIT DZIENNY' : 'ZACZNIJ';
  st.classList.toggle('hidden', !!act); $('#b-dstop').classList.toggle('hidden', !act);
  renderScene();
  $('#dung-status').textContent = act ? `${DUNGEONS[act.i].icon} ${DUNGEONS[act.i].k} · przejść: ${act.runs} · koniec sesji za ${fmtSec(act.left)}` : 'Wybierz loch i czas, a potem kliknij ZACZNIJ. Postać sama przechodzi loch, bije wrogów (im jest silniejsza, tym szybciej), otwiera skrzynie i odpoczywa przed kolejnym przejściem.';
  $('#dung-limit').textContent = `Limit dzienny: ${fmtSec(D.used)} / ${fmtSec(DUNG_LIMIT)}`; $('#dung-limit-bar').style.width = (100 * D.used / DUNG_LIMIT) + '%';
  const rc = $('#dung-recent'); rc.replaceChildren();
  for (const x of D.recent) { const c = document.createElement('span'); c.className = 'chip ' + (x.q >= 4 ? 'legend' : x.q >= 3 ? 'epic' : x.q >= 2 ? 'rare' : ''); c.textContent = `${x.icon} ${x.k}`; rc.append(c); }
  renderDungTable(d);
}

// ================= ZBIERAJ (wyprawy w tle) =================
const LOCS = [
  { k: 'Sprzątanie miasta', icon: '🧹', skill: 'Zbieractwo', hint: 'skrzynie ze złomem, szmatami i drobnymi znaleziskami. Rzadkie rzeczy odblokowuje umiejętność Zbieractwo' },
  { k: 'Gęsty las', icon: '🌲', skill: 'Łowiectwo', hint: 'skrzynie z drewnem, ziołami, skórami i trofeami. Rzadkie rzeczy odblokowuje umiejętność Łowiectwo' },
  { k: 'Opuszczona kopalnia', icon: '⛏️', skill: 'Górnictwo', hint: 'skrzynie z rudą, szlachetnymi rudami i kryształami. Rzadkie rzeczy odblokowuje umiejętność Górnictwo' },
  { k: 'Złomowisko', icon: '🏭', skill: 'Mechanika', hint: 'skrzynie ze złomem, częściami i mechanizmami. Rzadkie rzeczy odblokowuje umiejętność Mechanika' },
  { k: 'Pasieka i łąki', icon: '🐝', skill: 'Pszczelarstwo', hint: 'skrzynie z miodem, ziołami i woskiem. Rzadkie rzeczy odblokowuje umiejętność Pszczelarstwo' },
  { k: 'Kamienie Wojny', icon: '🪨', skill: 'Dowodzenie', hint: 'skrzynie z chwałą miasta, rudą i kamieniami. Rzadkie rzeczy odblokowuje umiejętność Dowodzenie' },
  { k: 'Jezioro', icon: '🎣', skill: 'Wędkarstwo', hint: 'skrzynie z rybami, muszlami i perłami. Rzadkie rzeczy odblokowuje umiejętność Wędkarstwo' },
];
const DURS = [{ n: '1 h', s: 3600 }, { n: '4 h', s: 14400 }, { n: '8 h', s: 28800 }];
const boxesOf = d => Math.floor(d.s / S.gather.interval); // tempo = długość animacji (ok. 8 s na skrzynię), jedno dla wszystkich
const MAT_SELL = 0.2; // mnożnik cen sprzedaży surowców (demo)
const GATHER_LIMIT = 12 * 3600; // dzienny limit wypraw
const MAT_PRICE = { 'Złom': 2, 'Szmaty': 2, 'Drewno': 3, 'Zioła': 5, 'Skóra': 6, 'Mięso': 4, 'Ryba': 4, 'Perła': 40, 'Części': 8, 'Mechanizm': 60, 'Miód': 6, 'Wosk': 7 };
// ===== Tabele łupów: im rzadszy przedmiot, tym mniejsza szansa. Niektóre mają 0%, dopóki nie wbijesz umiejętności =====
const T = (k, icon, w, o = {}) => ({ k, icon, w, unlock: 0, qty: [1, 1], ...o });
const TABLES = {
  'Sprzątanie miasta': [
    T('Złom', '⚙️', 60, { qty: [1, 3], price: 2 }), T('Szmaty', '🧵', 25, { qty: [1, 3], price: 2 }), T('Drewno', '🪵', 15, { qty: [1, 2], price: 3 }),
    T('Stara moneta', '🪙', 4, { unlock: 8, price: 15 }), T('Zepsuty zegarek', '⌚', 1.5, { unlock: 20, price: 90 }),
    T('Kamień Przemiany', '🔮', 0.6, { unlock: 30 }), T('Złoty sygnet', '💍', 0.3, { unlock: 45, price: 400 }),
  ],
  'Gęsty las': [
    T('Drewno', '🪵', 40, { qty: [1, 3] }), T('Zioła', '🌿', 30, { qty: [1, 2], price: 5 }), T('Skóra', '🟤', 20, { unlock: 2, price: 6 }), T('Mięso', '🍖', 12, { unlock: 5, price: 4 }),
    T('Rzadkie zioło', '☘️', 2, { unlock: 15, price: 30 }), T('Kieł', '🦷', 1, { unlock: 25, price: 70 }),
    T('Kamień Ochrony', '💎', 0.5, { unlock: 35 }), T('Poroże', '🦌', 0.4, { unlock: 40, price: 250 }),
  ],
  'Opuszczona kopalnia': [
    T('Ruda', '🪨', 60, { qty: [1, 3] }), T('Ruda żelaza', '⛓️', 25, { unlock: 8, ore: 3 }), T('Ruda stali', '🔶', 6, { unlock: 20, ore: 8 }),
    T('Kryształ', '🔷', 1.5, { unlock: 28, price: 120 }), T('Kamień Przemiany', '🔮', 0.5, { unlock: 32 }), T('Diament', '💠', 0.3, { unlock: 45, price: 600 }),
  ],
  'Złomowisko': [
    T('Złom', '⚙️', 55, { qty: [1, 3] }), T('Części', '🔩', 30, { unlock: 5, price: 8 }), T('Mechanizm', '🧰', 4, { unlock: 15, price: 60 }),
    T('Silnik', '🛠️', 0.8, { unlock: 30, price: 160 }), T('Rdzeń energetyczny', '🔆', 0.2, { unlock: 48, price: 700 }),
  ],
  'Pasieka i łąki': [
    T('Miód', '🍯', 50, { qty: [1, 3], price: 6 }), T('Zioła', '🌿', 25, { qty: [1, 2] }), T('Wosk', '🕯️', 20, { unlock: 3, price: 7 }),
    T('Mleczko pszczele', '🥛', 3, { unlock: 15, price: 50 }), T('Propolis', '🟠', 0.8, { unlock: 30, price: 150 }), T('Królewski miód', '👑', 0.2, { unlock: 45, price: 600 }),
  ],
  'Kamienie Wojny': [
    T('Chwała +5', '🚩', 70, { glory: 5 }), T('Ruda', '🪨', 20, { qty: [1, 2] }), T('Chwała +20', '🏴', 6, { unlock: 8, glory: 20 }),
    T('Kamień Przemiany', '🔮', 2, { unlock: 15 }), T('Kamień Ochrony', '💎', 1.5, { unlock: 20 }), T('Sztandar', '🎌', 0.3, { unlock: 40, price: 500 }),
  ],
  'Jezioro': [
    T('Ryba', '🐟', 60, { qty: [1, 3], price: 4 }), T('Duża ryba', '🐠', 25, { unlock: 5, price: 9 }), T('Muszla', '🐚', 10, { price: 5 }),
    T('Perła', '🦪', 3, { unlock: 15, price: 40 }), T('Czarna perła', '⚫', 0.4, { unlock: 35, price: 300 }), T('Skarb z dna', '🏺', 0.15, { unlock: 50, price: 800 }),
  ],
};
// rejestracja przedmiotów w plecaku, ikonach i cenach
for (const tbl of Object.values(TABLES)) for (const it of tbl) {
  if (!it.glory && !it.ore) { if (!(it.k in S.bag)) S.bag[it.k] = 0; MAT_ICON[it.k] = it.icon; }
  if (it.price && !(it.k in MAT_PRICE)) MAT_PRICE[it.k] = it.price;
}
// waga rośnie tylko u rzadkich przedmiotów (unlock > 0): +6% wagi bazowej na każdy poziom ponad próg
const effW = (it, lvl) => lvl < it.unlock ? 0 : it.unlock > 0 ? it.w + (lvl - it.unlock) * it.w * 0.06 : it.w;
const lootTotal = (tbl, lvl) => tbl.reduce((a, it) => a + effW(it, lvl), 0);
const fmtPct = p => p === 0 ? '0%' : p < 1 ? p.toFixed(2) + '%' : p.toFixed(1) + '%';
const locOfSkill = k => LOCS.find(l => l.skill === k);
function lootEff(x, L) {
  const loc = locOfSkill(x.k); if (!loc) return null;
  const tbl = TABLES[loc.k], un = tbl.filter(i => i.unlock <= L).length, next = tbl.map(i => i.unlock).filter(u => u > L).sort((a, b) => a - b)[0];
  return `${x.desc} ${loc.k}: odblokowane znaleziska ${un}/${tbl.length}${next ? `, następne od poziomu ${next}` : ' (wszystkie)'}. Wyższy poziom minimalnie zwiększa szansę rzadkich.`;
}
const rarityOf = pct => pct < 1 ? 'legend' : pct < 5 ? 'epic' : pct < 15 ? 'rare' : 'common';

// ===== Sesja skrzyń: co 15 min otwiera się kolejna skrzynia (jak w CS: pasek przewija się i zatrzymuje na przedmiocie) =====
function rollBox(li) {
  const L = LOCS[li], tbl = TABLES[L.k], lvl = lv(L.skill), total = lootTotal(tbl, lvl);
  let r = Math.random() * total, it = null;
  for (const x of tbl) { const w = effW(x, lvl); if (w <= 0) continue; r -= w; if (r <= 0) { it = x; break; } }
  it = it || tbl[0];
  const q = it.qty[0] + Math.floor(Math.random() * (it.qty[1] - it.qty[0] + 1));
  if (it.glory) S.glory += Math.round(it.glory * q * (1 + lv('Dowodzenie') * 0.02));
  else if (it.ore) S.bag['Ruda'] += it.ore * q;
  else S.bag[it.k] += q;
  return { it, q, pct: 100 * effW(it, lvl) / total };
}
function startSession() {
  dayReset(); const g = S.gather, d = DURS[g.dur];
  if (g.active || g.used + d.s > GATHER_LIMIT) return;
  g.used += d.s; g.report = ''; g.got = {};
  g.active = { li: g.loc, left: d.s, total: d.s, boxes: boxesOf(d), done: 0, nextIn: g.interval, xp: 0 };
  openBox(g.active); render();
}
function openBox(a) {
  const r = rollBox(a.li); a.done++; a.nextIn = S.gather.interval;
  offerSpin({ li: a.li, ...r }); S.gather.got[r.it.k] = (S.gather.got[r.it.k] || 0) + r.q;
  const gx = Math.max(1, Math.round(1 + lv('Nauka') * 0.01)); gainXp(gx); a.xp += gx;
  if (r.pct < 1) log(`🎁 Rzadka skrzynia: ${r.it.icon} ${r.it.k} ×${r.q} (szansa ${fmtPct(r.pct)})`, 'crit');
}
function stopSession() {
  const a = S.gather.active; if (!a) return;
  S.gather.used = Math.max(0, S.gather.used - a.left); // niewykorzystany czas wraca do dziennego limitu
  S.gather.active = null;
  S.gather.report = `⏹ Zatrzymano sesję (${LOCS[a.li].k}): otwarto ${a.done} z ${a.boxes} skrzyń · ${Object.entries(S.gather.got).map(([k, v]) => `${k} ×${v}`).join(', ') || 'brak łupów'} · +${a.xp} XP`;
  log(S.gather.report, 'loot'); render();
}
function gatherTick() {
  const a = S.gather.active; if (!a) return;
  a.left--; a.nextIn--;
  if (a.nextIn <= 0 && a.done < a.boxes) openBox(a);
  if (a.left <= 0) {
    S.gather.active = null;
    S.gather.report = `✅ Sesja zakończona (${LOCS[a.li].k}): otwarto ${a.done} skrzyń · ${Object.entries(S.gather.got).map(([k, v]) => `${k} ×${v}`).join(', ')} · +${a.xp} XP`;
    log(S.gather.report, 'loot');
  }
}

// ---- okno losowania jak w CS ----
const spin = { busy: false }, TILE = 112;
function pickWeighted(pool, lvl, total) { let r = Math.random() * total; for (const x of pool) { r -= effW(x, lvl); if (r <= 0) return x; } return pool[0]; }
function tileEl(it, pct) {
  const d = document.createElement('div'); d.className = 'ctile ' + (pct === null ? 'locked' : rarityOf(pct));
  const i = document.createElement('span'); i.className = 'ico'; i.textContent = it.icon;
  const n = document.createElement('small'); n.textContent = it.k; d.append(i, n); return d;
}
function idleStrip(want) {
  const strip = $('#case-strip'), L = LOCS[+want.split(':')[1]], tbl = TABLES[L.k], lvl = lv(L.skill), total = lootTotal(tbl, lvl);
  strip.style.transition = 'none'; strip.style.transform = 'translateX(0)'; strip.replaceChildren();
  for (const it of [...tbl].sort((a, b) => effW(b, lvl) - effW(a, lvl))) strip.append(tileEl(it, effW(it, lvl) > 0 ? 100 * effW(it, lvl) / total : null));
  strip.style.transform = 'translateX(' + (-strip.children.length * TILE / 2) + 'px)';
  strip.dataset.mode = want;
}
function playSpin(r, fast) {
  spin.busy = true;
  const L = LOCS[r.li], tbl = TABLES[L.k], lvl = lv(L.skill), total = lootTotal(tbl, lvl), pool = tbl.filter(x => effW(x, lvl) > 0);
  const strip = $('#case-strip'), view = $('#case-view'), WIN = 38, N = 46;
  strip.style.transition = 'none'; strip.style.transform = 'translateX(0)'; strip.replaceChildren();
  for (let i = 0; i < N; i++) {
    const it = i === WIN ? r.it : pickWeighted(pool, lvl, total);
    const t = tileEl(it, i === WIN ? r.pct : 100 * effW(it, lvl) / total); if (i === WIN) t.id = 'case-win'; strip.append(t);
  }
  $('#case-result').textContent = ''; $('#case-result').className = 'center';
  void strip.offsetWidth;
  const off = WIN * TILE + TILE / 2 + rnd(-TILE * 0.32, TILE * 0.32), dur = 6;
  strip.style.transition = `transform ${dur}s cubic-bezier(.1,.75,.12,1)`; strip.style.transform = `translateX(${-off}px)`;
  strip.dataset.mode = 'spun';
  setTimeout(() => {
    const w = $('#case-win'); if (w) w.classList.add('win');
    const res = $('#case-result'); res.textContent = `${r.it.icon} ${r.it.k} ×${r.q} · szansa ${fmtPct(r.pct)}`; res.className = 'center caseres ' + rarityOf(r.pct);
    S.gather.recent.unshift({ icon: r.it.icon, k: r.it.k, q: r.q, pct: r.pct }); if (S.gather.recent.length > 12) S.gather.recent.pop();
    setTimeout(() => { spin.busy = false; render(); }, 1600);
  }, dur * 1000 + 150);
}
// losowanie widać tylko na żywo (gdy oglądasz zakładkę); w przeciwnym razie przedmiot trafia po cichu do plecaka
function offerSpin(r) {
  if (S.view === 'gather' && !spin.busy) { playSpin(r, false); return; }
  S.gather.recent.unshift({ icon: r.it.icon, k: r.it.k, q: r.q, pct: r.pct }); if (S.gather.recent.length > 12) S.gather.recent.pop();
}

function sellMaterials() {
  let sum = 0; for (const [k, p] of Object.entries(MAT_PRICE)) { sum += (S.bag[k] || 0) * p; S.bag[k] = 0; }
  S.gold += Math.round(sum * MAT_SELL * (1 + lv('Handel') * 0.01)); render();
}
function renderGather() {
  dayReset(); const G = S.gather, act = G.active;
  // kafelki lokacji
  const tiles = $('#loc-tiles'); tiles.replaceChildren();
  LOCS.forEach((L, li) => {
    const t = document.createElement('button'); t.className = 'cattile' + (G.loc === li ? ' on' : ''); t.disabled = !!act;
    const ic = document.createElement('i'); ic.textContent = L.icon; const nm = document.createElement('b'); nm.textContent = L.k;
    const sm = document.createElement('small'); sm.textContent = `${L.skill} ${lv(L.skill)}`; t.append(ic, nm, sm);
    t.onclick = () => { G.loc = li; render(); }; tiles.append(t);
  });
  // wybór czasu (obok przycisku ZACZNIJ)
  const seg = $('#dur-seg'); seg.replaceChildren();
  DURS.forEach((d, di) => {
    const b = document.createElement('button'); b.className = G.dur === di ? 'on' : ''; b.disabled = !!act;
    b.textContent = `${d.n} · ${boxesOf(d)} skrzyń`; b.onclick = () => { G.dur = di; render(); }; seg.append(b);
  });
  const st = $('#b-start'), left = GATHER_LIMIT - G.used;
  st.disabled = left < DURS[G.dur].s; st.textContent = left < DURS[G.dur].s ? 'LIMIT DZIENNY' : 'ZACZNIJ';
  st.classList.toggle('hidden', !!act); $('#b-stop').classList.toggle('hidden', !act);
  // okno losowania
  const strip = $('#case-strip'), want = act ? 'run:' + act.li + ':' + lv(LOCS[act.li].skill) : 'idle:' + G.loc + ':' + lv(LOCS[G.loc].skill);
  if (!spin.busy && !G.queue.length && strip.dataset.mode !== want && !(strip.dataset.mode || '').startsWith('spun')) idleStrip(want);
  const status = $('#case-status');
  if (act) status.textContent = `${LOCS[act.li].icon} ${LOCS[act.li].k} · otwarto ${act.done}/${act.boxes} · koniec za ${fmtSec(act.left)}`;
  else status.textContent = G.report || 'Wybierz lokację i czas, a potem kliknij ZACZNIJ. Skrzynie otwierają się same, jedna po drugiej, a sesję możesz zatrzymać w dowolnej chwili.';
  $('#gather-limit').textContent = `Limit dzienny: ${fmtSec(G.used)} / ${fmtSec(GATHER_LIMIT)}`;
  $('#gather-limit-bar').style.width = (100 * G.used / GATHER_LIMIT) + '%';
  const worth = Object.entries(MAT_PRICE).reduce((a, [k, p]) => a + (S.bag[k] || 0) * p, 0);
  $('#b-sellmat').textContent = `Sprzedaj surowce (${Math.round(worth * MAT_SELL * (1 + lv('Handel') * 0.01))} 🪙)`; $('#b-sellmat').disabled = worth <= 0;
  const rc = $('#case-recent'); rc.replaceChildren();
  for (const x of G.recent) { const c = document.createElement('span'); c.className = 'chip ' + rarityOf(x.pct); c.textContent = `${x.icon} ${x.k} ×${x.q}`; c.title = 'szansa ' + fmtPct(x.pct); rc.append(c); }

  // szanse na drop dla zaznaczonej lokacji
  const L = LOCS[G.loc], tbl = TABLES[L.k], lvl = lv(L.skill), total = lootTotal(tbl, lvl);
  const box = $('#gather-list'); box.replaceChildren();
  const head = document.createElement('div'); head.className = 'row';
  const t = document.createElement('h2'); t.textContent = `${L.icon} ${L.k}: szanse na drop`;
  const sk = document.createElement('span'); sk.className = 'muted small'; sk.textContent = `Umiejętność: ${L.skill} (poziom ${lvl})`; head.append(t, sk);
  const hint = document.createElement('p'); hint.className = 'muted small'; hint.textContent = lootEff(SKILLS.find(x => x.k === L.skill), lvl) || '';
  const list = document.createElement('div'); list.className = 'looktable full';
  for (const it of [...tbl].sort((a, b) => effW(b, lvl) - effW(a, lvl) || a.unlock - b.unlock)) {
    const w = effW(it, lvl), pct = 100 * w / total, row = document.createElement('div');
    row.className = 'lootrow ' + (w > 0 ? rarityOf(pct) : 'locked');
    row.textContent = `${it.icon} ${it.k}${it.qty[1] > 1 ? ` (${it.qty[0]}–${it.qty[1]})` : ''}`;
    const p = document.createElement('small'); p.textContent = w > 0 ? fmtPct(pct) : `🔒 0% · od poziomu ${it.unlock}`; row.append(p); list.append(row);
  }
  box.append(head, hint, list);
}
function timersTick() { trainTick(); dungeonTick(); gatherTick(); expTick(); }

// ================= EXP: mapa z potworami i Kamieniem Wojny (metin) =================
// Wróg ma stałe HP, postać sama zadaje obrażenia równe swojemu DPS. Czas zabicia = t sekund przy zalecanej Sile mapy; mocniejszy gracz zabija szybciej.
const EXP_MAPS = [{
  k: 'Puszcza Zielonka', icon: '🌲', rec: 150,
  mobs: [
    { k: 'Wilk', icon: '🐺', w: 50, t: 6, xp: 10, gold: 3, drops: [{ k: 'Skóra', p: 0.20, q: [1, 2] }] },
    { k: 'Dzik', icon: '🐗', w: 30, t: 10, xp: 18, gold: 5, drops: [{ k: 'Mięso', p: 0.22, q: [1, 2] }, { k: 'Skóra', p: 0.06, q: [1, 1] }, { item: true, p: 0.01 }] },
    { k: 'Niedźwiedź', icon: '🐻', w: 12, t: 16, xp: 34, gold: 9, drops: [{ k: 'Skóra', p: 0.30, q: [2, 3] }, { item: true, p: 0.04 }] },
    { k: 'Kamień Wojny', icon: '🪨', w: 8, t: 60, xp: 150, gold: 60, metin: true, drops: [{ glory: 15, p: 1 }, { k: 'Ruda', p: 1, q: [3, 6] }, { item: true, p: 1, boost: true }, { k: 'Kamień Przemiany', p: 0.15, q: [1, 1] }, { k: 'Kamień Ochrony', p: 0.10, q: [1, 1] }] },
  ],
}];
const expHp = (m, mob) => Math.round(m.rec / 2.2 * mob.t);
function expItem(boost) {
  const r = Math.random() * 100, q = boost ? (r < 40 ? 1 : r < 75 ? 2 : r < 93 ? 3 : 4) : (r < 70 ? 0 : r < 92 ? 1 : r < 99 ? 2 : 3), tier = boost && Math.random() < 0.5 ? 1 : 0;
  const it = mk(pick(SLOTS).k, tier, q);
  if (S.inv.length < INV_SIZE) { S.inv.push(it); return { it, sold: 0 }; }
  const g = sellPrice(it); S.gold += g; return { it, sold: g };
}
function expSpawn(X) {
  const m = EXP_MAPS[X.map], tw = m.mobs.reduce((a, x) => a + x.w, 0); let r = Math.random() * tw, mob = m.mobs[0];
  for (const x of m.mobs) { r -= x.w; if (r <= 0) { mob = x; break; } }
  const hp = expHp(m, mob); X.enemy = { mob, hp, max: hp, dead: false }; X.wait = 0;
  if (mob.metin) log('🪨 Pojawił się Kamień Wojny!', 'loot');
}
function expReward(X, e) {
  const mob = e.mob, xp = Math.round(mob.xp * (1 + lv('Nauka') * 0.01)), gold = mob.gold;
  S.gold += gold; gainXp(xp); X.kills++; if (mob.metin) X.metins++;
  const cards = [{ text: `+${xp} XP` }, { text: `🪙 +${gold}` }];
  for (const d of mob.drops) {
    if (Math.random() > d.p) continue;
    if (d.glory) { const g = Math.round(d.glory * (1 + lv('Dowodzenie') * 0.02)); S.glory += g; cards.push({ text: `🚩 +${g} chwały miasta`, cls: 'epic' }); }
    else if (d.item) {
      const { it, sold } = expItem(d.boost); X.recent.unshift({ icon: it.icon, k: it.name, q: it.q }); if (X.recent.length > 12) X.recent.pop();
      cards.push({ text: `${it.icon} ${it.name} (${QUAL[it.q].n})${sold ? ' → sprzedano' : ''}`, cls: it.q >= 4 ? 'legend' : it.q >= 3 ? 'epic' : it.q >= 2 ? 'rare' : '' });
      if (it.q >= 3) log(`⚔️ Drop z ${mob.k}: ${it.icon} ${it.name} (${QUAL[it.q].n})`, 'crit');
    } else {
      const q = d.q[0] + Math.floor(Math.random() * (d.q[1] - d.q[0] + 1)); S.bag[d.k] = (S.bag[d.k] || 0) + q;
      cards.push({ text: `${MAT_ICON[d.k] || '📦'} ${d.k} ×${q}`, cls: d.k.startsWith('Kamień') ? 'epic' : '' });
    }
  }
  return cards;
}
function expTick() {
  const X = S.exp; if (!X.on) return;
  if (!X.enemy) { if (X.wait > 0) { X.wait--; return; } expSpawn(X); expSync(true); }
  const e = X.enemy;
  if (e.dead) { X.enemy = null; X.wait = 0; return; }
  const dmg = Math.max(1, Math.round(dps() * rnd(0.8, 1.2))); e.hp -= dmg; X.dmg += dmg;
  expFx(dmg);
  if (e.hp <= 0) { e.hp = 0; e.dead = true; const cards = expReward(X, e); expSync(false); expKillFx(); expPop(cards); }
  else expSync(false);
}
// ---- widok ----
const visibleExp = () => S.view === 'fight' && S.sub === 'exp' && S.speed <= 1;
function expSync(spawned) {
  const en = $('#xp-enemy'); if (!en) return;
  const X = S.exp, e = X.enemy, pan = $('#xp-panel');
  if (!e) { en.classList.add('gone'); en.classList.remove('dead'); pan.classList.add('hidden'); return; }
  en.textContent = e.mob.icon; en.classList.remove('gone');
  en.classList.toggle('metin', !!e.mob.metin); en.classList.toggle('dead', !!e.dead);
  $('#xp-shadow').classList.toggle('metin', !!e.mob.metin); $('#xp-win').classList.toggle('metinwin', !!e.mob.metin && !e.dead);
  if (spawned) { en.classList.remove('spawn'); void en.offsetWidth; en.classList.add('spawn'); }
  pan.classList.remove('hidden'); pan.classList.toggle('metin', !!e.mob.metin);
  $('#xp-name').textContent = (e.mob.metin ? '⚠ ' : '') + e.mob.k; $('#xe-bar').style.width = (100 * e.hp / e.max) + '%';
  $('#xp-txt').textContent = e.dead ? 'POKONANY!' : `${Math.round(e.hp)} / ${e.max} HP · ok. ${fmtSec(e.hp / Math.max(1, dps()))}`;
}
// efekty ciosów zależne od broni (bez widocznej postaci): cięcie, pchnięcie, strzała, uderzenie młotem, podwójne dźgnięcie
function fxEl(cls, css, ms = 700, text = '') {
  const el = document.createElement('div'); el.className = 'fx ' + cls; if (text) el.textContent = text;
  for (const [k, v] of Object.entries(css || {})) k.startsWith('--') ? el.style.setProperty(k, v) : (el.style[k] = v);
  $('#xp-field').append(el); setTimeout(() => el.remove(), ms); return el;
}
function expFx(dmg) {
  if (!visibleExp()) return;
  const win = $('#xp-win'), en = $('#xp-enemy'); if (!win || !en) return;
  const X = S.exp; X.t = (X.t || 0) + 1;
  const base = S.eq.weapon ? S.eq.weapon.base : 'Miecz', crit = Math.random() < critCh();
  const cx = 50 + rnd(-5, 5), cy = 52 + rnd(-8, 8), pos = { left: cx + '%', top: cy + '%' }, col = crit ? '#ffd24d' : '#ffffff';
  const slash = (rot, delay = 0, w = 320) => setTimeout(() => fxEl('slash' + (crit ? ' crit' : ''), { ...pos, '--rot': rot + 'deg', '--w': w + 'px' }, 450), delay);
  if (base === 'Włócznia') fxEl('thrust' + (crit ? ' crit' : ''), { top: cy + '%', left: '0' }, 450);
  else if (base === 'Łuk') { const a = fxEl('arrow', { top: (cy + rnd(-6, 6)) + '%', '--tx': cx + '%' }, 420, '➤'); }
  else if (base === 'Młot bojowy') { fxEl('shock', { ...pos }, 700); win.classList.remove('shake'); void win.offsetWidth; win.classList.add('shake'); }
  else if (base === 'Sztylet') { slash(rnd(-70, -30), 0, 200); slash(rnd(30, 70), 110, 200); }
  else if (base === 'Topór') slash(rnd(-80, -50), 0, 380);
  else slash(rnd(-55, 55), 0, 320); // miecz, szabla i reszta
  if (crit) slash(rnd(60, 110), 90, 360);
  setTimeout(() => {
    en.classList.remove('hitx'); void en.offsetWidth; en.classList.add('hitx');
    fxEl('impact' + (crit ? ' crit' : ''), pos, 600);
    for (let k = 0; k < (crit ? 12 : 6); k++) { const a = rnd(0, Math.PI * 2), d = rnd(60, crit ? 170 : 110); fxEl('spark', { ...pos, '--dx': Math.cos(a) * d + 'px', '--dy': Math.sin(a) * d + 'px', background: col }, 550); }
    fxEl('xnum' + (crit ? ' crit' : ''), { left: (cx + rnd(-14, 14)) + '%', top: (cy - 18) + '%' }, 1000, (crit ? 'KRYT! ' : '') + '−' + dmg);
    if (crit) { const f = $('#xp-flash'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go'); win.classList.remove('shake'); void win.offsetWidth; win.classList.add('shake'); }
  }, base === 'Łuk' ? 230 : 120);
  if (X.t % 5 === 0) { fxEl('whirl', { left: '50%', top: '52%' }, 900, '🌀'); fxEl('skilltxt', { left: '50%', top: '22%' }, 1100, '🌀 Cios Wirujący'); }
  if (X.t % 10 === 0) { const f = $('#xp-flash'); f.classList.add('red'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go'); setTimeout(() => f.classList.remove('red'), 600); fxEl('skilltxt furia', { left: '50%', top: '30%' }, 1200, '🔥 FURIA!'); win.classList.remove('shake'); void win.offsetWidth; win.classList.add('shake'); }
}
function expKillFx() {
  if (!visibleExp()) return;
  const em = ['✨', '💥', '⭐', '✦', '💫'];
  for (let k = 0; k < 22; k++) { const a = rnd(0, Math.PI * 2), d = rnd(90, 260); fxEl('burst', { left: '50%', top: '52%', '--dx': Math.cos(a) * d + 'px', '--dy': Math.sin(a) * d + 'px', '--rs': rnd(-200, 200) + 'deg' }, 1000, pick(em)); }
  fxEl('boom', { left: '50%', top: '52%' }, 700);
  const f = $('#xp-flash'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
}
let xpPopT = null;
function expPop(cards) {
  if (!visibleExp()) return;
  const box = $('#xp-loot'); box.replaceChildren();
  cards.forEach((c, k) => { const e = document.createElement('div'); e.className = 'lcard ' + (c.cls || ''); e.textContent = c.text; e.style.animationDelay = (k * 0.12) + 's'; box.append(e); });
  clearTimeout(xpPopT); xpPopT = setTimeout(() => box.replaceChildren(), 2600);
}
function expInitBg() { // świetliki w tle mapy
  const p = $('#xp-parts'); if (!p || p.children.length) return;
  for (let k = 0; k < 22; k++) { const f = document.createElement('i'); f.style.left = rnd(2, 98) + '%'; f.style.top = rnd(10, 90) + '%'; f.style.animationDelay = rnd(0, 6) + 's'; f.style.animationDuration = rnd(5, 10) + 's'; p.append(f); }
}

function renderExp() {
  const X = S.exp, m = EXP_MAPS[X.map];
  const tiles = $('#exp-maps'); tiles.replaceChildren();
  [[m.icon, m.k, `zalecana Siła ${m.rec}`, true], ['🏜️', 'Pustynia Piasków', '🔒 wkrótce', false], ['🏔️', 'Góry Mgieł', '🔒 wkrótce', false]].forEach(([ic, n, sm, on]) => {
    const t = document.createElement('button'); t.className = 'cattile' + (on ? ' on' : ''); t.disabled = !on;
    const i = document.createElement('i'); i.textContent = ic; const b = document.createElement('b'); b.textContent = n; const s2 = document.createElement('small'); s2.textContent = sm; t.append(i, b, s2); tiles.append(t);
  });
  const btn = $('#b-expon'); btn.textContent = X.on ? '⏸ Wstrzymaj expienie' : '▶ Wznów expienie';
  const tw = m.mobs.reduce((a, x) => a + x.w, 0), D = Math.max(1, dps());
  const avgKill = m.mobs.reduce((a, x) => a + x.w * expHp(m, x) / D, 0) / tw + 1, avgXp = m.mobs.reduce((a, x) => a + x.w * x.xp, 0) / tw;
  $('#exp-status').textContent = `Zabitych: ${X.kills} · Kamieni Wojny: ${X.metins} · ok. ${Math.round(60 * avgXp * (1 + lv('Nauka') * 0.01) / avgKill)} XP/min przy Twojej Sile ${power()}`;
  expSync(false);
  if (!X.enemy && $('#xp-enemy')) $('#xp-enemy').classList.add('gone');
  const rc = $('#exp-recent'); rc.replaceChildren();
  for (const x of X.recent) { const c = document.createElement('span'); c.className = 'chip ' + (x.q >= 4 ? 'legend' : x.q >= 3 ? 'epic' : x.q >= 2 ? 'rare' : ''); c.textContent = `${x.icon} ${x.k}`; rc.append(c); }
  const box = $('#exp-table'); box.replaceChildren();
  const head = document.createElement('div'); head.className = 'row'; const h2 = document.createElement('h2'); h2.textContent = `${m.icon} ${m.k}: potwory i szanse`;
  const sk = document.createElement('span'); sk.className = 'muted small'; sk.textContent = `Twój DPS ${Math.round(D)}`; head.append(h2, sk); box.append(head);
  const list = document.createElement('div'); list.className = 'looktable full';
  for (const x of m.mobs) {
    const r = document.createElement('div'); r.className = 'lootrow ' + (x.metin ? 'epic' : 'common'); r.textContent = `${x.icon} ${x.k} · HP ${expHp(m, x)} · ok. ${fmtSec(expHp(m, x) / D)} · +${x.xp} XP, +${x.gold} 🪙`;
    const p = document.createElement('small'); p.textContent = `${Math.round(100 * x.w / tw)}% spawnu`; r.append(p); list.append(r);
    for (const d of x.drops) {
      const dr = document.createElement('div'); dr.className = 'lootrow sub'; const nm = d.glory ? `🚩 chwała miasta +${d.glory}` : d.item ? `⚔️ przedmiot${d.boost ? ' (min. dobry, T1–T2)' : ' (T1)'}` : `${MAT_ICON[d.k] || '📦'} ${d.k}${d.q && d.q[1] > 1 ? ` ×${d.q[0]}–${d.q[1]}` : ''}`;
      dr.textContent = '   ↳ ' + nm; const p2 = document.createElement('small'); p2.textContent = d.p >= 1 ? 'pewne' : (d.p * 100).toFixed(d.p < 0.1 ? 0 : 0) + '% przy zabiciu'; dr.append(p2); list.append(dr);
    }
  }
  box.append(list);
}

function kv(box, rows) {
  box.replaceChildren();
  for (const [a, b] of rows) { const d = document.createElement('div'); const x = document.createElement('span'); x.textContent = a; const y = document.createElement('b'); y.textContent = b; d.append(x, y); box.append(d); }
}
function renderChar() {
  $('#c-name').textContent = 'Gracz';
  $('#c-sub').textContent = `Poziom ${S.lvl} · Poznań (wielkopolskie) · XP ${S.xp} / ${xpNeed(S.lvl)}`;
  const noGear = powerWith({}), full = power(), gearPct = full ? Math.round(100 * (full - noGear) / full) : 0;
  const t = tot();
  kv($('#char-derived'), [
    ['💪 SIŁA (łącznie)', full], ['🧰 z czego sprzęt', `${full - noGear} (${gearPct}%)`], ['🧍 z postaci i umiejętności', noGear],
    ['⚔️ Obrażenia (ATK)', Math.round(atkTotal())], ['⚡ Szybkość ataku', '+' + ((spdMult() - 1) * 100).toFixed(1) + '%'],
    ['🎯 Szansa krytyka', (critCh() * 100).toFixed(1) + '%'], ['💥 Mnożnik krytyka', '×' + critMult().toFixed(2)],
    ['🏃 Obrażenia na sekundę', Math.round(dps())],
    ['⏱ Czas pierwszego lochu', fmtSec(dungTime(DUNGEONS[0]))],
['🪙 Złoto', S.gold],
  ]);
  const rows = SKILLS.filter(x => lv(x.k) > 0).map(x => [`${x.icon} ${x.k} (${lv(x.k)})`, `+${+(lv(x.k) * x.per).toFixed(1)}${x.unit}`]);
  kv($('#char-bonuses'), rows.length ? rows : [['Brak', 'Wytrenuj umiejętności w zakładce ✨']]);
}
const fmtSec = t => { t = Math.max(0, Math.round(t)); const h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60); return (h ? h + 'h ' : '') + (m || h ? String(m).padStart(2, '0') + 'm ' : '') + String(t % 60).padStart(2, '0') + 's'; };
function renderSkills() {
  const act = $('#sk-active'); act.replaceChildren();
  if (S.train) {
    const sk = SKILLS.find(x => x.k === S.train.k);
    const p = document.createElement('p'); p.textContent = `${sk.icon} Trenujesz: ${sk.k} → poziom ${lv(sk.k) + 1} · pozostało ${fmtSec(S.train.left)}`;
    const bar = document.createElement('div'); bar.className = 'bar'; const inner = document.createElement('div'); inner.style.width = (100 * (1 - S.train.left / S.train.total)) + '%'; bar.append(inner);
    act.append(p, bar);
  } else { const p = document.createElement('p'); p.className = 'muted'; p.textContent = 'Brak aktywnego treningu. Wybierz umiejętność poniżej.'; act.append(p); }
  $('#auto-train').checked = S.autoTrain;

  const CAT_ICON = { 'Mistrzostwo broni': '⚔️', 'Pancerze i obrona': '🛡️', 'Walka': '🎯', 'Umiejętności czynne': '🌀', 'Rozwój': '📖', 'Rzemiosło i zbieractwo': '⛏️', 'Dowodzenie miastem': '🚩' };
  const tiles = $('#sk-tiles'); tiles.replaceChildren();
  for (const cat of CATS) {
    const list = SKILLS.filter(y => y.cat === cat), sum = list.reduce((a, y) => a + lv(y.k), 0);
    const t = document.createElement('button'); t.className = 'cattile' + (S.skOpen === cat ? ' on' : '');
    const ic = document.createElement('i'); ic.textContent = CAT_ICON[cat] || '✨';
    const nm = document.createElement('b'); nm.textContent = cat + (S.train && list.some(y => y.k === S.train.k) ? ' ⏳' : '');
    const sm = document.createElement('small'); sm.textContent = `${list.length} umiejętności · suma poziomów ${sum}`;
    t.append(ic, nm, sm); t.onclick = () => { S.skOpen = S.skOpen === cat ? null : cat; render(); }; tiles.append(t);
  }
  const box = $('#sk-list'); box.replaceChildren();
  if (!S.skOpen) { const p = document.createElement('p'); p.className = 'muted'; p.textContent = 'Kliknij kafelek kategorii, aby rozwinąć umiejętności.'; box.append(p); }
  for (const cat of CATS.filter(c => c === S.skOpen)) {
    const h = document.createElement('div'); h.className = 'skcat'; h.textContent = cat; box.append(h);
    const grid = document.createElement('div'); grid.className = 'skgrid';
    for (const x of SKILLS.filter(y => y.cat === cat)) {
      const L = lv(x.k), cap = skillCap();
      const c = document.createElement('div'); c.className = 'skcard' + (S.train && S.train.k === x.k ? ' on' : '');
      const head = document.createElement('div'); head.className = 'skhead';
      const ic = document.createElement('i'); ic.textContent = x.icon;
      const nm = document.createElement('div'); const b = document.createElement('b'); b.textContent = x.k; const sm = document.createElement('small'); sm.className = 'muted'; sm.textContent = `Poziom ${L} / ${cap}`; nm.append(b, sm);
      head.append(ic, nm);
      const bar = document.createElement('div'); bar.className = 'bar'; const inner = document.createElement('div'); inner.style.width = (100 * L / 50) + '%'; bar.append(inner);
      const eff = document.createElement('small'); eff.className = 'muted';
      eff.textContent = lootEff(x, L) || `${x.desc} Teraz: +${+(L * x.per).toFixed(1)}${x.unit} → następny: +${+((L + 1) * x.per).toFixed(1)}${x.unit}`;
      const btn = document.createElement('button');
      if (L >= cap) { btn.textContent = L >= 50 ? 'Maksimum' : `Wymaga poziomu postaci ${L + 1}`; btn.disabled = true; }
      else { btn.textContent = `Trenuj · ${trainCost(x.k)} 🪙 · ${fmtSec(trainSecs(x.k))}`; btn.disabled = !!S.train || S.gold < trainCost(x.k); }
      btn.onclick = () => { if (startTrain(x.k)) render(); };
      const pb = document.createElement('button'); pb.className = 'ptbtn'; pb.textContent = '+1 pkt umiejętności (natychmiast)';
      pb.disabled = S.points < 1 || L >= cap; pb.onclick = () => { if (S.points >= 1 && lv(x.k) < skillCap()) { S.points--; S.sk[x.k] = lv(x.k) + 1; render(); } };
      c.append(head, bar, eff, pb, btn); grid.append(c);
    }
    box.append(grid);
  }
}
function nextSunday19() {
  const now = new Date(), t = new Date(now); t.setHours(19, 0, 0, 0);
  t.setDate(t.getDate() + ((7 - t.getDay()) % 7)); if (t <= now) t.setDate(t.getDate() + 7); return t;
}
// ================= WOJNA MIAST: symulacja 100 vs 100 =================
// Zasada (jak w prawdziwej grze): serwer liczy bitwę RAZ z jednym ziarnem i wysyła zwartą listę zdarzeń (kto, kiedy, ile obrażeń).
// Każdy klient odtwarza tę samą powtórkę lokalnie na jednym płótnie (canvas), więc 200 graczy nie obciąża sieci ani przeglądarki.
const WAR_N = 100, WAR_W = 1000, WAR_H = 420, WAR_GROUND = 372, WAR_PREP = 6.2; // WAR_PREP: wejście armii + odliczanie
const WAR_OPP = ['Warszawa', 'Kraków', 'Wrocław', 'Gdańsk', 'Łódź', 'Lublin'];
const fmtNum = n => Math.round(n).toLocaleString('pl-PL');
const tokenPos = (side, i) => { const c = i % 10, r = Math.floor(i / 10), x = 215 + c * 17 + (r % 2) * 6; return { x: side === 0 ? x : WAR_W - x, y: WAR_GROUND - 14 - r * 21, s: 1 - r * 0.03 }; };

function genWar() {
  const myD = dps(), used = new Set(), opp = S.war.opp;
  const nm = () => { let n; do { n = pick(NICKS) + (Math.random() < 0.5 ? '_' + Math.floor(rnd(1, 999)) : Math.floor(rnd(1, 99))); } while (used.has(n)); used.add(n); return n; };
  const mkTeam = isMine => { const t = []; for (let i = 0; i < WAR_N; i++) t.push({ name: nm(), dps: myD * Math.max(0.35, Math.min(3, Math.exp(rnd(-0.9, 0.9)))) }); if (isMine) t[Math.floor(rnd(0, WAR_N))] = { name: 'Ty', dps: myD, me: true }; return t; };
  const teams = [mkTeam(true), mkTeam(false)];
  const tot = t => t.reduce((a, p) => a + p.dps, 0), k = tot(teams[0]) * rnd(0.88, 1.18) / tot(teams[1]);
  teams[1].forEach(p => p.dps *= k);
  const totA = tot(teams[0]), totB = tot(teams[1]), H = (totA + totB) / 2 * 52;
  const evs = [];
  teams.forEach((team, side) => team.forEach((p, i) => {
    const ip = rnd(1.5, 3.2); let t = rnd(0, ip);
    while (t < 100) { const crit = Math.random() < 0.12, dmg = p.dps * ip * rnd(0.7, 1.3) * (crit ? 1.8 : 1), fl = rnd(0.55, 0.85); evs.push({ ts: t, arr: t + fl, fl, side, i, dmg, crit, arc: rnd(60, 150), dy: rnd(-34, 34) }); t += ip * rnd(0.9, 1.1); }
  }));
  const byArr = [...evs].sort((a, b) => a.arr - b.arr), dealt = [0, 0]; let endT = 100, winner = totA >= totB ? 0 : 1;
  for (const e of byArr) { dealt[e.side] += e.dmg; if (dealt[e.side] >= H) { endT = e.arr; winner = e.side; break; } }
  const totals = [new Array(WAR_N).fill(0), new Array(WAR_N).fill(0)];
  for (const e of byArr) { if (e.arr > endT) break; totals[e.side][e.i] += e.dmg; }
  evs.sort((a, b) => a.ts - b.ts);
  return { teams, evs, H, endT, winner, totals, opp, totA, totB };
}
function warRewards(war) {
  const meIdx = war.teams[0].findIndex(p => p.me), my = war.totals[0][meIdx];
  const rank = 1 + war.totals[0].filter(v => v > my).length, win = war.winner === 0, bonus = Math.max(0, 101 - rank);
  return { win, my, rank, gold: (win ? 300 : 100) + bonus * 2, xp: (win ? 120 : 50) + bonus, glory: win ? 40 : 10, share: my / war.totals[0].reduce((a, b) => a + b, 0) };
}

function runWar() {
  const W = S.war; if (W.running) return; W.running = true;
  const war = genWar(), light = (navigator.hardwareConcurrency || 4) <= 2 || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const root = $('#war-stage'); root.className = 'overlay';
  root.innerHTML = `<div class="modal warmodal">
    <div class="wartop">
      <div class="wteam"><b>Poznań</b><div class="bar whp"><div id="wb-a"></div></div><small id="wt-a" class="muted"></small></div>
      <div class="wmid"><div class="wtitle">⚔ WOJNA MIAST ⚔</div><div id="w-timer" class="wtimer">0:00</div></div>
      <div class="wteam r"><b id="w-oppname"></b><div class="bar whp foe"><div id="wb-b"></div></div><small id="wt-b" class="muted"></small></div>
    </div>
    <div class="warstage"><canvas id="war-cv" width="${WAR_W}" height="${WAR_H}"></canvas><div id="w-banner" class="wbanner"></div><div id="w-feed" class="wfeed"></div></div>
    <div id="w-board" class="wboard"></div>
    <div id="w-result" class="wresult"></div>
    <div class="acts center"><button id="w-skip">Pomiń ▶▶</button></div>
  </div>`;
  $('#w-oppname').textContent = war.opp;
  const cv = $('#war-cv'), ctx = cv.getContext('2d'), banner = $('#w-banner');
  const projs = [], parts = [], floats = [], hit = [new Array(WAR_N).fill(-9), new Array(WAR_N).fill(-9)];
  const hpLost = [0, 0], dealt = [new Array(WAR_N).fill(0), new Array(WAR_N).fill(0)];
  const said = {};
  let clock = 0, spawn = 0, shake = 0, finale = -1, scale = 1, last = performance.now(), boardT = 0, feedT = 0, raf = 0, done = false, resultShown = false, fireT = 0;
  const say = (t, cls = '') => { banner.className = 'wbanner'; void banner.offsetWidth; banner.textContent = t; banner.className = 'wbanner show ' + cls; };
  const feed = (t, cls) => { const f = $('#w-feed'); if (!f) return; const d = document.createElement('div'); d.className = cls || ''; d.textContent = t; f.prepend(d); while (f.children.length > 4) f.lastChild.remove(); };
  const puff = (x, y, n, col, sp = 160) => { for (let k = 0; k < (light ? Math.ceil(n / 2) : n); k++) { const a = rnd(0, Math.PI * 2), v = rnd(30, sp); parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, life: rnd(0.4, 0.9), max: 0.9, col, r: rnd(1.5, 3.5) }); } };
  const castleX = s => s === 0 ? 92 : WAR_W - 92, impactPt = (s, dy) => ({ x: castleX(s) + (s === 0 ? 10 : -10), y: WAR_GROUND - 90 + dy });

  function impact(e) { // pocisk dotarł do zamku przeciwnika
    const tgt = 1 - e.side; hpLost[tgt] += e.dmg; dealt[e.side][e.i] += e.dmg;
    const ip = impactPt(tgt, e.dy); puff(ip.x, ip.y, e.crit ? 14 : 5, e.crit ? '#ffd24d' : e.side === 0 ? '#9cc8ff' : '#ff9a9a');
    shake = Math.min(14, shake + (e.crit ? 5 : 1.1));
    if (e.crit && floats.length < 14) floats.push({ x: ip.x, y: ip.y - 20, t: '−' + fmtNum(e.dmg), life: 1.1, col: '#ffd24d', size: 22 });
    if (e.crit && e.dmg > 0 && performance.now() - feedT > 450) { feedT = performance.now(); const p = war.teams[e.side][e.i]; feed(`💥 ${p.name}${p.me ? ' (TY!)' : ''}: KRYTYK ${fmtNum(e.dmg)}`, p.me ? 'me' : e.side === 0 ? 'a' : 'b'); }
  }
  function drawCastle(s, pct, falling) {
    const x = castleX(s); ctx.save(); ctx.translate(x, WAR_GROUND + 6); if (s === 1) ctx.scale(-1, 1);
    if (falling >= 0) { ctx.globalAlpha = Math.max(0, 1 - falling / 1.6); ctx.rotate(falling * 0.5 * (s === 0 ? -1 : 1)); ctx.translate(0, falling * 40); }
    ctx.font = '170px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText('🏰', 0, 0);
    ctx.restore();
    if (falling < 0 && pct < 0.65) { ctx.font = '38px "Segoe UI Emoji","Apple Color Emoji",serif'; ctx.textAlign = 'center'; const fl = 1 + Math.sin(performance.now() / 90 + s) * 0.12; ctx.save(); ctx.translate(x - 20, WAR_GROUND - 120); ctx.scale(fl, fl); ctx.fillText('🔥', 0, 0); ctx.restore(); if (pct < 0.35) { ctx.save(); ctx.translate(x + 26, WAR_GROUND - 70); ctx.scale(fl, fl); ctx.fillText('🔥', 0, 0); ctx.restore(); } }
  }
  function frame(now) {
    const dt = Math.min(0.25, (now - last) / 1000); last = now; clock += dt * scale;
    const tb = clock - WAR_PREP;
    // --- logika ---
    if (tb >= 0 && finale < 0) {
      while (spawn < war.evs.length && war.evs[spawn].ts <= tb) { const e = war.evs[spawn++]; projs.push({ e, u: 0 }); hit[e.side][e.i] = clock; }
      if (tb >= war.endT) { finale = clock; scale = 0.35; const lose = 1 - war.winner, p = impactPt(lose, 0); puff(p.x, p.y, 60, '#ffb340', 320); puff(p.x, p.y, 40, '#ff5a2a', 240); shake = 20; say(war.winner === 0 ? 'POZNAŃ WYGRYWA!' : war.opp.toUpperCase() + ' WYGRYWA!', war.winner === 0 ? 'ok' : 'bad'); }
    }
    if (finale >= 0 && clock - finale > 1.0) scale = 1;
    if (!said.start) { said.start = 1; say('ARMIE WYCHODZĄ NA POLE…'); }
    [[3.2, '3'], [4.2, '2'], [5.2, '1']].forEach(([t, x]) => { if (clock >= t && !said[x]) { said[x] = 1; say(x, 'tmp'); } });
    if (tb >= 0 && !said.go && finale < 0) { said.go = 1; say('WALKA!', 'go tmp'); }
    for (let i = projs.length - 1; i >= 0; i--) { const p = projs[i]; p.u += dt * scale / p.e.fl; if (p.u >= 1) { impact(p.e); projs.splice(i, 1); } }
    for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 260 * dt; if (p.life <= 0) parts.splice(i, 1); }
    for (let i = floats.length - 1; i >= 0; i--) { const f = floats[i]; f.life -= dt; f.y -= 40 * dt; if (f.life <= 0) floats.splice(i, 1); }
    const pctA = Math.max(0, 1 - hpLost[0] / war.H), pctB = Math.max(0, 1 - hpLost[1] / war.H), pa = finale >= 0 && war.winner === 1 ? 0 : pctA, pb = finale >= 0 && war.winner === 0 ? 0 : pctB;
    // dym z uszkodzonych zamków
    fireT += dt; if (fireT > 0.12 && finale < 0) { fireT = 0; [[0, pa], [1, pb]].forEach(([s, pc]) => { if (pc < 0.4) parts.push({ x: castleX(s) + rnd(-30, 30), y: WAR_GROUND - 130, vx: rnd(-10, 10), vy: -50, life: 1, max: 1, col: '#3a3a44', r: rnd(4, 8) }); }); }
    // --- rysowanie ---
    ctx.save(); ctx.clearRect(0, 0, WAR_W, WAR_H);
    if (shake > 0.3) { ctx.translate(rnd(-shake, shake), rnd(-shake, shake)); shake *= 0.88; }
    const sky = ctx.createLinearGradient(0, 0, 0, WAR_GROUND); sky.addColorStop(0, '#0c1224'); sky.addColorStop(0.55, '#2a2350'); sky.addColorStop(1, '#6a3a4a'); ctx.fillStyle = sky; ctx.fillRect(-20, -20, WAR_W + 40, WAR_H + 40);
    ctx.fillStyle = '#1a1830'; ctx.beginPath(); ctx.moveTo(0, WAR_GROUND - 70); for (let x = 0; x <= WAR_W; x += 50) ctx.lineTo(x, WAR_GROUND - 70 - 36 * Math.abs(Math.sin(x * 0.011)) - 10); ctx.lineTo(WAR_W, WAR_GROUND); ctx.lineTo(0, WAR_GROUND); ctx.fill();
    const gr = ctx.createLinearGradient(0, WAR_GROUND - 6, 0, WAR_H); gr.addColorStop(0, '#2e3a22'); gr.addColorStop(1, '#10160c'); ctx.fillStyle = gr; ctx.fillRect(-20, WAR_GROUND - 6, WAR_W + 40, WAR_H);
    drawCastle(0, pa, finale >= 0 && war.winner === 1 ? clock - finale : -1); drawCastle(1, pb, finale >= 0 && war.winner === 0 ? clock - finale : -1);
    // żołnierze
    const ent = Math.min(1, clock / 2.6), ease = 1 - Math.pow(1 - ent, 3);
    for (let side = 0; side < 2; side++) for (let r = 9; r >= 0; r--) for (let c = 0; c < 10; c++) {
      const i = r * 10 + c, p = war.teams[side][i], q = tokenPos(side, i), ox = (side === 0 ? -1 : 1) * (1 - ease) * (320 + c * 12), j = Math.max(0, 1 - (clock - hit[side][i]) * 5) * 6;
      const x = q.x + ox, y = q.y - j, rad = (p.me ? 8.5 : 5.2) * q.s;
      ctx.fillStyle = p.me ? '#ffd24d' : side === 0 ? (j > 0 ? '#bfe0ff' : '#4da3ff') : (j > 0 ? '#ffc4c4' : '#ff6b6b');
      ctx.beginPath(); ctx.arc(x, y, rad, 0, 6.283); ctx.fill();
      if (p.me) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = '#ffd24d'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('▼ TY', x, y - 14); }
    }
    // pociski
    for (const p of projs) {
      const e = p.e, tgt = 1 - e.side, a = tokenPos(e.side, e.i), b = impactPt(tgt, e.dy), u = Math.min(1, p.u), u0 = Math.max(0, u - 0.07);
      const pos = k => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k - Math.sin(Math.PI * k) * e.arc }), P = pos(u), P0 = pos(u0), col = e.crit ? '#ffd24d' : e.side === 0 ? '#9cc8ff' : '#ff9a9a';
      ctx.strokeStyle = col; ctx.lineWidth = e.crit ? 3.5 : 2; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.moveTo(P0.x, P0.y); ctx.lineTo(P.x, P.y); ctx.stroke();
      ctx.globalAlpha = 1; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(P.x, P.y, e.crit ? 4 : 2.4, 0, 6.283); ctx.fill();
    }
    for (const p of parts) { ctx.globalAlpha = Math.max(0, p.life / p.max); ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill(); }
    ctx.globalAlpha = 1; ctx.textAlign = 'center';
    for (const f of floats) { ctx.globalAlpha = Math.min(1, f.life * 1.5); ctx.fillStyle = f.col; ctx.font = `bold ${f.size}px sans-serif`; ctx.fillText(f.t, f.x, f.y); }
    ctx.restore();
    // --- interfejs ---
    $('#wb-a').style.width = (100 * pa) + '%'; $('#wb-b').style.width = (100 * pb) + '%';
    $('#wt-a').textContent = `${Math.round(100 * pa)}% · zadano ${fmtNum(dealt[0].reduce((a, b) => a + b, 0))}`; $('#wt-b').textContent = `${Math.round(100 * pb)}% · zadano ${fmtNum(dealt[1].reduce((a, b) => a + b, 0))}`;
    const tt = Math.max(0, Math.min(tb, war.endT)); $('#w-timer').textContent = tb < 0 ? '—' : `${Math.floor(tt / 60)}:${String(Math.floor(tt % 60)).padStart(2, '0')}`;
    boardT += dt; if (boardT > 0.5) { boardT = 0; renderBoard(); }
    if (finale >= 0 && clock - finale > 3.3 && !resultShown) { showResult(); }
    if (!done) raf = requestAnimationFrame(frame);
  }
  function renderBoard() {
    const all = []; for (let s = 0; s < 2; s++) war.teams[s].forEach((p, i) => all.push({ p, s, d: dealt[s][i] })); all.sort((a, b) => b.d - a.d);
    const box = $('#w-board'); if (!box) return; box.replaceChildren();
    const h = document.createElement('div'); h.className = 'small muted'; h.textContent = 'Najwięcej obrażeń (na żywo)'; box.append(h);
    all.slice(0, 5).forEach((x, k) => { const r = document.createElement('div'); r.className = 'wrow ' + (x.p.me ? 'me' : x.s === 0 ? 'a' : 'b'); r.textContent = `${k + 1}. ${x.p.name}${x.p.me ? ' (TY)' : ''} · ${x.s === 0 ? 'Poznań' : war.opp}`; const b = document.createElement('b'); b.textContent = fmtNum(x.d); r.append(b); box.append(r); });
  }
  function showResult() {
    if (resultShown) return; resultShown = true; done = true; cancelAnimationFrame(raf);
    const R = warRewards(war); S.gold += R.gold; gainXp(R.xp); S.glory += R.glory;
    W.hist.unshift({ win: R.win, opp: war.opp, my: R.my, rank: R.rank, totA: war.totals[0].reduce((a, b) => a + b, 0), totB: war.totals[1].reduce((a, b) => a + b, 0) }); if (W.hist.length > 8) W.hist.pop();
    const all = []; for (let s = 0; s < 2; s++) war.teams[s].forEach((p, i) => all.push({ p, s, d: war.totals[s][i] })); all.sort((a, b) => b.d - a.d);
    const box = $('#w-result'); box.className = 'wresult show'; $('#w-board').style.display = 'none'; $('#w-skip').style.display = 'none'; $('#w-banner').className = 'wbanner';
    const lines = [`<h2 class="center ${R.win ? 'win' : 'lose'}">${R.win ? '🏆 POZNAŃ WYGRYWA!' : '💀 ' + war.opp.toUpperCase() + ' WYGRYWA'}</h2>`,
      `<div class="chips3"><div class="chip3"><small>Twój wkład</small><b>${fmtNum(R.my)}</b></div><div class="chip3"><small>Miejsce w składzie</small><b>#${R.rank} / ${WAR_N}</b></div><div class="chip3"><small>Udział w obrażeniach</small><b>${(R.share * 100).toFixed(1)}%</b></div></div>`,
      `<p class="center">Nagrody: <b>+${R.gold} 🪙</b> · <b>+${R.xp} XP</b> · <b>+${R.glory} chwały miasta</b></p>`,
      `<div class="wboard">${all.slice(0, 5).map((x, k) => `<div class="wrow ${x.p.me ? 'me' : x.s === 0 ? 'a' : 'b'}">${k + 1}. ${x.p.name}${x.p.me ? ' (TY)' : ''} · ${x.s === 0 ? 'Poznań' : war.opp}<b>${fmtNum(x.d)}</b></div>`).join('')}</div>`];
    box.innerHTML = lines.join('') + '<div class="acts center"><button id="w-close">Zamknij</button><button id="w-again" class="bigbtn">⚔ Jeszcze raz</button></div>';
    $('#w-close').onclick = closeWar; $('#w-again').onclick = () => { closeWar(); setTimeout(runWar, 50); };
    render();
  }
  function closeWar() { done = true; cancelAnimationFrame(raf); root.replaceChildren(); root.className = ''; W.running = false; render(); }
  $('#w-skip').onclick = () => { if (finale < 0) { for (let s = 0; s < 2; s++) war.teams[s].forEach((p, i) => dealt[s][i] = war.totals[s][i]); hpLost[1 - war.winner] = war.H; hpLost[war.winner] = war.H * 0.4; finale = clock - 10; } showResult(); };
  raf = requestAnimationFrame(frame);
}

function renderWar() {
  const W = S.war, P = Math.round(power() * warMult());
  $('#war-power').textContent = P; $('#war-dps').textContent = Math.round(dps());
  $('#war-cnt-a').textContent = `${63 + (W.signed ? 1 : 0)} / ${WAR_N}`; $('#war-bar-a').style.width = (63 + (W.signed ? 1 : 0)) + '%';
  $('#war-cnt-b').textContent = `71 / ${WAR_N}`; $('#war-bar-b').style.width = '71%'; $('#war-opp').textContent = W.opp;
  $('#b-warsign').textContent = W.signed ? '✅ Jesteś zapisany na dzisiejszą wojnę' : '✋ Zapisz się na dzisiejszą wojnę (19:00)';
  $('#b-war').disabled = W.running;
  const h = $('#war-hist'); h.replaceChildren();
  if (!W.hist.length) { const p = document.createElement('p'); p.className = 'muted small'; p.textContent = 'Brak wojen. Użyj przycisku testowego, żeby rozegrać pierwszą.'; h.append(p); }
  for (const x of W.hist) { const d = document.createElement('div'); d.className = 'hrow ' + (x.win ? 'w' : 'l'); d.textContent = `${x.win ? '🏆' : '💀'} Poznań vs ${x.opp} · Twój wkład ${fmtNum(x.my)} (#${x.rank})`; const s = document.createElement('small'); s.textContent = `${fmtNum(x.totA)} : ${fmtNum(x.totB)}`; d.append(s); h.append(d); }
}


function render() {
  $('#p-name').textContent = `Gracz · poziom ${S.lvl}`;
  $('#xp-bar').style.width = (100 * S.xp / xpNeed(S.lvl)) + '%';
  $('#p-xp-pct').textContent = (100 * S.xp / xpNeed(S.lvl)).toFixed(2) + '%';
  $('#p-eta').textContent = 'XP i sprzęt zdobywasz w lochach, pojedynkach i wyprawach';
  document.querySelectorAll('.glory-val').forEach(x => x.textContent = S.glory);
  document.querySelectorAll('.gold-val').forEach(x => x.textContent = S.gold);
  document.querySelectorAll('.pts-val').forEach(x => x.textContent = S.points); $('#top-power').textContent = power();

  renderEq();
  renderSmith();
  renderChar();
  renderSkills();
  renderWar();
  renderDuel();
  renderDung();
  renderGather();
  renderExp();
  const tabs = { dung: '🗝️ Lochy' + (S.dung.active ? ' ⏳' : ''), duel: `🥊 Pojedynki 1v1 (${DUEL_MAX - S.duel.used}/${DUEL_MAX})` };
  for (const [k, t] of Object.entries(tabs)) { const b = document.querySelector('[data-sub="' + k + '"]'); if (b.textContent !== t) b.textContent = t; }

}

// sterowanie
document.querySelectorAll('.navbtn').forEach(b => b.onclick = () => {
  S.view = b.dataset.view;
  document.querySelectorAll('.navbtn').forEach(x => x.classList.toggle('on', x === b));
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('hidden', v.id !== 'view-' + S.view));
});
$('#auto-train').onchange = e => { S.autoTrain = e.target.checked; };
document.querySelectorAll('[data-set]').forEach(b => b.onclick = () => {
  S.setName = b.dataset.set; S.eq = S.sets[S.setName]; S.sel = null; render();
});
$('#b-sort').onclick = () => {
  S.inv.sort((a, b) => SLOTS.findIndex(s => s.k === a.slot) - SLOTS.findIndex(s => s.k === b.slot) || b.tier - a.tier || b.q - a.q || b.plus - a.plus);
  render();
};
$('#b-mark').onclick = () => { S.markMode = !S.markMode; S.marked.clear(); render(); };
$('#b-sellm').onclick = () => {
  for (const it of [...S.inv]) if (S.marked.has(it.id)) { S.gold += sellPrice(it); S.inv.splice(S.inv.indexOf(it), 1); if (S.sel === it.id) S.sel = null; }
  S.marked.clear(); render();
};
$('#b-upgrade').onclick = upgrade;
forgeInit();
setInterval(() => { if (!S.paused) { for (let i = 0; i < S.speed; i++) timersTick(); render(); } }, 1000);
setInterval(() => {
  const now = new Date(); const t = new Date(now); t.setHours(19, 0, 0, 0); if (t <= now) t.setDate(t.getDate() + 1);
  const s = Math.floor((t - now) / 1000); document.querySelectorAll('.war-city-in').forEach(x => x.textContent = fmtSec(s));
  $('#war-voiv-in').textContent = fmtSec((nextSunday19() - now) / 1000);
}, 1000);
render();
log('Witaj! Wejdź do pierwszego lochu (Walka → Lochy) i włącz „Powtarzaj automatycznie”.', 'loot');

// ---------- LIGA (dane przykładowe) ----------
const LEAGUE = [ // miasto, mecze, W, R, P, bilans, forma (ostatnie 5)
  ['Warszawa', 9, 7, 1, 1, '+412', 'WWRWW'], ['Kraków', 9, 6, 2, 1, '+305', 'WWWRW'], ['Poznań', 9, 6, 1, 2, '+240', 'WPWWW'],
  ['Wrocław', 9, 5, 2, 2, '+121', 'RWWPW'], ['Gdańsk', 9, 5, 1, 3, '+98', 'WPWWP'], ['Łódź', 9, 4, 2, 3, '+30', 'PWRWP'],
  ['Katowice', 9, 3, 2, 4, '-45', 'PRWPW'], ['Lublin', 9, 3, 1, 5, '-120', 'PPWPP'], ['Szczecin', 9, 2, 1, 6, '-210', 'PPPRP'],
  ['Białystok', 9, 1, 1, 7, '-340', 'PPPPW'],
];
const FORM_CLS = { W: 'fw', R: 'fr', P: 'fl' };
function renderLeague() {
  const t = $('#league-table'); t.replaceChildren();
  const head = document.createElement('tr');
  for (const h of ['#', 'Miasto', 'M', 'W', 'R', 'P', 'Bilans', 'Pkt', 'Forma']) { const th = document.createElement('th'); th.textContent = h; head.append(th); }
  t.append(head);
  LEAGUE.map(r => ({ r, pts: r[2] * 3 + r[3] })).sort((a, b) => b.pts - a.pts || parseInt(b.r[5]) - parseInt(a.r[5])).forEach(({ r, pts }, i) => {
    const tr = document.createElement('tr');
    if (r[0] === 'Poznań') tr.className = 'me';
    else if (i < 2) tr.className = 'promo'; else if (i >= LEAGUE.length - 2) tr.className = 'rel';
    const cells = [i + 1, r[0], r[1], r[2], r[3], r[4], r[5], pts];
    for (const v of cells) { const td = document.createElement('td'); td.textContent = v; tr.append(td); }
    const f = document.createElement('td');
    for (const ch of r[6]) { const b = document.createElement('span'); b.className = 'form ' + FORM_CLS[ch]; b.textContent = ch; f.append(b); }
    tr.append(f); t.append(tr);
  });
  const players = [['Wiktor_Warta', 3120, 'Kapitan miasta'], ['Gracz', Math.round(power() * 1.1), 'Ty'], ['Kasztelan88', 2410, 'MVP tygodnia'], ['Zosia_Łuk', 2190, ''], ['Rycerz_Jan', 1880, '']]
    .sort((a, b) => b[1] - a[1]);
  const p = $('#city-players'); p.replaceChildren();
  players.forEach((x, i) => {
    const tr = document.createElement('tr'); if (x[0] === 'Gracz') tr.className = 'me';
    for (const v of [i + 1, x[0], x[1], x[2]]) { const td = document.createElement('td'); td.textContent = v; tr.append(td); }
    p.append(tr);
  });
  const res = $('#league-results'); res.replaceChildren();
  for (const [a, sa, sb, b] of [['Poznań', 812, 790, 'Wrocław'], ['Warszawa', 905, 640, 'Poznań'], ['Poznań', 770, 770, 'Gdańsk'], ['Łódź', 702, 733, 'Poznań']]) {
    const d = document.createElement('div'); d.className = 'battle';
    d.textContent = `${a} ${sa} : ${sb} ${b}`; res.append(d);
  }
}
renderLeague();

// ---------- podzakładki Walki, pojedynki, zbieranie ----------
document.querySelectorAll('[data-sub]').forEach(b => b.onclick = () => {
  document.querySelectorAll('[data-sub]').forEach(x => x.classList.toggle('on', x === b));
  S.sub = b.dataset.sub; if (S.sub === 'exp') expSync(false);
  for (const k of ['dung', 'duel', 'exp']) $('#sub-' + k).classList.toggle('hidden', b.dataset.sub !== k);
});
$('#b-duel').onclick = startSearch;
$('#b-sellmat').onclick = sellMaterials;
$('#b-war').onclick = runWar;
$('#b-warsign').onclick = () => { S.war.signed = !S.war.signed; render(); };
$('#b-expon').onclick = () => { S.exp.on = !S.exp.on; render(); };
expInitBg();
$('#b-dstart').onclick = startDungeon;
$('#b-dstop').onclick = () => { if (S.dung.active) endDungeon(S.dung.active, 'stop'); };
$('#b-start').onclick = startSession;
$('#b-stop').onclick = stopSession;
