// BRONIE W GRZE (dane od właściciela). Na razie istnieją: Drewniany miecz (Rycerz), Drewniany łuk (Zwiadowca) i Drewniana różdżka (Mag), wszystkie na poziomie 1.
// Kolejne bronie właściciel podaje po jednej; wcześniejsza pełna tabela jest w balance/weapons_draft.js (tylko do symulatora).
'use strict';
const WEAPON_LEVELS = [1];
// Wiersz: [Miecz ATK, Łuk ATK, Różdżka Fiz, Różdżka Mag] = ŚRODEK przedziału.
// Drewniany miecz +0…+9: 13–15 … 26–28 (±1). Drewniany łuk: 15–25 … 28–38 (±5). Drewniana różdżka: 10–12 … 23–25 (±1; jedna wartość: i Fiz, i Mag).
const WEAPON_TABLE = {
  1: [[14,20,11,11],[15,21,12,12],[16,22,13,13],[17,23,14,14],[18,24,15,15],[19,25,16,16],[20,26,17,17],[22,28,19,19],[24,30,21,21],[27,33,24,24]],
};
const WEAPON_COL = { sword: 0, bow: 1, wand: 2 };
const WEAPON_SPREAD = { sword: { 0: 1 }, bow: { 0: 5 }, wand: { 0: 1 } };   // przedział ±N wokół środka (np. łuk +0: 15–25)
const WEAPON_AVAILABLE = { sword: true, bow: true, wand: true };
function weaponStats(kind, tierIdx, plus) {
  const t = Math.max(0, Math.min(WEAPON_LEVELS.length - 1, tierIdx | 0)), p = Math.max(0, Math.min(9, plus | 0));
  if (!WEAPON_AVAILABLE[kind]) return { atk: 0, mag: 0, lo: 0, hi: 0, mlo: 0, mhi: 0 };
  const row = WEAPON_TABLE[WEAPON_LEVELS[t]][p], sp = (WEAPON_SPREAD[kind] || {})[t] || 0, a = row[WEAPON_COL[kind]], m = kind === 'wand' ? row[3] : 0;
  return { atk: a, mag: m, lo: a - sp, hi: a + sp, mlo: m ? m - sp : 0, mhi: m ? m + sp : 0 };
}
// statystyki przedmiotu z uwzględnieniem ulepszenia (+0..+9) i rzadkości
function itemStats(it) {
  if (!it) return { atk: 0, mag: 0, def: 0, lo: 0, hi: 0, mlo: 0, mhi: 0 };
  if (it.type === 'earrings' || it.type === 'necklace' || it.type === 'bracelet' || it.type === 'ring') return { atk: 0, mag: 0, lo: 0, hi: 0, mlo: 0, mhi: 0, def: 0 };
  const m = it.rm || 1;
  if (it.type === 'weapon') { const s = weaponStats(it.kind, it.tier, it.plus), f = v => Math.round(v * m); return { atk: f(s.atk), mag: f(s.mag), lo: f(s.lo), hi: f(s.hi), mlo: f(s.mlo), mhi: f(s.mhi), def: 0 }; }
  if (ARMOR_TABLE[it.type] && ARMOR_TABLE[it.type][it.tier]) return { atk: 0, mag: 0, lo: 0, hi: 0, mlo: 0, mhi: 0, def: Math.round(ARMOR_TABLE[it.type][it.tier][Math.max(0, Math.min(9, it.plus | 0))] * m) };
  return { atk: 0, mag: 0, lo: 0, hi: 0, mlo: 0, mhi: 0, def: Math.round(it.def * (1 + 0.15 * (it.plus || 0))) };
}
// NAZWY BRONI: po jednej dla każdego dostępnego etapu
const WEAPON_NAMES = { sword: ['Drewniany miecz'], bow: ['Drewniany łuk'], wand: ['Drewniana różdżka'] };

// PANCERZE (dane od właściciela, bez podziału na klasy). Na razie istnieją: Drewniana zbroja, Drewniany hełm, Drewniane buty i Drewniana tarcza (poziom 1).
// Obrona +0…+9 dla każdego dostępnego etapu zbroi (indeks = etap).
const ARMOR_TABLE = {
  armor: [[9, 15, 21, 27, 33, 39, 45, 51, 57, 63]],     // Drewniana zbroja
  helm:  [[5, 7, 9, 11, 13, 15, 17, 21, 25, 33]],        // Drewniany hełm
  boots: [[2, 2, 3, 3, 4, 4, 5, 5, 6, 6]],               // Drewniane buty
  shield: [[3, 6, 9, 12, 15, 18, 21, 25, 29, 33]],       // Drewniana tarcza
};
const ARMOR_NAMES = { armor: ['Drewniana zbroja'], helm: ['Drewniany hełm'], boots: ['Drewniane buty'], shield: ['Drewniana tarcza'] };

