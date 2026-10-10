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
