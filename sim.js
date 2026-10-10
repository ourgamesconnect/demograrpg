// SYMULATOR SERWERA — jedyne źródło prawdy o ekwipunku.
// Klient wysyła wyłącznie KOMENDY (intencje) i rysuje to, co odeśle serwer.
// Ten sam kształt komend i odpowiedzi ma mieć prawdziwy serwer sieciowy (WebSocket/HTTP).
'use strict';
const INV_SLOTS = 48, STASH_MAX = 60;
const EQUIP_SLOTS = [
  { k: 'helm', n: 'Hełm', ic: '🪖' }, { k: 'armor', n: 'Zbroja', ic: '🥋' }, { k: 'boots', n: 'Buty', ic: '🥾' }, { k: 'weapon', n: 'Broń', ic: '🗡️' },
  { k: 'ring1', n: 'Pierścień', ic: '💍' }, { k: 'ring2', n: 'Pierścień', ic: '💍' }, { k: 'earrings', n: 'Kolczyki', ic: '💎' }, { k: 'bracelet', n: 'Bransoletka', ic: '📿' },
  { k: 'shield', n: 'Tarcza', ic: '🛡️' },
];
const TIERS = [['Drewniany', 'Drewniana', 'Drewniane'], ['Miedziany', 'Miedziana', 'Miedziane'], ['Brązowy', 'Brązowa', 'Brązowe'], ['Żelazny', 'Żelazna', 'Żelazne'], ['Hartowany', 'Hartowana', 'Hartowane'],
  ['Stalowy', 'Stalowa', 'Stalowe'], ['Damasceński', 'Damasceńska', 'Damasceńskie'], ['Mithrilowy', 'Mithrilowa', 'Mithrilowe'], ['Smoczy', 'Smocza', 'Smocze'], ['Legendarny', 'Legendarna', 'Legendarne']];
const RARITY = [
  { n: 'Zwykły', c: '#b8bdd0', m: 1.0 }, { n: 'Dobry', c: '#5ee08a', m: 1.04 }, { n: 'Rzadki', c: '#5aa9ff', m: 1.08 },
  { n: 'Wybitny', c: '#c58bff', m: 1.13 }, { n: 'Legendarny', c: '#ffb347', m: 1.20 },   // tymczasowo: rzadkość lekko podbija statystyki (docelowo: liczba bonusów)
];
// [nazwa, ikona, rodzaj gramatyczny 0=m 1=f 2=n/lm, typ slotu]
const BASES = [
  ['miecz', '🗡️', 0, 'weapon'], ['łuk', '🏹', 0, 'weapon'], ['różdżka', '🪄', 1, 'weapon'],
  ['hełm', '🪖', 0, 'helm'], ['zbroja', '🥋', 1, 'armor'], ['buty', '🥾', 2, 'boots'], ['tarcza', '🛡️', 1, 'shield'],
  // pozostałe przedmioty (pierścienie, kolczyki, bransoletka) zostały usunięte do czasu podania ich tabel przez właściciela
];
const ACTIVITY_NAMES = { exp: 'Wyprawy', gather: 'Zbieractwo', craft: 'Rzemiosło' };
// PLANSZE ZBIERACTWA (scalanie): dwa takie same surowce tego samego poziomu = jeden wyższego poziomu
// jeden surowiec co 5 minut (do testów można skrócić parametrem ?tempo=N w adresie, np. ?tempo=60 = co 5 s)
// odnowienie celu (boss, Spaczony Korzeń) po zabiciu: 30 minut (do testów skracane parametrem ?tempo=N)
const ENC_COOLDOWN_MS = Math.round(30 * 60 * 1000 / Math.max(1, parseFloat(new URLSearchParams(location.search).get('tempo')) || 1));
const BOARD_CELLS = 20, BOARD_MAXLVL = 9, GATHER_MAX = 100;
// czas jednego cyklu na poziomie 1 (5 minut); do testów skrócić parametrem ?tempo=N w adresie
const BOARD_EVERY_MS = Math.round(300000 / Math.max(1, parseFloat(new URLSearchParams(location.search).get('tempo')) || 1));
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];
// szansa udanego scalenia dwóch surowców w surowiec danego poziomu (przy porażce ginie przeciągany surowiec, docelowy zostaje)
const MERGE_P = { 2: 0.90, 3: 0.85, 4: 0.80, 5: 0.70, 6: 0.60, 7: 0.50, 8: 0.45, 9: 0.35 };
const BOARDS = {
  mining: { n: 'Górnictwo', types: [['Kamień', '🪨'], ['Ruda miedzi', '🟤'], ['Ruda żelaza', '⚙️'], ['Srebro', '⚪'], ['Złoto', '🟡']] },
  sawmill: { n: 'Tartak', types: [['Sosna', '🪵'], ['Dąb', '🌳'], ['Jesion', '🍃'], ['Cis', '🌿'], ['Heban', '⚫']] },
};
// Rodzaj surowca (A..E) zależnie od poziomu zbierania. D odblokowuje się od poziomu 15, E od 40.
const TYPE_ANCHORS = { 1: [90, 9, 1, 0, 0], 10: [80, 15, 5, 0, 0], 15: [75, 17, 8, 0, 0], 25: [68, 21, 9, 2, 0], 40: [57, 25, 13, 5, 0], 50: [48, 28, 16, 7, 1], 75: [34, 30, 22, 11, 3], 100: [25, 27, 24, 16, 8] };
// Poziom surowca przy dropie (I..VI) zależnie od poziomu zbierania.
const LEVEL_ANCHORS = { 1: [100, 0, 0, 0, 0, 0], 10: [89, 11, 0, 0, 0, 0], 25: [62, 28, 10, 0, 0, 0], 50: [55, 28, 12, 4, 1, 0], 75: [50, 28, 14, 6, 1.5, 0.5], 100: [42, 29, 17, 8, 3, 1] };
function interpAnchors(an, lvl) {
  const ks = Object.keys(an).map(Number).sort((x, y) => x - y), L = Math.max(1, Math.min(GATHER_MAX, lvl));
  let lo = ks[0], hi = ks[ks.length - 1]; for (const k of ks) { if (k <= L) lo = k; } for (const k of ks) { if (k >= L) { hi = k; break; } }
  if (lo === hi) return an[lo].slice(); const t = (L - lo) / (hi - lo); return an[lo].map((v, i) => v + (an[hi][i] - v) * t);
}
const gatherOdds = lvl => ({ types: interpAnchors(TYPE_ANCHORS, lvl), levels: interpAnchors(LEVEL_ANCHORS, lvl) });
// czas cyklu: 5:00 na poziomie 1, 2:30 na poziomie 100 (liniowo)
const gatherEvery = lvl => Math.round(BOARD_EVERY_MS * (1 - 0.5 * (Math.max(1, Math.min(GATHER_MAX, lvl)) - 1) / (GATHER_MAX - 1)));
const wpick = w => { const t = w.reduce((a, b) => a + b, 0); let q = Math.random() * t; for (let i = 0; i < w.length; i++) { q -= w[i]; if (q <= 0) return i; } return 0; };
const MATS = { 'Złom': '⚙️', 'Szmaty': '🧵', 'Drewno': '🪵', 'Skóra': '🟤', 'Ruda': '🪨', 'Części': '🔩', 'Zioła': '🌿', 'Mięso': '🍖' };

