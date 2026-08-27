import { BY_ID, TROOPS, GATE_X } from '../config.js';
import { S, lvl, income, popCap, popUsed, troopStats, trainTime, logLine } from '../state.js';

// Which unit the barracks turns out next: every 3rd is a knight once level 8.
function barracksPick() {
  const K = TROOPS.knight;
  if (lvl('barracks') >= K.minLvl && (S.cycle.barracks % K.every) === (K.every - 1)) return 'knight';
  return 'militia';
}

const SOURCES = [
  { id: 'barracks',  pick: barracksPick },
  { id: 'archery',   pick: () => 'archer' },
  { id: 'magetower', pick: () => 'mage' },
];

let uid = 1;

export function spawnTroop(type, x, y) {
  const st = troopStats(type);
  S.units.push({
    id: uid++, side: 'ally', type,
    x, y, hp: st.hp, max: st.hp,
    cd: Math.random() * 0.4, target: null, retarget: 0,
    lane: (Math.random() - 0.5) * 300,   // preferred column on the field
    rally: (Math.random() - 0.5) * 120,  // depth within the formation
    frame: 0, anim: Math.random(), face: false, flash: 0,
  });
}

export function tickEconomy(dt) {
  // --- resource production ------------------------------------------------
  const inc = income();
  for (const k in inc) S.res[k] += inc[k] * dt;

  // --- troop upkeep -------------------------------------------------------
  let drain = 0;
  for (const u of S.units) drain += TROOPS[u.type].food;
  S.res.food = Math.max(0, S.res.food - drain * dt);

  // --- training -----------------------------------------------------------
  const cap = popCap();
  let used = popUsed();
  for (const src of SOURCES) {
    const L = lvl(src.id);
    if (L <= 0) continue;
    S.train[src.id] += dt;
    const need = trainTime(src.id);
    while (S.train[src.id] >= need) {
      const type = src.pick();
      const cost = TROOPS[type].pop;
      if (used + cost > cap) { S.train[src.id] = need; break; }   // hold at full
      const def = BY_ID[src.id];
      spawnTroop(type, def.x + def.w / 2 + (Math.random() - 0.5) * 8, def.y + def.h - 2);
      used += cost;
      S.train[src.id] -= need;
      if (src.id === 'barracks') S.cycle.barracks++;
    }
  }

  // clamp resources so the HUD never shows absurd numbers
  for (const k in S.res) if (S.res[k] > 1e12) S.res[k] = 1e12;
}

// Progress 0..1 of each training building, for the army sheet.
export function trainProgress(id) {
  const need = trainTime(id);
  return Math.max(0, Math.min(1, (S.train[id] || 0) / need));
}

export { logLine };