// ŁUP NA MAPACH (wspólne dla serwera i klienta). Każda sztuka drewnianego EQ wypada jako +0 lub +1, szansa rolowana osobno dla każdej części.
// mob: szansa na KAŻDĄ część z jednego zabitego potwora, wg poziomu potwora; boss/target: dokładnie jedna losowa część.
const MAP_DROPS = {
  polanka: { parts: ['weapon', 'helm', 'armor', 'boots', 'shield', 'ear_life', 'ear_str', 'ear_mag', 'ear_dex', 'neck', 'bracelet', 'ring_hp', 'ring_mp'], mob: { 1: 0.008, 2: 0.010, 3: 0.012, 4: 0.014, 5: 0.016 }, plus1: 0.2, boss: 0, target: 0,
    gold: { 1: [5, 15], 2: [10, 25], 3: [15, 35], 4: [20, 45], 5: [20, 65] }, goldChance: 0.5, goldMaxGap: 10, bossGold: [100, 300], targetGold: [50, 150] }   // złoto losuje serwer   // boss i Spaczony Korzeń: łup jeszcze nieustalony,
};

// MIKSTURY (Alchemik). Leczą stopniowo (jak w Metinie), nie natychmiast. Ceny od właściciela (mała 40, średnia 160, duża 320).
const POTION_MAX = 1000;   // maks. liczba sztuk każdej mikstury, jaką można mieć
const POTIONS = {
  hp_s: { n: 'Mała mikstura życia', ic: '🧪', kind: 'hp', size: 'S', v: 300, secs: 6, price: 40 },
  hp_m: { n: 'Średnia mikstura życia', ic: '🧪', kind: 'hp', size: 'M', v: 800, secs: 9, price: 160 },
  hp_l: { n: 'Duża mikstura życia', ic: '🧪', kind: 'hp', size: 'L', v: 1200, secs: 12, price: 320 },
  mp_s: { n: 'Mała mikstura many', ic: '💧', kind: 'mp', size: 'S', v: 100, secs: 6, price: 40 },
  mp_m: { n: 'Średnia mikstura many', ic: '💧', kind: 'mp', size: 'M', v: 250, secs: 9, price: 160 },
  mp_l: { n: 'Duża mikstura many', ic: '💧', kind: 'mp', size: 'L', v: 400, secs: 12, price: 320 },
};

// ===== BONY PRZEDMIOTÓW =====
// Liczba bonów = rzadkość: 0 Zwykły, 1 Rzadki, 2 Wybitny, 3 Epicki, 4 Legendarny, 5 Mityczny.
// t = trzy wartości (najmocniejsza najtrudniejsza, wagi BONUS_TIER_W). types = typy przedmiotów, w których bon może się pojawić (brak = każdy).
const BONUS_TIER_W = [70, 25, 5];
const BONUSES = {
  dmg:      { n: 'Zwiększone obrażenia', ic: '⚔️', u: '%', types: ['weapon'], w: 4, hint: 'o tyle % więcej niż pokazuje atak broni (może być ujemny)' },
  def:      { n: 'Obrona', ic: '🛡️', u: '', types: ['armor'], t: [10, 25, 50] },
  crit:     { n: 'Szansa na cios krytyczny', ic: '💥', u: '%', t: [1, 2, 3], hint: 'cios krytyczny zadaje podwójne obrażenia' },
  aspd:     { n: 'Szybkość ataku', ic: '⚡', u: '%', t: [1, 2, 3] },
  mob:      { n: 'Silny przeciwko potworom', ic: '🐾', u: '%', t: [1, 2, 3], hint: 'więcej obrażeń wszystkim potworom na każdej mapie' },
  res_mob:  { n: 'Odporny na potwory', ic: '🧱', u: '%', t: [1, 2, 3], hint: 'wszystkie potwory zadają o tyle % mniej obrażeń' },
  boss:     { n: 'Silny przeciwko bossom', ic: '☠️', u: '%', t: [1, 2, 3] },
  vs_k:     { n: 'Silny przeciwko Rycerzom', ic: '🛡️', u: '%', t: [1, 3, 5], pvp: true },
  vs_s:     { n: 'Silny przeciwko Zwiadowcom', ic: '🏹', u: '%', t: [1, 3, 5], pvp: true },
  vs_m:     { n: 'Silny przeciwko Magom', ic: '🔮', u: '%', t: [1, 3, 5], pvp: true },
  res_k:    { n: 'Odporny na Rycerzy', ic: '🛡️', u: '%', t: [1, 2, 3], pvp: true },
  res_s:    { n: 'Odporny na Zwiadowców', ic: '🏹', u: '%', t: [1, 2, 3], pvp: true },
  res_m:    { n: 'Odporny na Magów', ic: '🔮', u: '%', t: [1, 2, 3], pvp: true },
  res_boss: { n: 'Odporny na bossy', ic: '🐲', u: '%', t: [1, 2, 3] },
  hp:       { n: 'Życie', ic: '❤️', u: '', types: ['armor'], t: [150, 300, 500] },
  mp:       { n: 'Mana', ic: '💧', u: '', types: ['armor'], t: [50, 150, 300] },
};
// Zwiększone obrażenia: ciągłe −15…+50; powyżej 20% coraz trudniej, 50% praktycznie nieosiągalne
const DMG_BUCKETS = [[-15, -1, 6], [1, 10, 62], [11, 20, 24], [21, 30, 6], [31, 40, 1.6], [41, 49, 0.35], [50, 50, 0.05]];
function rollBonusValue(id) {
  if (id === 'dmg') {
    let x = Math.random() * 100;
    for (const [lo, hi, wgt] of DMG_BUCKETS) { x -= wgt; if (x <= 0) return lo === hi ? lo : lo + Math.floor((hi - lo + 1) * Math.pow(Math.random(), 1.6)); }
    return 1;
  }
  let x = Math.random() * 100, i = 0; for (; i < 2; i++) { x -= BONUS_TIER_W[i]; if (x <= 0) break; }
  return BONUSES[id].t[i];
}
const bonusFits = (id, type) => !BONUSES[id].types || BONUSES[id].types.includes(type);
// ile bonów ma wypaść (waga): zwykłe są najczęstsze, 5 bonów prawie nie występuje
const BONUS_COUNT_W = [78, 16, 4.5, 1.2, 0.25, 0.05];
const RARITY_NAMES = ['Zwykły', 'Rzadki', 'Wybitny', 'Epicki', 'Legendarny', 'Mityczny'];
const fmtBonus = (id, v) => { const b = BONUSES[id]; return (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v) + b.u; };
// suma bonów z założonego ekwipunku: items = mapa uid→przedmiot, equip = mapa slot→uid
function bonusTotals(items, equip) {
  const t = {}; for (const k of Object.keys(BONUSES)) t[k] = 0;
  if (items && equip) for (const u of Object.values(equip)) { const it = items[u]; if (it && it.bonus) for (const b of it.bonus) if (t[b.id] !== undefined) t[b.id] += b.v; }
  return t;
}
// PvP (Arena — wkrótce): mnożniki obrażeń atakującego wobec klasy obrońcy
function pvpMult(att, def, defCls) {
  const k = { knight: 'k', scout: 's', mage: 'm' }[defCls]; if (!k) return 1;
  return (1 + att['vs_' + k] / 100) * (1 - def['res_' + k] / 100);
}

