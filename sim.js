// SYMULATOR SERWERA — jedyne źródło prawdy o ekwipunku.
// Klient wysyła wyłącznie KOMENDY (intencje) i rysuje to, co odeśle serwer.
// Ten sam kształt komend i odpowiedzi ma mieć prawdziwy serwer sieciowy (WebSocket/HTTP).
'use strict';
const INV_SLOTS = 48, STASH_MAX = 60;
const EQUIP_SLOTS = [
  { k: 'helm', n: 'Hełm', ic: '🪖' }, { k: 'armor', n: 'Zbroja', ic: '🥋' }, { k: 'boots', n: 'Buty', ic: '🥾' }, { k: 'weapon', n: 'Broń', ic: '🗡️' },
  { k: 'ring1', n: 'Pierścień', ic: '💍' }, { k: 'ring2', n: 'Pierścień', ic: '💍' }, { k: 'earrings', n: 'Kolczyki', ic: '💎' }, { k: 'bracelet', n: 'Bransoletka', ic: '📿' },
];
const TIERS = [['Drewniany', 'Drewniana', 'Drewniane'], ['Miedziany', 'Miedziana', 'Miedziane'], ['Żelazny', 'Żelazna', 'Żelazne'], ['Stalowy', 'Stalowa', 'Stalowe'], ['Hartowany', 'Hartowana', 'Hartowane']];
const RARITY = [
  { n: 'Zwykły', c: '#b8bdd0', m: 1.0 }, { n: 'Dobry', c: '#5ee08a', m: 1.18 }, { n: 'Rzadki', c: '#5aa9ff', m: 1.4 },
  { n: 'Wybitny', c: '#c58bff', m: 1.75 }, { n: 'Legendarny', c: '#ffb347', m: 2.3 },
];
// [nazwa, ikona, rodzaj gramatyczny 0=m 1=f 2=n/lm, typ slotu]
const BASES = [
  ['miecz', '🗡️', 0, 'weapon'], ['topór', '🪓', 0, 'weapon'], ['włócznia', '🔱', 1, 'weapon'], ['łuk', '🏹', 0, 'weapon'], ['młot', '🔨', 0, 'weapon'], ['sztylet', '🔪', 0, 'weapon'],
  ['hełm', '🪖', 0, 'helm'], ['kaptur', '🧢', 0, 'helm'], ['kolczuga', '🥋', 1, 'armor'], ['kaftan', '🧥', 0, 'armor'],
  ['buty', '🥾', 2, 'boots'], ['kolczyki', '💎', 2, 'earrings'], ['bransoleta', '📿', 1, 'bracelet'], ['pierścień', '💍', 0, 'ring'],
];
const ACTIVITY_NAMES = { exp: 'Wyprawy', gather: 'Zbieractwo', craft: 'Rzemiosło' };
const MATS = { 'Złom': '⚙️', 'Szmaty': '🧵', 'Drewno': '🪵', 'Skóra': '🟤', 'Ruda': '🪨', 'Części': '🔩', 'Zioła': '🌿', 'Mięso': '🍖' };

