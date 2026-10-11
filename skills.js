// UMIEJĘTNOŚCI — definicje (wspólne dla serwera-symulatora, ekranu umiejętności i wypraw)
'use strict';
const SKILL_MAX = 20;
// Umiejętności NIE zależą od poziomu postaci: wszystkie są dostępne od początku, a gracz sam wybiera, w co wkłada punkty.
const SKILL_WEAPONS = [
  { k: 'sword', n: 'Miecz',   ic: '🗡️', c: '#ff8a45' },
  { k: 'bow',   n: 'Łuk',     ic: '🏹', c: '#4fe39a' },
  { k: 'wand',  n: 'Różdżka', ic: '🪄', c: '#c58bff' },
];
const _lerp = (a, b, r) => a + (b - a) * (Math.max(1, r) - 1) / 19;
const _pc = v => Math.round(v * 100) + '%';
const _n1 = v => (Math.round(v * 10) / 10).toString().replace('.', ',');
// kind: buff | strike | debuff | execute | dot | nuke | detonate | channel  (opis w kodzie wypraw)
const SKILLS = [
  // ---- MIECZ ----
  { id: 'sw1', w: 'sword', n: 'Zwiększenie Ataku', ic: '🔺', kind: 'buff', cd: 120, mana: 25, dur: 60,
    p: r => ({ atk: _lerp(0.25, 0.50, r), taken: 0.10, dur: Math.round(_lerp(60, 180, r)) }),
    desc: r => { const p = SKILLS[0].p(r); return `Aura trwająca ${p.dur} s: Twoje ataki podstawowe zadają +${_pc(p.atk)} obrażeń, ale otrzymujesz +10% obrażeń.`; } },
  { id: 'sw2', w: 'sword', n: 'Zwiększenie Obrony', ic: '🛡️', kind: 'buff', cd: 120, mana: 25, dur: 60,
    p: r => ({ red: _lerp(0.25, 0.40, r), aspd: -0.15, dur: Math.round(_lerp(60, 180, r)) }),
    desc: r => { const p = SKILLS[1].p(r); return `Aura trwająca ${p.dur} s: otrzymujesz −${_pc(p.red)} obrażeń fizycznych i jesteś odporny na ogłuszenie, ale atakujesz o 15% wolniej.`; } },
  { id: 'sw3', w: 'sword', n: 'Nawałnica Stali', ic: '🌀', kind: 'strike', cd: 6, mana: 12,
    p: r => ({ mult: _lerp(1.2, 2.2, r) }),
    desc: r => `Szybki młynek wokół własnej osi: ${_pc(SKILLS[2].p(r).mult)} obrażeń. Czyści grupy słabszych potworów. Niski koszt many, krótkie odnowienie.` },
  { id: 'sw4', w: 'sword', n: 'Rozdarcie Pancerza', ic: '🪓', kind: 'debuff', cd: 15, mana: 30, vdur: 5,
    p: r => ({ mult: _lerp(2.6, 4.0, r), vuln: _lerp(0.3, 0.5, r) }),
    desc: r => { const p = SKILLS[3].p(r); return `Silny cios: ${_pc(p.mult)} obrażeń. Cel otrzymuje o ${_pc(p.vuln)} więcej obrażeń przez 5 s (obniżony pancerz).`; } },
  { id: 'sw5', w: 'sword', n: 'Krwawy Wyrok', ic: '🩸', kind: 'execute', cd: 40, mana: 40,
    p: r => ({ mult: 0.8, bonus: _lerp(2.0, 3.0, r), thr: 0.3 }),
    desc: r => { const p = SKILLS[4].p(r); return `Egzekucja: ${_pc(p.mult)} obrażeń, a gdy cel ma poniżej 30% życia aż ${_pc(p.mult + p.bonus)}. Długie odnowienie.`; } },
  // ---- ŁUK ----
  { id: 'bw1', w: 'bow', n: 'Szybka Strzała', ic: '💨', kind: 'buff', cd: 40, mana: 20, dur: 20,
    p: r => ({ aspd: _lerp(0.3, 0.6, r) }),
    desc: r => `Przez 20 s strzelasz o ${_pc(SKILLS[5].p(r).aspd)} szybciej.` },
  { id: 'bw2', w: 'bow', n: 'Przebijający Wicher', ic: '🌪️', kind: 'strike', cd: 8, mana: 18,
    p: r => ({ mult: _lerp(1.5, 2.5, r) }),
    desc: r => `Strzała z ogromną siłą: ${_pc(SKILLS[6].p(r).mult)} obrażeń wszystkim wrogom na linii strzału.` },
  { id: 'bw3', w: 'bow', n: 'Grad Kłów', ic: '☄️', kind: 'dot', cd: 20, mana: 35, dur: 6,
    p: r => ({ dpt: _lerp(0.45, 0.85, r) }),
    desc: r => `Deszcz strzał w wybranym polu przez 6 s: ${_pc(SKILLS[7].p(r).dpt)} obrażeń co sekundę wszystkim w strefie.` },
  { id: 'bw4', w: 'bow', n: 'Rozpryskowy Grot', ic: '💥', kind: 'strike', cd: 7, mana: 15,
    p: r => { const s = _lerp(0.1, 0.3, r); return { mult: 1 + s, splash: s }; },
    desc: r => { const p = SKILLS[8].p(r); return `Trafia cel za 100% obrażeń, po czym wybucha odłamkami za dodatkowe ${_pc(p.splash)} (także na pobliskich wrogów).`; } },
  { id: 'bw5', w: 'bow', n: 'Fantomowy Strzał', ic: '👻', kind: 'nuke', cd: 90, mana: 60, windup: 2,
    p: r => ({ mult: _lerp(9, 14, r) }),
    desc: r => `Łucznik zastyga na 2 s i wypuszcza magiczną strzałę ignorującą pancerz: ${_pc(SKILLS[9].p(r).mult)} obrażeń. Ogromne odnowienie i koszt many.` },
  // ---- RÓŻDŻKA ----
  { id: 'wd1', w: 'wand', n: 'Nieskończona Mana', ic: '♾️', kind: 'buff', cd: 75, mana: 0, dur: 8,
    p: r => ({ free: true, cast: -0.3, cd: _lerp(75, 60, r) }),
    desc: r => `Przez 8 s wszystkie umiejętności kosztują 0 many i rzucasz je o 30% szybciej. Odnowienie ${Math.round(_lerp(75, 60, r))} s.` },
  { id: 'wd2', w: 'wand', n: 'Rozbłysk Eteru', ic: '🔮', kind: 'strike', cd: 2.7, mana: 6, charge: 1,
    p: r => ({ mult: _lerp(1.1, 1.8, r) }),
    desc: r => `Sprawny pocisk magiczny: ${_pc(SKILLS[11].p(r).mult)} obrażeń i nakłada Ładunek Eteru (do 3).` },
  { id: 'wd3', w: 'wand', n: 'Rezonans Pustki', ic: '🌌', kind: 'detonate', cd: 12, mana: 25,
    p: r => ({ mult: _lerp(5, 8, r), weak: 0.4, stun: 1.5 }),
    desc: r => `Detonuje Ładunki Eteru: przy 3 ładunkach ${_pc(SKILLS[12].p(r).mult)} obrażeń i ogłuszenie na 1,5 s. Bez ładunków tylko 40% obrażeń.` },
  { id: 'wd4', w: 'wand', n: 'Spopielający Promień', ic: '🔆', kind: 'channel', cd: 15, mana: 8, ticks: 4,
    p: r => ({ mult: _lerp(0.6, 1.2, r), ramp: 0.5 }),
    desc: r => { const p = SKILLS[13].p(r); return `Kanał przez 4 s: obrażenia rosną z każdą sekundą (od ${_pc(p.mult)} do ${_pc(p.mult * 2.5)}). Pożera 8 many na sekundę, przerywa go tylko silny atak bossa.`; } },
  { id: 'wd5', w: 'wand', n: 'Kaskada Zmierzchu', ic: '🌠', kind: 'nuke', cd: 30, mana: 45, hits: 7,
    p: r => ({ mult: _lerp(0.8, 1.3, r) * 7, per: _lerp(0.8, 1.3, r) }),
    desc: r => `7 samonaprowadzających pocisków po ${_pc(SKILLS[14].p(r).per)}. Gdy cel jest sam, dostaje wszystkie 7 naraz: ${_pc(SKILLS[14].p(r).mult)} obrażeń.` },
];
SKILLS.forEach((s, i) => { s.slot = i % 5; s.unlock = 1; });
// maksymalna ranga dozwolona poziomem postaci: +1 ranga na poziom od odblokowania, do 20
const skillCap = () => SKILL_MAX;