// KOLCZYKI (poziom 5): dają punkty statusu jednej cechy. +0…+2 → 1 pkt, +3…+5 → 2, +6…+8 → 3, +9 → 4.
const EARRING_STATS = { life: 'Życia', str: 'Siły', mag: 'Magii', dex: 'Zręczności' };
const earringPoints = it => { const p = (it && it.plus) | 0; return p >= 9 ? 4 : p >= 6 ? 3 : p >= 3 ? 2 : 1; };
// punkty statusu z założonych kolczyków: { life, str, mag, dex }
function eqStatPoints(items, equip) {
  const o = { life: 0, str: 0, mag: 0, dex: 0 };
  if (items && equip) for (const u of Object.values(equip)) { const it = items[u]; if (it && it.type === 'earrings' && o[it.statKey] !== undefined) o[it.statKey] += earringPoints(it); }
  return o;
}
// wydane punkty + punkty z kolczyków
function withEq(st, s) { const e = eqStatPoints(s && s.items, s && s.equip), o = { ...(st || {}) }; for (const k of Object.keys(e)) o[k] = (o[k] || 0) + e[k]; return o; }

// NASZYJNIK (poziom 5): skraca czas odnowienia WSZYSTKICH umiejętności. +0…+3 → 1%, +4…+8 → 2%, +9 → 3%.
const necklaceHaste = it => { const p = (it && it.plus) | 0; return p >= 9 ? 3 : p >= 4 ? 2 : 1; };
function skillHaste(items, equip) {
  let h = 0; if (items && equip) for (const u of Object.values(equip)) { const it = items[u]; if (it && it.type === 'necklace') h += necklaceHaste(it); }
  return h;
}

// BRANSOLETA (poziom 5): szybkość ataku. +0…+3 → 1%, +4…+8 → 2%, +9 → 3%.
const braceletSpeed = it => { const p = (it && it.plus) | 0; return p >= 9 ? 3 : p >= 4 ? 2 : 1; };
// PIERŚCIENIE (poziom 5): Życia i Many. +0 → 10, +9 → 50 (liniowo).
const ringValue = it => Math.round(10 + ((it && it.plus) | 0) * 40 / 9);
// sumy z założonych dodatków: { aspd (%), hp, mp }
function accessoryTotals(items, equip) {
  const o = { aspd: 0, hp: 0, mp: 0 };
  if (items && equip) for (const u of Object.values(equip)) {
    const it = items[u]; if (!it) continue;
    if (it.type === 'bracelet') o.aspd += braceletSpeed(it);
    else if (it.type === 'ring') { if (it.ringKind === 'mp') o.mp += ringValue(it); else o.hp += ringValue(it); }
  }
  return o;
}
