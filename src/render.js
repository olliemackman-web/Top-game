import { WORLD, BUILDINGS, BY_ID, GATE_Y, FOES } from './config.js';
import { S, lvl, tier, hallMax, upgradeBlock, reqMet } from './state.js';
import { buildTerrain } from './art/terrain.js';
import { buildingSprite, buildingFx } from './art/buildings.js';
import { unitSprite, unitSize } from './art/units.js';
import { r, box, M } from './art/prims.js';

export const VP = { w: 400, h: 225, scale: 1 };

let terrain = null;
export function initArt() { terrain = buildTerrain(); }

// Fit the canvas: fixed logical width, height follows the window's aspect so
// the picture always fills the screen without letterboxing.
export function resize(canvas) {
  const cw = window.innerWidth, ch = window.innerHeight;
  VP.scale = Math.max(1, cw / VP.w);
  VP.h = Math.max(150, Math.min(WORLD.H, Math.round(VP.w * ch / cw)));
  canvas.width = VP.w;
  canvas.height = VP.h;
  canvas.style.width = cw + 'px';
  canvas.style.height = ch + 'px';
  const g = canvas.getContext('2d');
  g.imageSmoothingEnabled = false;
  return g;
}

export const camMax = () => Math.max(0, WORLD.H - VP.h);

// Screen position of a world point (before shake).
export const toScreen = (x, y, cam) => ({ x, y: y - cam });

// ---------------------------------------------------------------------------
export function draw(g, cam, time, sel, hover) {
  const sh = S.shake ? (Math.random() - 0.5) * S.shake * 2 : 0;
  g.save();
  g.translate(0, Math.round(sh));

  // --- terrain ------------------------------------------------------------
  const top = Math.max(0, Math.min(WORLD.H - VP.h, Math.round(cam)));
  g.clearRect(0, -4, VP.w, VP.h + 8);
  if (terrain) g.drawImage(terrain, 0, top, VP.w, VP.h, 0, 0, VP.w, VP.h);

  // --- depth-sorted world layer ------------------------------------------
  const items = [];
  for (const b of BUILDINGS) {
    if (b.y + b.h < top - 20 || b.y > top + VP.h + 20) continue;
    items.push({ k: b.y + b.h, kind: 'b', b });
  }
  for (const u of S.units) {
    if (u.y < top - 24 || u.y > top + VP.h + 24) continue;
    items.push({ k: u.y, kind: 'u', u });
  }
  for (const f of S.foes) {
    if (f.y < top - 24 || f.y > top + VP.h + 24) continue;
    items.push({ k: f.y, kind: 'u', u: f });
  }
  if (S.civ) for (const c of S.civ) {
    if (c.y < top - 24 || c.y > top + VP.h + 24) continue;
    items.push({ k: c.y, kind: 'c', u: c });
  }
  items.sort((a, c) => a.k - c.k);

  for (const it of items) {
    if (it.kind === 'b') drawBuilding(g, it.b, top, time, sel, hover);
    else if (it.kind === 'c') drawCivilian(g, it.u, top);
    else drawUnit(g, it.u, top);
  }

  // --- projectiles --------------------------------------------------------
  for (const p of S.shots) {
    const y = p.y - top;
    if (y < -8 || y > VP.h + 8) continue;
    r(g, p.x - 1, y - 1, 2, 2, p.color);
    r(g, p.x, y, 1, 1, '#ffffff');
  }

  // --- effects ------------------------------------------------------------
  for (const e of S.fx) {
    const y = e.y - top;
    if (y < -8 || y > VP.h + 8) continue;
    const t = e.life / e.max;
    g.globalAlpha = 1 - t;
    const s = e.type === 'puff' ? 1 + Math.round(t * 2) : 1;
    r(g, e.x, y, s, s, e.c);
    g.globalAlpha = 1;
  }

  g.restore();

  // --- off-screen battle marker ------------------------------------------
  if (S.foes.length) {
    let above = 0, deepest = 0;
    for (const f of S.foes) { if (f.y < top) above++; deepest = Math.max(deepest, f.y); }
    if (above > 0) {
      const pulse = 0.45 + 0.35 * Math.sin(time * 4);
      g.globalAlpha = pulse;
      r(g, 0, 0, VP.w, 2, '#c2452f');
      g.globalAlpha = 1;
      const bw = Math.min(60, 14 + above * 3);
      r(g, VP.w / 2 - bw / 2, 3, bw, 5, 'rgba(30,10,6,0.72)');
      for (let i = 0; i < Math.min(12, above); i++) r(g, VP.w / 2 - bw / 2 + 3 + i * 4, 5, 2, 2, '#e8a0a0');
    }
    // breach warning: something is inside the walls
    if (deepest > GATE_Y) {
      const p = 0.3 + 0.3 * Math.sin(time * 8);
      g.globalAlpha = p;
      box(g, 0, 0, VP.w, VP.h, '#c2452f');
      box(g, 1, 1, VP.w - 2, VP.h - 2, '#c2452f');
      g.globalAlpha = 1;
    }
  }
}