// PUNKTY STATUSU: 3 za każdy poziom (od poziomu 2). Gracz sam rozdziela je między pięć cech.
const STAT_PER_LEVEL = 3;
// 4 CECHY jak w Metin2 (kod serwera, ComputePoints/ComputeBattlePoints):
//  Życie  (HT): +40 maks. HP na punkt (hp_per_ht) i +0,8 obrony (poziom + HT/1,25)
//  Siła   (ST): atak Rycerza (wojownik) = 2×ST; Zwiadowcy (zabójca) = (4×ST+2×DX)/3; Maga (szaman) = (4×ST+2×IQ)/3
//  Magia  (IQ): +20 maks. many (sp_per_iq), atak magiczny = 2×IQ (i udział w ataku fizycznym Maga)
//  Zręczność (DX): rating trafienia (mnożnik ataku) i unik przed potworami; w ataku Zwiadowcy (2/3 pkt na punkt)
const STATS = [
  { k: 'life', n: 'Życie',     ic: '❤️', c: '#ff5a6e', per: '+40 maks. życia i +0,8 obrony na punkt' },
  { k: 'str',  n: 'Siła',      ic: '💪', c: '#ff8a45', per: 'Rycerz +2 ataku · Zwiadowca i Mag +1,33 ataku na punkt' },
  { k: 'mag',  n: 'Magia',     ic: '🔮', c: '#c58bff', per: '+20 maks. many i +2 ataku magicznego na punkt (Mag: +0,67 ataku fizycznego)' },
  { k: 'dex',  n: 'Zręczność', ic: '🎯', c: '#4fe39a', per: 'unik (mniej obrażeń od potworów), lepsze trafianie i +0,67 ataku łukiem (Zwiadowca) na punkt' },
];
// Cechy startowe klas (JobInitialPoints Metin2: wojownik ST6 HT4 DX3 IQ3; zabójca ST4 HT3 DX6 IQ3; szaman ST3 HT3 DX4 IQ6). Życie i mana na starcie są już w hp0/mp0.
// limit jak w Metin2: każda cecha (start + wydane punkty) maks. 90
const STAT_MAX = 90;
const BASE_STATS = { knight: { str: 6, life: 4, dex: 3, mag: 3 }, scout: { str: 4, life: 3, dex: 6, mag: 3 }, mage: { str: 3, life: 3, dex: 4, mag: 6 } };
// lvl: poziom postaci (w Metin2 atak = 2×poziom + cechy, obrona = poziom + HT/1,25)
const statBonus = (st, cls, lvl) => {
  st = st || {}; const B = BASE_STATS[cls] || { str: 0, life: 0, dex: 0, mag: 0 };
  const L = (st.life || 0) + B.life, S = (st.str || 0) + B.str, I = (st.mag || 0) + B.mag, D = (st.dex || 0) + B.dex, lv = lvl || 0;
  const atk = cls === 'scout' ? (4 * S + 2 * D) / 3 : cls === 'mage' ? (4 * S + 2 * I) / 3 : 2 * S;
  return { hp: 40 * (st.life || 0), def: lv + L / 1.25, mp: 20 * (st.mag || 0), atk: atk + 2 * lv, mag: 2 * I + 2 * lv, dex: D, lvAtk: 2 * lv };
};
// rating trafienia i unik (CalcAttackRating z serwera Metin2)
const metinAR = (dx, lvl) => (Math.min(90, (4 * dx + 2 * lvl) / 6) + 210) / 300;
const metinER = (dx, lvl) => { const m = Math.min(90, (4 * dx + 2 * lvl) / 6); return ((m * 2 + 5) / (m + 95)) * 0.3; };