const Server = (() => {
  const PLAYER_LVL = 27;
  let uidSeq = 1000, version = 0;
  const done = new Map(); // cid -> odpowiedź (idempotencja: ta sama komenda nie wykona się dwa razy)
  const S = { slots: Array(INV_SLOTS).fill(null), items: {}, equip: {}, stash: [], mats: { 'Złom': 14, 'Szmaty': 9, 'Skóra': 4 }, gold: 128450, activity: null };
  const rnd = (a, b) => a + Math.random() * (b - a), ri = (a, b) => Math.floor(rnd(a, b + 1));
  const pick = a => a[Math.floor(Math.random() * a.length)];

  function makeItem(opt = {}) {
    const b = opt.base || pick(BASES);
    const r = opt.rarity !== undefined ? opt.rarity : (() => { const x = Math.random() * 100; return x < 58 ? 0 : x < 82 ? 1 : x < 94 ? 2 : x < 99 ? 3 : 4; })();
    const tier = opt.tier !== undefined ? opt.tier : Math.min(4, Math.floor(Math.random() * Math.random() * 5));
    const isWeapon = b[3] === 'weapon', power = Math.round(8 * Math.pow(1.9, tier) * RARITY[r].m * rnd(0.92, 1.08));
    const it = { uid: 'i' + (uidSeq++), name: TIERS[tier][b[2]] + ' ' + b[0], ic: b[1], type: b[3], tier, rarity: r, plus: 0,
      atk: isWeapon ? power : 0, def: isWeapon ? 0 : Math.round(power * (b[3] === 'ring' || b[3] === 'earrings' || b[3] === 'bracelet' ? 0.4 : 0.8)), req: 1 + tier * 12 + r * 2 };
    it.value = Math.round(power * 3.2 * (1 + it.plus * 0.2));
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
      const f = find(uid); if (!f || f.w !== 'bag') return { err: 'Przedmiot nie jest w plecaku' };
      const it = S.items[uid]; if (it.req > PLAYER_LVL) return { err: `Wymagany poziom ${it.req}` };
      const opts = slotOfType(it.type); let slot = opts.find(k => !S.equip[k]) || opts[0];
      const old = S.equip[slot]; S.equip[slot] = uid; S.slots[f.i] = old || null;
      return { ev: [{ t: 'equipped', uid, slot, swapped: old || null }] };
    },
    unequip({ slot }) {
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
    activity_start({ kind, detail = '' }) {
      if (!ACTIVITY_NAMES[kind]) return { err: 'Nieznana aktywność' };
      if (S.activity) {
        const a = S.activity;
        return { err: a.kind === kind ? `${ACTIVITY_NAMES[kind]} już trwa. Zatrzymaj, aby zmienić.` : `Jesteś zajęty: ${ACTIVITY_NAMES[a.kind]}. Zatrzymaj, aby zacząć ${ACTIVITY_NAMES[kind].toLowerCase()}.` };
      }
      S.activity = { kind, detail: String(detail).slice(0, 60), since: Date.now() };
      return { ev: [{ t: 'activity_started', kind, detail: S.activity.detail }] };
    },
    activity_stop() {
      if (!S.activity) return { ev: [] }; // zatrzymanie jest idempotentne
      const k = S.activity.kind; S.activity = null; return { ev: [{ t: 'activity_stopped', kind: k }] };
    },
    // łup za zabicie potwora: losuje serwer (klient tylko pokazuje wynik)
    kill_reward({ tier = 0, kind = 'mob' }) {
      if (!S.activity || S.activity.kind !== 'exp') return { err: 'Brak aktywnej wyprawy' };
      const t = Math.max(0, Math.min(4, Math.floor(+tier) || 0)), ev = [];
      const rollR = () => { const x = Math.random() * 100; return kind === 'boss' ? (x < 45 ? 2 : x < 85 ? 3 : 4) : kind === 'target' ? (x < 50 ? 1 : x < 82 ? 2 : x < 96 ? 3 : 4) : (x < 70 ? 0 : x < 90 ? 1 : x < 98 ? 2 : 3); };
      const n = kind === 'boss' ? ri(2, 3) : kind === 'target' ? 1 : (Math.random() < 0.16 ? 1 : 0);
      for (let k = 0; k < n; k++) ev.push({ t: 'item_added', ...putNew(makeItem({ tier: Math.min(4, t + (Math.random() < 0.3 ? 1 : 0)), rarity: rollR() })) });
      const mats = Object.keys(MATS), cnt = kind === 'mob' ? (Math.random() < 0.6 ? 1 : 0) : 2;
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
    if (S.activity !== null && !(S.activity && ACTIVITY_NAMES[S.activity.kind])) errs.push('zła aktywność');
    return errs;
  }
  const snap = () => JSON.parse(JSON.stringify({ version, ...S, lvl: PLAYER_LVL }));
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
  return { send, execSync, snapshot: snap, invariants, makeItem, STASH_MAX };
})();
