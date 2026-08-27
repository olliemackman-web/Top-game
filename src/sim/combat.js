import {
  FOES, WAVE_TABLE, BOSS_EVERY, SPAWN_GAP, INTERMISSION, HALL_REGEN,
  waveHp, waveDmg, waveCount, waveGold,
  GATE_Y, GATE_X, HALL_PT, RALLY_Y, SPAWN_Y, WORLD, BY_ID,
} from '../config.js';
import { S, lvl, troopStats, goldMul, hallMax, towerStats, logLine } from '../state.js';

export const hooks = { onDefeat: null, onWave: null, toast: null };

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
let fid = 1;

// ---------------------------------------------------------------------------
// Wave construction
// ---------------------------------------------------------------------------
export function foeStats(type, wave) {
  const F = FOES[type];
  return {
    hp: Math.round(F.hp * waveHp(wave)),
    dmg: F.dmg * waveDmg(wave),
    range: F.range, atk: F.atk, spd: F.spd,
    ranged: !!F.ranged,
    bounty: Math.round(F.bounty * (1 + wave * 0.06)),
  };
}

export function composition(w) {
  let row = WAVE_TABLE[0];
  for (const e of WAVE_TABLE) if (w >= e.from) row = e;
  const keys = Object.keys(row.weights);
  const tot = keys.reduce((a, k) => a + row.weights[k], 0);
  const n = waveCount(w);
  const out = [];
  for (let i = 0; i < n; i++) {
    let x = Math.random() * tot;
    for (const k of keys) { x -= row.weights[k]; if (x <= 0) { out.push(k); break; } }
  }
  if (w % BOSS_EVERY === 0) {
    const bosses = 1 + Math.floor(w / 25);
    for (let i = 0; i < bosses; i++) out.splice(Math.floor(out.length * 0.65), 0, 'ogre');
  }
  return out;
}

export function startWave() {
  S.phase = 'assault';
  S.queue = composition(S.wave);
  S.spawnCd = 0.4;
  logLine(`Wave ${S.wave} — ${S.queue.length} hostiles sighted.`);
  hooks.onWave?.(S.wave);
}

function spawnFoe(type) {
  const st = foeStats(type, S.wave);
  const x = 34 + Math.random() * (WORLD.W - 68);
  S.foes.push({
    id: fid++, side: 'foe', type,
    x, y: SPAWN_Y - Math.random() * 18,
    hp: st.hp, max: st.hp, st,
    cd: Math.random() * 0.5, target: null, retarget: 0,
    spawnX: x, lane: (Math.random() - 0.5) * 150, rally: (Math.random() - 0.5) * 46,
    frame: 0, anim: Math.random(), face: false, flash: 0,
  });
}

// ---------------------------------------------------------------------------
// Effects
// ---------------------------------------------------------------------------
function fx(x, y, c, type = 'puff', n = 5) {
  for (let i = 0; i < n; i++) {
    S.fx.push({
      x, y, c, type,
      vx: (Math.random() - 0.5) * 26,
      vy: -6 - Math.random() * 22,
      life: 0, max: 0.35 + Math.random() * 0.35,
    });
  }
}

// ---------------------------------------------------------------------------
// Spatial hash — keeps separation and targeting cheap.
// ---------------------------------------------------------------------------
const CELL = 22;
function hash(list) {
  const m = new Map();
  for (const e of list) {
    const k = ((e.x / CELL) | 0) + ',' + ((e.y / CELL) | 0);
    let a = m.get(k); if (!a) m.set(k, a = []);
    a.push(e);
  }
  return m;
}
function around(m, x, y) {
  const cx = (x / CELL) | 0, cy = (y / CELL) | 0, out = [];
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
    const a = m.get((cx + i) + ',' + (cy + j));
    if (a) out.push(...a);
  }
  return out;
}

