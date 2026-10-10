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
  polanka: { parts: ['weapon', 'helm', 'armor', 'boots', 'shield'], mob: { 1: 0.008, 2: 0.010, 3: 0.012, 4: 0.014, 5: 0.016 }, plus1: 0.2, boss: 0, target: 0,
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
