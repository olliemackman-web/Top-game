import {
  BUILDINGS, BY_ID, TROOPS, costFor, tierOf, SAVE_KEY, OFFLINE_CAP, rateFor,
} from './config.js';

export const S = {
  res: { gold: 320, wood: 180, stone: 90, food: 120 },
  lv: {},                 // building id -> level (0 = not yet raised)
  wave: 1,
  best: 1,
  phase: 'calm',          // 'calm' | 'assault'
  timer: 6,               // seconds left in the current phase step
  queue: [],              // foe types still to walk on this wave
  spawnCd: 0,
  hallHp: 0,
  units: [], foes: [], shots: [], fx: [],
  train: { barracks: 0, archery: 0, magetower: 0 },
  cycle: { barracks: 0 }, // counts militia trained, for knight cadence
  towerCd: 0,
  log: [],
  kills: 0,
  objIdx: 0,
  runStart: Date.now(),
  lastSeen: Date.now(),
  seenIntro: false,
};

for (const b of BUILDINGS) S.lv[b.id] = b.req ? 0 : 1;

// ---------------------------------------------------------------------------
// Derived values
// ---------------------------------------------------------------------------
export const lvl = (id) => S.lv[id] || 0;
export const tier = (id) => tierOf(Math.max(1, lvl(id)));

export const hallMax = () => Math.round(500 * Math.pow(1.38, Math.max(1, lvl('townhall')) - 1));
export const POP_CEILING = 160;
export const popCap  = () => Math.min(POP_CEILING, 10 + lvl('townhall') * 5 + lvl('tavern') * 4);
export const popUsed = () => S.units.reduce((n, u) => n + (TROOPS[u.type]?.pop || 1), 0);

// Max level any non-hall building may reach.
export const levelCap = (id) => (id === 'townhall' ? Infinity : lvl('townhall') + 5);

export function reqMet(def) {
  if (!def.req) return true;
  return Object.entries(def.req).every(([k, v]) => lvl(k) >= v);
}

export const income = () => ({
  gold:  rateFor('gold',  lvl('market')) * goldMul(),
  wood:  rateFor('wood',  lvl('lumber')),
  stone: rateFor('stone', lvl('quarry')),
  food:  rateFor('food',  lvl('farm')),
});

export const goldMul = () => 1 + lvl('tavern') * 0.06;
export const starving = () => S.res.food <= 0;

// A troop's live stats, folding in the blacksmith and the starvation penalty.
export function troopStats(type) {
  const T = TROOPS[type];
  const L = Math.max(1, lvl(T.from));
  const atkBonus = 1 + lvl('blacksmith') * 0.09;
  const hpBonus  = 1 + lvl('blacksmith') * 0.07;
  return {
    hp:  Math.round(T.hp(L) * hpBonus),
    dmg: T.dmg(L) * atkBonus * (starving() ? 0.6 : 1),
    range: T.range, atk: T.atk, spd: T.spd,
    pop: T.pop, ranged: !!T.ranged, splash: T.splash ? 14 + lvl('magetower') : 0,
  };
}

export function trainTime(id) {
  const L = Math.max(1, lvl(id));
  const base = { barracks: 6, archery: 7, magetower: 13 }[id];
  const k = { barracks: 0.16, archery: 0.16, magetower: 0.14 }[id];
  return base / (1 + k * (L - 1));
}

export function towerStats() {
  const L = lvl('watchtower');
  return { dmg: Math.round(9 * Math.pow(1.32, L - 1)), range: 55 + L * 4, rate: 1.5 / (1 + 0.1 * (L - 1)) };
}

// ---------------------------------------------------------------------------
export function canAfford(cost) {
  return Object.entries(cost).every(([k, v]) => S.res[k] >= v);
}
export function pay(cost) {
  for (const k in cost) S.res[k] -= cost[k];
}

export function upgradeCost(id) { return costFor(BY_ID[id], Math.max(1, lvl(id))); }

// Reasons an upgrade is blocked, or null if it can go ahead.
export function upgradeBlock(id) {
  const def = BY_ID[id];
  if (!reqMet(def)) {
    const [k, v] = Object.entries(def.req)[0];
    return `Requires ${BY_ID[k].name} level ${v}`;
  }
  if (lvl(id) >= levelCap(id)) return `Capped at Town Hall level + 5 — raise the Town Hall`;
  if (!canAfford(upgradeCost(id))) return 'Not enough resources';
  return null;
}

export function logLine(text) {
  S.log.unshift({ t: Date.now(), text });
  if (S.log.length > 60) S.log.length = 60;
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------
export function save() {
  S.lastSeen = Date.now();
  const snap = {
    res: S.res, lv: S.lv, wave: S.wave, best: S.best, hallHp: S.hallHp,
    kills: S.kills, objIdx: S.objIdx, log: S.log.slice(0, 20), lastSeen: S.lastSeen,
    runStart: S.runStart, seenIntro: S.seenIntro,
  };
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(snap)); } catch { /* private mode */ }
}

// Returns a summary of offline production, or null.
export function load() {
  let snap = null;
  try { snap = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch { /* ignore */ }
  if (!snap) { S.hallHp = hallMax(); return null; }

  Object.assign(S.res, snap.res || {});
  Object.assign(S.lv, snap.lv || {});
  S.wave = snap.wave || 1;
  S.best = snap.best || S.wave;
  S.kills = snap.kills || 0;
  S.objIdx = snap.objIdx || 0;
  S.log = snap.log || [];
  S.runStart = snap.runStart || Date.now();
  S.seenIntro = !!snap.seenIntro;
  S.hallHp = Math.min(snap.hallHp ?? hallMax(), hallMax());
  if (S.hallHp <= 0) S.hallHp = hallMax();

  // Bank production for time spent away (capped, and no waves run).
  const away = Math.min(OFFLINE_CAP, Math.max(0, (Date.now() - (snap.lastSeen || Date.now())) / 1000));
  if (away < 60) return null;
  const inc = income();
  const gained = {};
  for (const k in inc) {
    gained[k] = Math.floor(inc[k] * away);
    S.res[k] += gained[k];
  }
  return { away, gained };
}

export function hardReset() {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
}