function nearestIn(list, x, y, maxD) {
  let best = null, bd = maxD * maxD;
  for (const e of list) {
    if (e.hp <= 0) continue;
    const dx = e.x - x, dy = e.y - y, d = dx * dx + dy * dy;
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Damage
// ---------------------------------------------------------------------------
function hurt(e, amount, splash, srcSide) {
  e.hp -= amount;
  e.flash = 0.12;
  if (splash > 0) {
    const pool = srcSide === 'ally' ? S.foes : S.units;
    for (const o of pool) {
      if (o === e || o.hp <= 0) continue;
      const dx = o.x - e.x, dy = o.y - e.y;
      if (dx * dx + dy * dy <= splash * splash) { o.hp -= amount * 0.55; o.flash = 0.1; }
    }
    fx(e.x, e.y, '#c7a3ff', 'spark', 7);
  }
}

function shoot(from, to, dmg, splash, color) {
  S.shots.push({ x: from.x, y: from.y - 4, t: to, dmg, splash, color, side: from.side || 'ally', life: 0 });
}

// ---------------------------------------------------------------------------
// Main tick
// ---------------------------------------------------------------------------
export function tickCombat(dt) {
  // ---- phase clock -------------------------------------------------------
  if (S.phase === 'calm') {
    S.timer -= dt;
    S.hallHp = Math.min(hallMax(), S.hallHp + hallMax() * HALL_REGEN * dt);
    if (S.timer <= 0) startWave();
  } else {
    if (S.queue.length) {
      S.spawnCd -= dt;
      if (S.spawnCd <= 0) {
        spawnFoe(S.queue.shift());
        S.spawnCd = SPAWN_GAP * (0.6 + Math.random() * 0.8);
      }
    } else if (!S.foes.length) {
      const reward = Math.round(waveGold(S.wave) * goldMul());
      S.res.gold += reward;
      logLine(`Wave ${S.wave} repelled. +${reward} gold.`);
      hooks.toast?.(`Wave ${S.wave} repelled  +${reward}g`, 'good');
      S.wave++;
      S.best = Math.max(S.best, S.wave);
      S.phase = 'calm';
      S.timer = INTERMISSION;
    }
  }

  const aliveUnits = S.units, aliveFoes = S.foes;
  const hUnits = hash(aliveUnits), hFoes = hash(aliveFoes);

  // ---- allies ------------------------------------------------------------
  for (const u of aliveUnits) {
    const st = troopStats(u.type);
    u.cd -= dt; u.flash = Math.max(0, u.flash - dt);
    if (u.swing > 0) u.swing -= dt;
    u.retarget -= dt;
    if (u.retarget <= 0 || !u.target || u.target.hp <= 0) {
      // mop-up: with nothing left to spawn, hunt the last foes wherever they are
      const sight = (S.phase === 'assault' && !S.queue.length) ? 1e9 : 150;
      u.target = nearestIn(around(hFoes, u.x, u.y), u.x, u.y, 34) ||
                 nearestIn(aliveFoes, u.x, u.y, sight);
      u.retarget = 0.3 + Math.random() * 0.2;
    }
    let gx, gy;
    if (u.target) { gx = u.target.x; gy = u.target.y; }
    else if (u.y > GATE_Y - 16) { gx = GATE_X; gy = GATE_Y - 20; }       // funnel out of the gate
    else { gx = clamp(GATE_X + u.lane, 28, WORLD.W - 28); gy = RALLY_Y + (u.rally || 0); }

    const dx = gx - u.x, dy = gy - u.y;
    const d = Math.hypot(dx, dy) || 1;
    const inRange = u.target && d <= st.range;

    if (inRange) {
      if (u.cd <= 0) {
        u.cd = st.atk;
        u.swing = 0.22;
        if (st.ranged) shoot(u, u.target, st.dmg, st.splash, u.type === 'mage' ? '#c7a3ff' : '#e8dcb0');
        else { hurt(u.target, st.dmg, 0, 'ally'); fx(u.target.x, u.target.y - 3, '#ffd24a', 'spark', 2); }
      }
    } else if (d > 2) {
      const spd = st.spd * (u.target ? 1 : 0.85);
      u.x += (dx / d) * spd * dt;
      u.y += (dy / d) * spd * dt;
      u.anim += dt * 6;
      u.face = dx < -0.5;
    }
    // separation
    for (const o of around(hUnits, u.x, u.y)) {
      if (o === u) continue;
      const ox = u.x - o.x, oy = u.y - o.y;
      const od = ox * ox + oy * oy;
      if (od < 64 && od > 0.001) {
        const m = Math.sqrt(od);
        const k = (8 - m) / 8 * 34 * dt;
        u.x += (ox / m) * k; u.y += (oy / m) * k;
      }
    }
    u.x = clamp(u.x, 22, WORLD.W - 22);
    u.y = clamp(u.y, 18, WORLD.H - 20);
  }

  // ---- foes --------------------------------------------------------------
  let hallHits = 0;
  for (const f of aliveFoes) {
    f.cd -= dt; f.flash = Math.max(0, f.flash - dt);
    if (f.swing > 0) f.swing -= dt;
    f.retarget -= dt;
    if (f.retarget <= 0 || !f.target || f.target.hp <= 0) {
      f.target = nearestIn(around(hUnits, f.x, f.y), f.x, f.y, 34) ||
                 nearestIn(aliveUnits, f.x, f.y, 130);
      f.retarget = 0.3 + Math.random() * 0.2;
    }
    let gx, gy, atHall = false;
    if (f.target) { gx = f.target.x; gy = f.target.y; }
    else if (f.y < GATE_Y - 70 + (f.rally || 0)) { gx = f.spawnX; gy = GATE_Y - 40 + (f.rally || 0); }
    else if (f.y < GATE_Y + 8) { gx = GATE_X; gy = GATE_Y + 12; }        // funnel into the gate
    else { gx = HALL_PT.x; gy = HALL_PT.y; atHall = true; }

    const dx = gx - f.x, dy = gy - f.y;
    const d = Math.hypot(dx, dy) || 1;

    if (f.target && d <= f.st.range) {
      if (f.cd <= 0) {
        f.cd = f.st.atk;
        f.swing = 0.22;
        if (f.st.ranged) shoot(f, f.target, f.st.dmg, 0, '#b06adf');
        else { hurt(f.target, f.st.dmg, 0, 'foe'); fx(f.target.x, f.target.y - 3, '#e05a3d', 'spark', 2); }
      }
    } else if (atHall && d <= f.st.range + 16) {
      if (f.cd <= 0) {
        f.cd = f.st.atk;
        S.hallHp -= f.st.dmg;
        hallHits += f.st.dmg;
        fx(HALL_PT.x + (Math.random() - 0.5) * 30, HALL_PT.y - 8, '#e0b070', 'spark', 3);
      }
    } else if (d > 2) {
      f.x += (dx / d) * f.st.spd * dt;
      f.y += (dy / d) * f.st.spd * dt;
      f.anim += dt * 6;
      f.face = dx < -0.5;
    }
    for (const o of around(hFoes, f.x, f.y)) {
      if (o === f) continue;
      const ox = f.x - o.x, oy = f.y - o.y;
      const od = ox * ox + oy * oy;
      if (od < 64 && od > 0.001) {
        const m = Math.sqrt(od);
        const k = (8 - m) / 8 * 34 * dt;
        f.x += (ox / m) * k; f.y += (oy / m) * k;
      }
    }
    f.x = clamp(f.x, 22, WORLD.W - 22);
  }
  if (hallHits > 0) S.shake = Math.min(3, (S.shake || 0) + hallHits * 0.02);

  // ---- watchtower --------------------------------------------------------
  if (lvl('watchtower') > 0) {
    const T = towerStats();
    const def = BY_ID.watchtower;
    const tx = def.x + def.w / 2, ty = def.y + 6;
    S.towerCd -= dt;
    if (S.towerCd <= 0) {
      const mark = nearestIn(aliveFoes, tx, ty, T.range);
      if (mark) {
        S.towerCd = T.rate;
        shoot({ x: tx, y: ty + 4, side: 'ally' }, mark, T.dmg, 0, '#ffe08a');
      } else S.towerCd = 0.2;
    }
  }

  // ---- projectiles -------------------------------------------------------
  for (let i = S.shots.length - 1; i >= 0; i--) {
    const p = S.shots[i];
    p.life += dt;
    const t = p.t;
    if (!t || t.hp <= 0 || p.life > 3) { S.shots.splice(i, 1); continue; }
    const dx = t.x - p.x, dy = (t.y - 4) - p.y;
    const d = Math.hypot(dx, dy) || 1;
    const step = 170 * dt;
    if (d <= step) {
      hurt(t, p.dmg, p.splash, p.side);
      fx(t.x, t.y - 3, p.color, 'spark', p.splash ? 6 : 2);
      S.shots.splice(i, 1);
    } else {
      p.x += (dx / d) * step;
      p.y += (dy / d) * step;
    }
  }

  // ---- deaths ------------------------------------------------------------
  for (let i = S.units.length - 1; i >= 0; i--) {
    const u = S.units[i];
    if (u.hp <= 0) { fx(u.x, u.y - 3, '#8a6a45', 'puff', 5); S.units.splice(i, 1); }
  }
  for (let i = S.foes.length - 1; i >= 0; i--) {
    const f = S.foes[i];
    if (f.hp <= 0) {
      const g = Math.round(f.st.bounty * goldMul());
      S.res.gold += g;
      S.kills++;
      fx(f.x, f.y - 3, '#7a5b3a', 'puff', FOES[f.type].boss ? 12 : 5);
      fx(f.x, f.y - 5, '#f2c14e', 'coin', 2);
      S.foes.splice(i, 1);
    }
  }

  // ---- effects -----------------------------------------------------------
  for (let i = S.fx.length - 1; i >= 0; i--) {
    const e = S.fx[i];
    e.life += dt;
    if (e.life >= e.max) { S.fx.splice(i, 1); continue; }
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    e.vy += 40 * dt;
  }
  if (S.shake) S.shake = Math.max(0, S.shake - dt * 6);

  // ---- defeat ------------------------------------------------------------
  if (S.hallHp <= 0) {
    S.hallHp = 0;
    hooks.onDefeat?.();
  }
}

// Wipe the field — used on defeat / restart.
export function clearField() {
  S.units.length = 0; S.foes.length = 0;
  S.shots.length = 0; S.fx.length = 0;
  S.queue.length = 0;
}
