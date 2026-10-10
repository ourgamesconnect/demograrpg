// TABELA BRONI (dane od właściciela: statystyki_broni_ulepszenia.md). Etapy co 10 poziomów, ulepszenie +0..+9.
// Wiersz: [Miecz ATK, Łuk ATK, Różdżka Fiz, Różdżka Mag]
'use strict';
const WEAPON_LEVELS = [1, 10, 20, 30, 40, 50, 60, 70, 80, 90];
const WEAPON_TABLE = {
  1: [[1,2,1,2],[2,3,1,3],[3,4,2,4],[4,5,2,6],[5,7,3,8],[6,9,4,10],[8,11,5,12],[10,14,6,15],[13,18,8,19],[17,23,10,24]],
  10: [[15,22,10,20],[17,25,11,23],[19,28,12,26],[21,32,14,30],[24,36,16,34],[27,41,18,39],[31,47,21,45],[36,54,24,52],[42,62,28,60],[50,72,33,70]],
  20: [[35,50,25,45],[39,56,28,51],[43,62,31,57],[48,69,34,64],[53,77,38,72],[59,86,42,81],[66,96,47,91],[74,108,53,103],[84,122,60,117],[96,138,68,134]],
  30: [[60,85,40,80],[66,94,44,88],[72,103,48,96],[79,113,53,105],[87,124,58,115],[96,136,64,126],[106,150,71,139],[118,166,79,154],[132,185,88,172],[148,207,99,193]],
  40: [[95,130,65,125],[103,141,71,135],[112,153,77,146],[122,166,84,158],[133,180,92,172],[145,196,100,188],[158,214,109,206],[173,234,120,227],[190,257,132,251],[210,284,146,279]],
  50: [[140,190,95,180],[150,204,102,193],[161,219,110,207],[173,236,119,222],[186,255,129,239],[200,276,140,258],[215,299,152,280],[232,325,165,305],[251,354,179,333],[274,388,195,366]],
  60: [[195,260,135,250],[207,276,144,266],[220,293,154,283],[234,312,165,302],[249,333,177,323],[265,356,190,346],[283,382,204,372],[303,411,220,401],[326,444,238,434],[353,482,259,473]],
  70: [[260,345,180,330],[275,365,191,349],[291,387,203,369],[309,411,216,391],[328,437,230,415],[349,466,245,441],[372,498,262,470],[398,534,281,503],[427,575,303,540],[461,622,329,583]],
  80: [[335,440,235,425],[353,464,248,448],[373,490,262,473],[395,519,278,500],[419,551,295,530],[445,586,314,563],[474,625,335,600],[506,669,359,641],[542,719,386,688],[584,777,417,743]],
  90: [[420,550,295,535],[441,578,310,562],[464,608,326,591],[489,641,344,622],[516,677,364,656],[546,717,386,694],[579,761,411,737],[616,811,439,785],[658,868,471,840],[707,935,508,905]]
};
const WEAPON_COL = { sword: 0, bow: 1, wand: 2 };
// atak broni dla rodzaju, indeksu etapu (0..9) i ulepszenia (0..9); Różdżka ma dodatkowo atak magiczny
function weaponStats(kind, tierIdx, plus) {
  const t = Math.max(0, Math.min(9, tierIdx | 0)), p = Math.max(0, Math.min(9, plus | 0)), row = WEAPON_TABLE[WEAPON_LEVELS[t]][p];
  return kind === 'wand' ? { atk: row[2], mag: row[3] } : { atk: row[WEAPON_COL[kind]], mag: 0 };
}

// statystyki przedmiotu z uwzględnieniem ulepszenia (+0..+9) i rzadkości
function itemStats(it) {
  if (!it) return { atk: 0, mag: 0, def: 0 };
  const m = it.rm || 1;
  if (it.type === 'weapon') { const s = weaponStats(it.kind, it.tier, it.plus); return { atk: Math.round(s.atk * m), mag: Math.round(s.mag * m), def: 0 }; }
  return { atk: 0, mag: 0, def: Math.round(it.def * (1 + 0.15 * (it.plus || 0))) };
}

// NAZWY BRONI (od właściciela): po jednej dla każdego etapu i rodzaju. Indeks = etap (poziomy 1, 10, 20 … 90)
const WEAPON_NAMES = {
  sword: ['Żelazny Kieł', 'Ostrze Strażnika', 'Stalowy Brzeszczot', 'Zguba Pustkowi', 'Pęknięcie Ziemi', 'Widmowy Rozpłatacz', 'Miecz Płonącej Furii', 'Kryształowy Rozdzieracz', 'Ostrze Kosmicznego Echa', 'Miecz Rozdartego Wymiaru'],
  bow:   ['Wygięty Klon', 'Łuk Tropiciela', 'Cisowy Niszczyciel', 'Skrzydło Jastrzębia', 'Łuk Mroźnego Wichru', 'Łowca Burz', 'Łuk Skrzydlatego Węża', 'Szept Śmierci', 'Łuk Gwiezdnej Komety', 'Łuk Końca Czasu'],
  wand:  ['Sękata Gałąź', 'Różdżka Ucznia', 'Kostur Spokojnej Wody', 'Różdżka Eterycznego Szeptu', 'Kostur Tkacza Dusz', 'Różdżka Zaćmienia', 'Kostur Słonecznej Flary', 'Różdżka Pierwotnego Chaosu', 'Kostur Astralnego Splotu', 'Różdżka Absolutu'],
};