// KLASY: Rycerz (Miecz), Zwiadowca (Łuk), Mag (Różdżka). Mnożniki pochodzą z symulatora balansu (balance/params.json).
// Życie i mana na poziomie 1 zależą od klasy; każdy kolejny poziom daje +30 życia i +10 many (niezależnie od klasy).
const HP_PER_LEVEL = 30, MP_PER_LEVEL = 10;
const CLASSES = {
  knight: { n: 'Rycerz',    w: 'sword', ic: '🛡️', c: '#ff8a45', hp0: 770, mp0: 260, hp: 1.37, mp: 1.00, dmg: 1.06, def: 1.80,
    tag: 'Wojownik w zwarciu',
    desc: 'Walczysz mieczem w pierwszym szeregu. Najwięcej życia i obrony, stałe obrażenia i aury wzmacniające. Najtrudniej cię powalić.',
    pros: ['Najwięcej życia i obrony', 'Stabilne obrażenia, brak zależności od many', 'Aury Ataku i Obrony trwające do 3 minut'],
    cons: ['Najniższy rozrzut obrażeń (mały burst)', 'Wolniejsze zabijanie szybkich celów'] },
  scout: { n: 'Zwiadowca', w: 'bow',   ic: '🏹', c: '#4fe39a', hp0: 730, mp0: 260, hp: 1.05, mp: 1.00, dmg: 0.85, def: 0.50,
    tag: 'Łowca z dystansu',
    desc: 'Strzelasz z łuku, trafiasz w linii i w strefie. Najlepszy przy grupach i szybkim zabijaniu, ale kruchy.',
    pros: ['Najlepszy na grupy i szybkie cele', 'Szybka Strzała i obrażenia obszarowe', 'Ogromny burst na bossy (Fantomowy Strzał)'],
    cons: ['Najmniej obrony', 'Wymaga dobrego sprzętu i krytyków'] },
  mage: { n: 'Mag',       w: 'wand',  ic: '🔮', c: '#c58bff', hp0: 730, mp0: 300, hp: 1.10, mp: 1.57, dmg: 1.49, def: 0.50,
    tag: 'Kontroler z magią',
    desc: 'Rzucasz czary z różdżki. Najwięcej many, ładunki eteru i potężne detonacje. Najlepszy na bossów, zależny od many.',
    pros: ['Najwięcej many, najsilniejszy na bossów', 'Ładunki Eteru, detonacje i ogłuszenia', 'Nieskończona Mana na kluczowe momenty'],
    cons: ['Słaby bez many (zależny od niej)', 'Mało życia i słabsza obrona fizyczna'] },
};
