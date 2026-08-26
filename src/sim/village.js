import { BUILDINGS, GATE_Y, WORLD } from '../config.js';
import { S } from '../state.js';

// Ambient life: villagers running errands, hens near the farm. Purely cosmetic,
// but an empty village reads as a spreadsheet rather than a place.
const KINDS = ['villagerA', 'villagerB', 'villagerC'];
const rect = (b) => ({ x: b.x - 3, y: b.y + b.h - 12, w: b.w + 6, h: 16 });

function blocked(x, y) {
  for (const b of BUILDINGS) {
    const R = rect(b);
    if (x > R.x && x < R.x + R.w && y > b.y && y < b.y + b.h) return true;
  }
  return false;
}

function wander(c) {
  for (let i = 0; i < 8; i++) {
    const x = 26 + Math.random() * (WORLD.W - 52);
    const y = GATE_Y + 26 + Math.random() * (WORLD.H - GATE_Y - 40);
    if (!blocked(x, y)) { c.tx = x; c.ty = y; return; }
  }
  c.tx = c.x; c.ty = c.y;
}

export function initVillage() {
  S.civ = [];
  for (let i = 0; i < 9; i++) {
    const c = {
      type: KINDS[i % KINDS.length],
      x: 40 + Math.random() * (WORLD.W - 80),
      y: GATE_Y + 30 + Math.random() * (WORLD.H - GATE_Y - 50),
      tx: 0, ty: 0, wait: Math.random() * 3, anim: Math.random(), face: false, spd: 8 + Math.random() * 5,
    };
    wander(c);
    S.civ.push(c);
  }
  for (let i = 0; i < 5; i++) {                 // hens in the farm paddock
    S.civ.push({
      type: 'chicken', hen: true,
      x: 20 + Math.random() * 64, y: 738 + Math.random() * 16,
      tx: 0, ty: 0, wait: Math.random() * 2, anim: Math.random(), face: false, spd: 11,
    });
  }
}

export function tickVillage(dt) {
  if (!S.civ) initVillage();
  // panic when something is inside the walls
  const breach = S.foes.some(f => f.y > GATE_Y - 4);

  for (const c of S.civ) {
    if (breach && !c.hen) {                      // run for the back of the village
      c.tx = c.x < 200 ? 40 : 360;
      c.ty = WORLD.H - 24;
      c.wait = 0;
    }
    const dx = c.tx - c.x, dy = c.ty - c.y;
    const d = Math.hypot(dx, dy);
    if (d < 2) {
      c.wait -= dt;
      if (c.wait <= 0) {
        c.wait = 1 + Math.random() * 4;
        if (c.hen) {
          c.tx = 20 + Math.random() * 64;
          c.ty = 736 + Math.random() * 18;
        } else wander(c);
      }
    } else {
      const spd = c.spd * (breach && !c.hen ? 2.6 : 1);
      c.x += (dx / d) * spd * dt;
      c.y += (dy / d) * spd * dt;
      c.anim += dt * (c.hen ? 9 : 5);
      c.face = dx < -0.5;
    }
  }
}