// ---------------------------------------------------------------------------
function drawBuilding(g, b, top, time, sel, hover) {
  const L = lvl(b.id);
  const sy = b.y - top;

  if (L <= 0) {                              // not yet raised — show a footing
    g.globalAlpha = 0.55;
    r(g, b.x + 3, sy + b.h - 10, b.w - 6, 8, M.stone.lo);
    box(g, b.x + 3, sy + b.h - 10, b.w - 6, 8, M.stone.out);
    for (let i = 0; i < 4; i++) r(g, b.x + 5 + i * ((b.w - 12) / 3), sy + b.h - 16, 2, 7, M.wood2.mid);
    g.globalAlpha = 1;
    const ok = reqMet(b);
    const pulse = 0.5 + 0.5 * Math.sin(time * 3);
    g.globalAlpha = ok ? pulse : 0.4;
    r(g, b.x + b.w / 2 - 1, sy + b.h - 26 - (ok ? pulse * 2 : 0), 3, 6, ok ? '#7fc24a' : '#8d8a7e');
    r(g, b.x + b.w / 2 - 3, sy + b.h - 24 - (ok ? pulse * 2 : 0), 7, 2, ok ? '#7fc24a' : '#8d8a7e');
    g.globalAlpha = 1;
  } else {
    const t = tier(b.id);
    const spr = buildingSprite(b.id, t, b.w, b.h);
    g.drawImage(spr.c, b.x, sy + spr.dy);
    buildingFx(g, b.id, t, b.w, b.h, time, b.x, sy);

    // hall damage tint
    if (b.id === 'townhall') {
      const frac = S.hallHp / hallMax();
      if (frac < 0.999) {
        g.globalAlpha = (1 - frac) * 0.4;
        r(g, b.x, sy + 4, b.w, b.h - 4, '#8e2417');
        g.globalAlpha = 1;
      }
    }
  }

  // selection / hover outline
  if (sel === b.id || hover === b.id) {
    const c = sel === b.id ? '#ffe08a' : 'rgba(255,224,138,0.5)';
    box(g, b.x - 1, sy - 1, b.w + 2, b.h + 2, c);
    r(g, b.x - 1, sy - 1, 3, 1, c); r(g, b.x + b.w - 2, sy - 1, 3, 1, c);
    r(g, b.x - 1, sy + b.h, 3, 1, c); r(g, b.x + b.w - 2, sy + b.h, 3, 1, c);
  }

  // affordable-upgrade chevron
  if (L > 0 && !upgradeBlock(b.id)) {
    const bob = Math.round(Math.sin(time * 3 + b.x) * 1.5);
    const cx = b.x + b.w / 2, cy = sy - 6 + bob;
    r(g, cx - 3, cy + 3, 7, 2, '#2c4a15');
    r(g, cx - 2, cy + 3, 5, 2, '#7fc24a');
    r(g, cx - 2, cy + 1, 1, 2, '#7fc24a'); r(g, cx + 2, cy + 1, 1, 2, '#7fc24a');
    r(g, cx - 1, cy - 1, 1, 2, '#7fc24a'); r(g, cx + 1, cy - 1, 1, 2, '#7fc24a');
    r(g, cx, cy - 2, 1, 2, '#a8e070');
  }
}

function drawCivilian(g, c, top) {
  const spr = unitSprite(c.type, Math.floor(c.anim * 2) % 2, c.face);
  const [w, h] = unitSize(c.type);
  g.drawImage(spr, Math.round(c.x - w / 2), Math.round(c.y - top - h + 2));
}

function drawUnit(g, u, top) {
  const y = u.y - top;
  const frame = (Math.floor(u.anim * 2) % 2);
  const spr = unitSprite(u.type, frame, u.face);
  const [w, h] = unitSize(u.type);
  const x = Math.round(u.x - w / 2), yy = Math.round(y - h + 2);

  if (u.flash > 0) {
    g.save();
    g.globalCompositeOperation = 'source-over';
    g.drawImage(spr, x, yy);
    g.globalAlpha = Math.min(0.8, u.flash * 6);
    r(g, x, yy, w, h, '#ffffff');
    g.globalAlpha = 1;
    g.restore();
  } else {
    g.drawImage(spr, x, yy);
  }

  // health bar, only once wounded
  const max = u.max || 1;
  if (u.hp < max - 0.01) {
    const boss = FOES[u.type]?.boss;
    const bw = boss ? 16 : Math.max(6, w - 2);
    const bx = Math.round(u.x - bw / 2), by = yy - 3;
    r(g, bx - 1, by - 1, bw + 2, 3, '#1b1209');
    r(g, bx, by, bw, 1, '#4a1a12');
    r(g, bx, by, Math.max(1, Math.round(bw * Math.max(0, u.hp) / max)), 1,
      u.side === 'ally' ? '#7fc24a' : '#e05a3d');
  }
}

// Small render of a building for the upgrade panel icon.
export function drawBuildingIcon(ctx, id, t, size) {
  const b = BY_ID[id];
  const spr = buildingSprite(id, t, b.w, b.h);
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, size, size);
  const k = Math.max(1, Math.floor(size / Math.max(spr.c.width, spr.c.height)));
  ctx.drawImage(spr.c,
    Math.floor((size - spr.c.width * k) / 2),
    Math.floor((size - spr.c.height * k) / 2),
    spr.c.width * k, spr.c.height * k);
}

// Which building is under a screen point?
export function pick(sx, sy, cam) {
  for (let i = BUILDINGS.length - 1; i >= 0; i--) {
    const b = BUILDINGS[i];
    const y = b.y - cam;
    if (sx >= b.x - 2 && sx <= b.x + b.w + 2 && sy >= y - 4 && sy <= y + b.h + 2) return b.id;
  }
  return null;
}