const Server = (() => {
  let uidSeq = 1000, version = 0;
  const done = new Map(); // cid -> odpowiedź (idempotencja: ta sama komenda nie wykona się dwa razy)
  const S = { slots: Array(INV_SLOTS).fill(null), items: {}, equip: {}, stash: [], mats: {}, gold: 0, lvl: 1, cls: null, loot: {}, mobFilter: {}, skills: {}, stats: { life: 0, mana: 0, str: 0, dex: 0, mag: 0 }, enc: {}, activity: null,
    boards: { mining: Array(BOARD_CELLS).fill(null), sawmill: Array(BOARD_CELLS).fill(null) }, lastDrop: { mining: 0, sawmill: 0 }, lost: { mining: 0, sawmill: 0 }, gatherLvl: { mining: 1, sawmill: 1 } };
  const rnd = (a, b) => a + Math.random() * (b - a), ri = (a, b) => Math.floor(rnd(a, b + 1));
  const pick = a => a[Math.floor(Math.random() * a.length)];

  function makeItem(opt = {}) {
    let b = opt.base || pick(BASES);
    if (b[3] === 'weapon') { const kk = b[0] === 'miecz' ? 'sword' : b[0] === 'łuk' ? 'bow' : 'wand'; if (!WEAPON_AVAILABLE[kk]) b = BASES.find(q => q[0] === 'miecz'); }   // na razie istnieje tylko miecz
    if (!opt.base && b[3] === 'weapon' && S.cls) { const wn = { sword: 'miecz', bow: 'łuk', wand: 'różdżka' }[CLASSES[S.cls].w]; b = BASES.find(q => q[0] === wn); }   // drop broni tylko dla klasy gracza
    const r = opt.rarity !== undefined ? opt.rarity : (() => { const x = Math.random() * 100; return x < 58 ? 0 : x < 82 ? 1 : x < 94 ? 2 : x < 99 ? 3 : 4; })();
    const tierRaw = Math.max(0, Math.min(9, opt.tier !== undefined ? opt.tier : Math.floor(Math.random() * Math.random() * 10)));
    const isWeapon = b[3] === 'weapon', kind = b[0] === 'miecz' ? 'sword' : b[0] === 'łuk' ? 'bow' : b[0] === 'różdżka' ? 'wand' : null;
    const isArmor = !!ARMOR_TABLE[b[3]];
    const tier = isWeapon ? Math.min(tierRaw, WEAPON_LEVELS.length - 1) : isArmor ? Math.min(tierRaw, ARMOR_TABLE[b[3]].length - 1) : tierRaw;       // broń i zbroja: tylko dostępne etapy
    const ARMOR_BASE = [1, 15, 35, 60, 95, 140, 195, 260, 335, 420], LV10 = [1, 10, 20, 30, 40, 50, 60, 70, 80, 90];
    const lvl = isWeapon ? WEAPON_LEVELS[tier] : LV10[tier];   // zbroja Drewniana: poziom 1
    const sw = ARMOR_BASE[tier], rm = 1;   // wartości z tabel właściciela bez podbicia rzadkością (rzadkość = liczba bonusów, później)
    const slotW = { helm: 0.4, armor: 0.6, boots: 0.35, ring: 0.2, earrings: 0.2, bracelet: 0.2 }[b[3]] || 0.3;
    const st = isWeapon ? weaponStats(kind, tier, 0) : { atk: 0, mag: 0 };
    const it = { uid: 'i' + (uidSeq++), name: isWeapon ? WEAPON_NAMES[kind][tier] : isArmor ? ARMOR_NAMES[b[3]][tier] : TIERS[tier][b[2]] + ' ' + b[0], ic: b[1], type: b[3], kind, tier, rarity: r, rm, plus: 0,
      atk: Math.round(st.atk * rm), mag: Math.round(st.mag * rm), def: isWeapon ? 0 : isArmor ? Math.round(ARMOR_TABLE[b[3]][tier][0] * rm) : Math.max(1, Math.round(sw * slotW * rm)), req: lvl };
    const power = it.atk + Math.round(it.mag * 0.5) + it.def;
    it.value = Math.max(2, Math.round(power * 3.2));
    return it;
  }
  const freeSlot = () => S.slots.indexOf(null);
  function putNew(it) { // plecak -> skrytka (limit) -> a gdy i ona pełna, przedmiot jest automatycznie sprzedawany (gracz dostaje złoto, nic nie przepada bez śladu)
    const i = freeSlot();
    if (i >= 0) { S.items[it.uid] = it; S.slots[i] = it.uid; return { uid: it.uid, where: 'bag', slot: i }; }
    if (S.stash.length < STASH_MAX) { S.items[it.uid] = it; S.stash.push(it.uid); return { uid: it.uid, where: 'stash' }; }
    S.gold += it.value; return { uid: it.uid, where: 'sold', gold: it.value, name: it.name, ic: it.ic };
  }
  const slotOfType = t => t === 'ring' ? ['ring1', 'ring2'] : [t];
  const find = uid => { const i = S.slots.indexOf(uid); if (i >= 0) return { w: 'bag', i }; const k = Object.keys(S.equip).find(q => S.equip[q] === uid); if (k) return { w: 'equip', k }; const s = S.stash.indexOf(uid); if (s >= 0) return { w: 'stash', s }; return null; };

  const H = {
    move({ from, to }) {
      if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < 0 || from >= INV_SLOTS || to >= INV_SLOTS) return { err: 'Nieprawidłowe pole' };
      if (!S.slots[from]) return { err: 'Puste pole źródłowe' };
      if (from === to) return { ev: [] };
      [S.slots[from], S.slots[to]] = [S.slots[to], S.slots[from]]; return { ev: [{ t: 'moved', from, to }] };
    },
    equip({ uid }) {
      if (S.activity && S.activity.kind === 'exp') return { err: 'Podczas wyprawy nie można zmieniać ekwipunku. Zatrzymaj wyprawę.' };
      const f = find(uid); if (!f || f.w !== 'bag') return { err: 'Przedmiot nie jest w plecaku' };
      const it = S.items[uid]; if (!S.cls) return { err: 'Najpierw wybierz klasę' };
      if (it.type === 'weapon' && it.kind !== CLASSES[S.cls].w) return { err: 'Tę broń może nosić tylko inna klasa' };
      if (it.req > S.lvl) return { err: `Wymagany poziom ${it.req}` };
      const opts = slotOfType(it.type); let slot = opts.find(k => !S.equip[k]) || opts[0];
      const old = S.equip[slot]; S.equip[slot] = uid; S.slots[f.i] = old || null;
      return { ev: [{ t: 'equipped', uid, slot, swapped: old || null }] };
    },
    unequip({ slot }) {
      if (S.activity && S.activity.kind === 'exp') return { err: 'Podczas wyprawy nie można zmieniać ekwipunku. Zatrzymaj wyprawę.' };
      const uid = S.equip[slot]; if (!uid) return { err: 'Slot jest pusty' };
      const i = freeSlot(); if (i < 0) return { err: 'Plecak jest pełny' };
      S.slots[i] = uid; delete S.equip[slot]; return { ev: [{ t: 'unequipped', uid, slot, to: i }] };
    },
    sell({ uid }) {
      const f = find(uid); if (!f || f.w === 'equip') return { err: 'Nie można sprzedać tego przedmiotu' };
      const it = S.items[uid]; S.gold += it.value;
      if (f.w === 'bag') S.slots[f.i] = null; else S.stash.splice(f.s, 1);
      delete S.items[uid]; return { ev: [{ t: 'sold', uid, gold: it.value }] };
    },
    claim({ uid }) {
      const s = S.stash.indexOf(uid); if (s < 0) return { err: 'Brak w skrytce' };
      const i = freeSlot(); if (i < 0) return { err: 'Plecak jest pełny' };
      S.stash.splice(s, 1); S.slots[i] = uid; return { ev: [{ t: 'claimed', uid, to: i }] };
    },
    sort() {
      const ids = S.slots.filter(Boolean).sort((a, b) => { const x = S.items[a], y = S.items[b]; return x.type.localeCompare(y.type) || y.rarity - x.rarity || y.tier - x.tier || a.localeCompare(b); });
      S.slots = ids.concat(Array(INV_SLOTS - ids.length).fill(null)); return { ev: [{ t: 'sorted' }] };
    },
    // BLOKADA: postać robi naraz tylko jedną rzecz. Zmiana wymaga najpierw zatrzymania bieżącej aktywności.
    // CELE NA MAPIE (boss, Spaczony Korzeń): stany ready -> queued -> active -> (po zabiciu) ready z odnowieniem
    // Nieudana próba (śmierć, zatrzymanie wyprawy, rozłączenie) wraca do ready BEZ odnowienia.
    encounter_call({ map, kind }) {
      if (!S.activity || S.activity.kind !== 'exp') return { err: 'Rozpocznij wyprawę, aby wywołać cel' };
      if (!['boss', 'target'].includes(kind) || typeof map !== 'string' || map.length > 20) return { err: 'Nieprawidłowy cel' };
      const k = map + ':' + kind, e = S.enc[k] || (S.enc[k] = { st: 'ready', cd: 0 }), now = Date.now();
      if (e.cd > now) return { err: 'Odnowienie: jeszcze ' + Math.ceil((e.cd - now) / 1000) + ' s' };
      if (Object.values(S.enc).some(q => q.st === 'queued' || q.st === 'active')) return { err: 'Inny cel jest już wywołany' };
      e.st = 'queued'; return { ev: [{ t: 'encounter_called', map, kind }] };
    },
    encounter_spawn({ map, kind }) {
      const e = S.enc[map + ':' + kind]; if (!e || e.st !== 'queued') return { err: 'Cel nie jest wywołany' };
      e.st = 'active'; return { ev: [{ t: 'encounter_spawned', map, kind }] };
    },
    encounter_abort() {
      let n = 0; for (const e of Object.values(S.enc)) if (e.st === 'queued' || e.st === 'active') { e.st = 'ready'; n++; }
      return { ev: n ? [{ t: 'encounter_aborted', n }] : [] };   // idempotentne
    },
    activity_start({ kind, detail = '' }) {
      if (!ACTIVITY_NAMES[kind]) return { err: 'Nieznana aktywność' };
      if (S.activity) {
        const a = S.activity;
        return { err: a.kind === kind ? `${ACTIVITY_NAMES[kind]} już trwa. Zatrzymaj, aby zmienić.` : `Jesteś zajęty: ${ACTIVITY_NAMES[a.kind]}. Zatrzymaj, aby zacząć ${ACTIVITY_NAMES[kind].toLowerCase()}.` };
      }
      if (kind === 'gather' && !BOARDS[detail]) return { err: 'Nieznana lokacja zbierania' };
      if (kind === 'exp' && Object.keys(S.loot).length) return { err: 'Najpierw odbierz lub sprzedaj łup z poprzedniej wyprawy' };
      for (const e of Object.values(S.enc)) if (e.st === 'queued' || e.st === 'active') e.st = 'ready';   // odzyskanie stanu po rozłączeniu
      S.activity = { kind, detail: String(detail).slice(0, 60), since: Date.now() };
      return { ev: [{ t: 'activity_started', kind, detail: S.activity.detail }] };
    },
    activity_stop() {
      if (!S.activity) return { ev: [] }; // zatrzymanie jest idempotentne
      for (const e of Object.values(S.enc)) if (e.st === 'queued' || e.st === 'active') e.st = 'ready';   // cel „ucieka", bez odnowienia
      const k = S.activity.kind; S.activity = null; return { ev: [{ t: 'activity_stopped', kind: k }] };
    },
    // WYBÓR KLASY (jednorazowy): Rycerz / Zwiadowca / Mag. Tworzy i zakłada zestaw startowy klasy.
    class_choose({ cls }) {
      if (S.cls) return { err: 'Klasa została już wybrana' };
      if (!CLASSES[cls]) return { err: 'Nieznana klasa' };
      if (!WEAPON_AVAILABLE[CLASSES[cls].w]) return { err: 'Ta klasa będzie dostępna wkrótce' };
      S.cls = cls; const ev = [{ t: 'class_chosen', cls }];
      const wn = { sword: 'miecz', bow: 'łuk', wand: 'różdżka' }[CLASSES[cls].w], base = n => BASES.find(b => b[0] === n);
      for (const n of [wn]) {   // postać zaczyna wyłącznie z bronią 1 poziomu +0
        const it = makeItem({ base: base(n), tier: 0, rarity: 0 }); it.req = 1; S.items[it.uid] = it;
        const slot = it.type === 'ring' ? 'ring1' : it.type; S.equip[slot] = it.uid;
        ev.push({ t: 'item_added', uid: it.uid, where: 'equip', slot });
      }
      return { ev };
    },
    // testowo: nowa postać (docelowo: tworzenie nowej postaci na koncie)
    class_reset() {
      S.cls = null; S.loot = {}; S.mobFilter = {}; S.lvl = 1; S.gold = 150; S.skills = {}; S.stats = { life: 0, mana: 0, str: 0, dex: 0, mag: 0 };
      S.items = {}; S.equip = {}; S.slots = Array(INV_SLOTS).fill(null); S.stash = []; S.mats = {}; S.gold = 0; S.enc = {}; S.activity = null; S.starter = false;
      return { ev: [{ t: 'class_reset' }] };
    },
    // Awans: tymczasowo zgłasza klient (docelowo poziom liczy serwer z EXP za zabicia). Poziom może tylko rosnąć i max o 5 naraz.
    sync_level({ lvl }) {
      if (!Number.isInteger(lvl) || lvl < S.lvl || lvl > S.lvl + 5 || lvl > 99) return { err: 'Nieprawidłowy poziom' };
      if (lvl === S.lvl) return { ev: [] }; S.lvl = lvl; return { ev: [{ t: 'level', lvl }] };
    },
    // Umiejętności: 1 punkt za każdy poziom od 2; ranga 1–20; ranga ograniczona poziomem postaci
    skill_up({ id }) {
      const sk = SKILLS.find(x => x.id === id); if (!sk) return { err: 'Nieznana umiejętność' };
      if (!S.cls) return { err: 'Najpierw wybierz klasę' };
      if (sk.w !== CLASSES[S.cls].w) return { err: 'Ta umiejętność należy do innej klasy' };
      const spent = Object.values(S.skills).reduce((a, b) => a + b, 0), points = S.lvl - 1 - spent;
      const cur = S.skills[id] || 0;
      if (cur >= SKILL_MAX) return { err: 'Maksymalna ranga' };
      if (points < 1) return { err: 'Brak punktów umiejętności' };
      S.skills[id] = cur + 1; return { ev: [{ t: 'skill_up', id, rank: cur + 1 }] };
    },
    skill_reset() { S.skills = {}; return { ev: [{ t: 'skill_reset' }] }; },
    // Punkty statusu: 3 za każdy poziom od 2; serwer pilnuje puli
    stat_add({ stat, n = 1 }) {
      if (!STATS.some(q => q.k === stat)) return { err: 'Nieznana cecha' };
      n = Math.floor(+n); if (!Number.isFinite(n) || n < 1 || n > 300) return { err: 'Nieprawidłowa liczba punktów' };
      const spent = Object.values(S.stats).reduce((a, b) => a + b, 0), left = STAT_PER_LEVEL * (S.lvl - 1) - spent;
      if (left < 1) return { err: 'Brak punktów statusu' };
      const add = Math.min(n, left); S.stats[stat] += add; return { ev: [{ t: 'stat_add', stat, n: add }] };
    },
    // TORBA ŁUPU: odbiór do plecaka (lub skrytki) albo szybka sprzedaż. Wszystko liczy serwer.
    loot_claim({ key, n }) {
      const e = S.loot[key]; if (!e) return { err: 'Brak takiego łupu' };
      const space = S.slots.filter(q => q === null).length + (STASH_MAX - S.stash.length);
      const take = Math.min(e.qty, n === undefined ? e.qty : Math.max(1, Math.floor(+n) || 1), space);
      if (take < 1) return { err: 'Brak miejsca w plecaku i skrytce' };
      const ev = [];
      for (let i = 0; i < take; i++) { const it = { ...e.it, uid: 'i' + (uidSeq++) }; ev.push({ t: 'item_added', ...putNew(it) }); }
      e.qty -= take; if (e.qty <= 0) delete S.loot[key];
      ev.push({ t: 'loot_claimed', key, n: take }); return { ev };
    },
    loot_sell({ key, n }) {
      const e = S.loot[key]; if (!e) return { err: 'Brak takiego łupu' };
      const take = Math.min(e.qty, n === undefined ? e.qty : Math.max(1, Math.floor(+n) || 1)), gold = take * e.it.value;
      S.gold += gold; e.qty -= take; if (e.qty <= 0) delete S.loot[key];
      return { ev: [{ t: 'loot_sold', key, n: take, gold }] };
    },
    loot_claim_all() {
      const ev = []; let any = false;
      for (const key of Object.keys(S.loot)) { const r = H.loot_claim({ key }); if (r.ev) { any = true; ev.push(...r.ev); } }
      return any ? { ev } : { err: Object.keys(S.loot).length ? 'Brak miejsca w plecaku i skrytce' : 'Torba łupu jest pusta' };
    },
    loot_sell_all() {
      const ev = []; for (const key of Object.keys(S.loot)) { const r = H.loot_sell({ key }); ev.push(...r.ev); }
      return ev.length ? { ev } : { err: 'Torba łupu jest pusta' };
    },
    // wybór potworów na mapie (co najmniej jeden)
    mob_filter({ map, ids }) {
      if (typeof map !== 'string' || !Array.isArray(ids) || !ids.length || ids.length > 10) return { err: 'Zły wybór potworów' };
      const u = [...new Set(ids.map(v => v | 0))].filter(v => v >= 0 && v < 10).sort((a, b) => a - b);
      if (!u.length) return { err: 'Zły wybór potworów' };
      S.mobFilter[map] = u; return { ev: [{ t: 'mob_filter', map, ids: u }] };
    },
    stat_reset() { for (const q of STATS) S.stats[q.k] = 0; return { ev: [{ t: 'stat_reset' }] }; },   // testowo (docelowo płatny reset)   // testowo (docelowo płatny reset)
    // Zbieractwo: serwer sam liczy, ile surowców spadło od ostatniego razu (klient nie może przyspieszyć)
    gather_tick() {
      const a = S.activity; if (!a || a.kind !== 'gather' || !BOARDS[a.detail]) return { err: 'Brak aktywnego zbierania' };
      const b = a.detail, def = BOARDS[b], now = Date.now(), lvl = S.gatherLvl[b], every = gatherEvery(lvl);
      if (!S.lastDrop[b] || S.lastDrop[b] < a.since) S.lastDrop[b] = a.since;
      const due = Math.min(BOARD_CELLS, Math.floor((now - S.lastDrop[b]) / every)); if (due <= 0) return { ev: [] };
      S.lastDrop[b] += due * every; const ev = [], odds = gatherOdds(lvl);
      for (let k = 0; k < due; k++) {
        const ti = wpick(odds.types), t = def.types[ti], lv = wpick(odds.levels) + 1, i = S.boards[b].indexOf(null);
        if (i < 0) { S.lost[b]++; ev.push({ t: 'board_lost', board: b }); continue; } // plansza pełna: surowiec przepada
        S.boards[b][i] = { t: t[0], l: lv }; ev.push({ t: 'board_drop', board: b, idx: i, type: t[0], lvl: lv });
      }
      return { ev };
    },
    board_move({ board, from, to }) {
      const B = S.boards[board]; if (!B) return { err: 'Nieznana plansza' };
      if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < 0 || from >= BOARD_CELLS || to >= BOARD_CELLS) return { err: 'Nieprawidłowe pole' };
      if (!B[from]) return { err: 'Puste pole' }; if (from === to) return { ev: [] };
      const a = B[from], c = B[to];
      if (c && c.t === a.t && c.l === a.l) {
        if (a.l >= BOARD_MAXLVL) return { err: 'Maksymalny poziom surowca' };
        const p = MERGE_P[a.l + 1];
        if (Math.random() < p) { B[to] = { t: a.t, l: a.l + 1 }; B[from] = null; return { ev: [{ t: 'board_merged', board, idx: to, type: a.t, lvl: a.l + 1, chance: p }] }; }
        B[from] = null; // porażka: ginie przeciągany surowiec, docelowy zostaje
        return { ev: [{ t: 'board_merge_failed', board, from, to, type: a.t, lvl: a.l, chance: p }] };
      }
      B[to] = a; B[from] = c || null; return { ev: [{ t: 'board_moved', board, from, to }] };
    },
    board_take({ board, idx }) {
      const B = S.boards[board]; if (!B) return { err: 'Nieznana plansza' };
      if (!Number.isInteger(idx) || idx < 0 || idx >= BOARD_CELLS || !B[idx]) return { err: 'Puste pole' };
      const it = B[idx], name = it.t + ' ' + ROMAN[it.l]; B[idx] = null; S.mats[name] = (S.mats[name] || 0) + 1;
      return { ev: [{ t: 'board_taken', board, idx, name }] };
    },
    // testowo: książki podnoszące poziom zbierania (docelowo wypadają z potworów i bossów)
    gather_level_dev({ board, delta = 1 }) {
      if (!BOARDS[board]) return { err: 'Nieznana plansza' }; if (!Number.isFinite(+delta)) return { err: 'Zła wartość' };
      S.gatherLvl[board] = Math.max(1, Math.min(GATHER_MAX, Math.floor(S.gatherLvl[board] + (+delta)))); return { ev: [{ t: 'gather_level', board, lvl: S.gatherLvl[board] }] };
    },
    board_debug_fill({ board, n = 5 }) {
      const def = BOARDS[board]; if (!def) return { err: 'Nieznana plansza' }; const ev = [];
      for (let k = 0; k < n; k++) { const i = S.boards[board].indexOf(null); if (i < 0) break; const t = pick(def.types); S.boards[board][i] = { t: t[0], l: Math.random() < 0.7 ? 1 : 2 }; ev.push({ t: 'board_drop', board, idx: i, type: t[0], lvl: S.boards[board][i].l }); }
      return { ev };
    },
    // łup za zabicie potwora: losuje serwer (klient tylko pokazuje wynik)
    kill_reward({ tier = 0, kind = 'mob', map, lvl = 1 }) {
      if (!S.activity || S.activity.kind !== 'exp') return { err: 'Brak aktywnej wyprawy' };
      if (kind !== 'mob') {   // łup z bossa lub celu wymaga wywołanego (aktywnego) celu; po zabiciu startuje odnowienie
        const e = S.enc[String(map) + ':' + kind];
        if (!e || e.st !== 'active') return { err: 'Brak wywołanego celu' };
        e.st = 'ready'; e.cd = Date.now() + ENC_COOLDOWN_MS;
      }
      const t = Math.max(0, Math.min(9, Math.floor(+tier) || 0)), ev = [];
      const rollR = () => { const x = Math.random() * 100; return kind === 'boss' ? (x < 45 ? 2 : x < 85 ? 3 : 4) : kind === 'target' ? (x < 50 ? 1 : x < 82 ? 2 : x < 96 ? 3 : 4) : (x < 70 ? 0 : x < 90 ? 1 : x < 98 ? 2 : 3); };
      // łup z mapy: drewniane EQ +0/+1 (MAP_DROPS) trafia do TORBY ŁUPU (stosy), gracz odbiera go po wyprawie
      const dr = MAP_DROPS[String(map)];
      if (dr && S.cls && kind === 'mob') {
        const wn = { sword: 'miecz', bow: 'łuk', wand: 'różdżka' }[CLASSES[S.cls].w], nameOf = { weapon: wn, helm: 'hełm', armor: 'zbroja', boots: 'buty', shield: 'tarcza' };
        const pc = dr.mob[Math.max(1, Math.min(5, Math.floor(+lvl) || 1))] || 0;
        for (const part of dr.parts) {
          if (Math.random() >= pc) continue;
          const it = makeItem({ base: BASES.find(q => q[0] === nameOf[part]), tier: 0, rarity: 0 }); it.plus = Math.random() < dr.plus1 ? 1 : 0;
          const st = itemStats(it); it.value = Math.max(2, Math.round((st.atk + st.mag * 0.5 + st.def) * 3.2));
          const key = it.name + '|' + it.plus, tpl = { ...it }; delete tpl.uid;
          const e = S.loot[key] || (S.loot[key] = { key, it: tpl, qty: 0 }); e.qty++;
          ev.push({ t: 'loot_added', key, name: it.name, ic: it.ic, plus: it.plus, qty: e.qty });
        }
      }
      const mats = Object.keys(MATS), cnt = 0;
      for (let k = 0; k < cnt; k++) { const m = pick(mats), q = ri(1, kind === 'mob' ? 3 : 7); S.mats[m] = (S.mats[m] || 0) + q; ev.push({ t: 'mat_added', mat: m, qty: q }); }
      return { ev };
    },
    // test: serwer losuje łup (w prawdziwej grze to wynik walki liczony po stronie serwera)
    debug_drop({ n = 1, boss = false }) {
      const ev = [];
      for (let k = 0; k < n; k++) { const it = makeItem(boss ? { rarity: ri(2, 4), tier: ri(2, 4) } : {}); ev.push({ t: 'item_added', ...putNew(it) }); }
      const m = pick(Object.keys(MATS)), q = ri(1, boss ? 9 : 4); S.mats[m] = (S.mats[m] || 0) + q; ev.push({ t: 'mat_added', mat: m, qty: q });
      return { ev };
    },
  };

  function invariants() {
    const errs = [], seen = new Map(), add = (uid, where) => { if (!uid) return; if (seen.has(uid)) errs.push(`duplikat ${uid}: ${seen.get(uid)} i ${where}`); seen.set(uid, where); };
    if (S.slots.length !== INV_SLOTS) errs.push('zła liczba pól');
    S.slots.forEach((u, i) => add(u, 'plecak#' + i)); Object.entries(S.equip).forEach(([k, u]) => add(u, 'equip:' + k)); S.stash.forEach(u => add(u, 'skrytka'));
    for (const u of seen.keys()) if (!S.items[u]) errs.push(`brak definicji ${u}`);
    for (const u of Object.keys(S.items)) if (!seen.has(u)) errs.push(`osierocony ${u}`);
    for (const [k, u] of Object.entries(S.equip)) { const it = S.items[u]; if (it && !slotOfType(it.type).includes(k)) errs.push(`zły slot ${k} dla ${it.type}`); }
    if (!Number.isInteger(S.gold) || S.gold < 0) errs.push('złoto');
    if (S.cls !== null && !CLASSES[S.cls]) errs.push('zła klasa');
    for (const [k, e] of Object.entries(S.loot)) if (!e || !Number.isInteger(e.qty) || e.qty < 1 || !e.it) errs.push('łup ' + k);
    { let st = 0; for (const q of STATS) { const v = S.stats[q.k]; if (!Number.isInteger(v) || v < 0) errs.push('cecha ' + q.k); st += v; } if (st > STAT_PER_LEVEL * (S.lvl - 1)) errs.push('więcej punktów statusu niż przyznano'); }
    { let sum = 0; for (const [id, rk] of Object.entries(S.skills)) { const sk = SKILLS.find(x => x.id === id); if (!sk || !Number.isInteger(rk) || rk < 0 || rk > SKILL_MAX) errs.push('ranga umiejętności ' + id); sum += rk; } if (sum > S.lvl - 1) errs.push('więcej rang niż punktów'); }
    for (const b of Object.keys(BOARDS)) { const L = S.gatherLvl[b]; if (!Number.isInteger(L) || L < 1 || L > GATHER_MAX) errs.push('poziom zbierania ' + b); }
    for (const [b, B] of Object.entries(S.boards)) { if (B.length !== BOARD_CELLS) errs.push('plansza ' + b + ': zła liczba pól'); B.forEach((c, i) => { if (c && (!BOARDS[b].types.some(t => t[0] === c.t) || !Number.isInteger(c.l) || c.l < 1 || c.l > BOARD_MAXLVL)) errs.push(`plansza ${b}#${i}: zły surowiec`); }); }
    if (Object.values(S.enc).filter(q => q.st === 'queued' || q.st === 'active').length > 1) errs.push('więcej niż jeden wywołany cel');
    if (S.activity !== null && !(S.activity && ACTIVITY_NAMES[S.activity.kind])) errs.push('zła aktywność');
    return errs;
  }
  const snap = () => JSON.parse(JSON.stringify({ version, ...S }));
  function execSync(cmd) {
    if (cmd.cid && done.has(cmd.cid)) return done.get(cmd.cid);
    const h = H[cmd.type]; let res;
    if (!h) res = { ok: false, error: 'Nieznana komenda' };
    else { const before = JSON.stringify(S), r = h(cmd); if (r.err) res = { ok: false, error: r.err, version, snapshot: snap() }; else { version++; res = { ok: true, events: r.ev || [], version, snapshot: snap() }; const bad = invariants(); if (bad.length) { const o = JSON.parse(before); Object.assign(S, o); version--; res = { ok: false, error: 'Błąd spójności (cofnięto): ' + bad[0], version, snapshot: snap() }; } } }
    if (cmd.cid) { done.set(cmd.cid, res); if (done.size > 500) done.delete(done.keys().next().value); }
    return res;
  }
  // „sieć": opóźnienie 60–160 ms, komendy obsługiwane po kolei
  const send = cmd => new Promise(res => setTimeout(() => res(execSync(cmd)), 60 + Math.random() * 100));
  return { send, execSync, snapshot: snap, invariants, makeItem, STASH_MAX, ENC_COOLDOWN_MS, BOARDS, ROMAN, BOARD_CELLS, BOARD_MAXLVL, BOARD_EVERY_MS, MERGE_P, GATHER_MAX, gatherOdds, gatherEvery };
})();
