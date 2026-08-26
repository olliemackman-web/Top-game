import {
  r, box, wall, gable, roofTrap, roofLean, windowLit, door, chimney,
  banner, flag, groundShadow, barrel, crate, logPile, mkPix, M,
} from './prims.js';

// Material progression: every building gets sturdier as its tier climbs.
const wallM = (t) => (t <= 2 ? M.wood : t === 3 ? M.stone : M.stone2);
const wallP = (t) => (t === 1 ? 'plank' : t === 2 ? 'timber' : 'block');
const roofM = (t) => (t <= 2 ? M.thatch : t === 3 ? M.shingle : M.tile);
const trimOn = (t) => t >= 5;

// Buildings grow inside their fixed footprint as they level.
export function boxFor(W, H, tier) {
  const f = 0.72 + 0.07 * (tier - 1);
  const w = Math.round(W * f), h = Math.round(H * f);
  return { x: Math.round((W - w) / 2), y: H - h, w, h };
}

// Gold cornices + banners that appear at the top tier.
function trim(g, x, y, w, h, t) {
  if (!trimOn(t)) return;
  r(g, x, y, w, 1, M.gold.mid);
  r(g, x, y + h - 1, w, 1, M.gold.lo);
}

// ---------------------------------------------------------------------------
const R = {};

R.townhall = (g, x, y, w, h, t) => {
  const rh = Math.round(h * 0.42), bh = h - rh;
  const by = y + rh;
  wall(g, x, by, w, bh, wallM(t), wallP(t));
  if (t >= 3) { // stone footing course
    r(g, x, y + h - 4, w, 4, M.stone.lo);
    box(g, x, y + h - 4, w, 4, M.stone.out);
  }
  roofTrap(g, x, y, w, rh, roofM(t), t >= 3 ? 3 : 2);
  trim(g, x, by, w, bh, t);

  const dw = Math.max(6, Math.round(w * 0.18)), dh = Math.round(bh * 0.62);
  door(g, x + Math.round(w / 2 - dw / 2), y + h - dh, dw, dh, t >= 4 ? M.wood2 : M.wood);

  const wins = t <= 1 ? 1 : t <= 3 ? 2 : 3;
  const ww = 5, wy = by + Math.round(bh * 0.24);
  for (let i = 0; i < wins; i++) {
    const step = w / (wins + 1);
    let wx = Math.round(x + step * (i + 1) - ww / 2);
    if (wins % 2 === 1 && i === Math.floor(wins / 2)) continue; // door sits here
    windowLit(g, wx, wy, ww, 5);
  }
  if (wins % 2 === 1) { // upper window over the door
    windowLit(g, Math.round(x + w / 2 - 2), by + 2, 4, 4);
  }
  if (t >= 3) chimney(g, x + Math.round(w * 0.78), y - 3, 5, rh - 1);
  if (t >= 2) { // crest board on the gable
    r(g, x + Math.round(w / 2) - 3, y + rh - 6, 6, 5, M.wood2.mid);
    box(g, x + Math.round(w / 2) - 3, y + rh - 6, 6, 5, M.wood2.out);
    r(g, x + Math.round(w / 2) - 1, y + rh - 5, 2, 3, t >= 4 ? M.gold.mid : M.cloth.mid);
  }
  if (t >= 4) {
    banner(g, x + 3, by + 3, 6, 13, M.cloth);
    banner(g, x + w - 9, by + 3, 6, 13, M.cloth);
  }
  if (t >= 5) flag(g, x + Math.round(w / 2), y + 1, 1, M.gold);
};

R.farm = (g, x, y, w, h, t) => {
  const bw = Math.round(w * 0.58), rh = Math.round(h * 0.44);
  const bx = x + w - bw, by = y + rh, bh = h - rh;
  wall(g, bx, by, bw, bh, t <= 2 ? M.wood : M.wood2, 'plank');
  roofTrap(g, bx, y, bw, rh, t <= 2 ? M.thatch : t === 3 ? M.shingle : M.tile, 2);
  // open barn mouth stacked with hay
  const mw = Math.round(bw * 0.5), mh = Math.round(bh * 0.72);
  const mx = bx + Math.round(bw / 2 - mw / 2), my = by + bh - mh;
  r(g, mx, my, mw, mh, '#2b1c0d');
  for (let i = 0; i < 3; i++) r(g, mx + 1, my + mh - 3 - i * 3, mw - 2, 2, i % 2 ? M.crop.mid : M.crop.hi);
  box(g, mx, my, mw, mh, M.wood.out);
  if (t >= 2) windowLit(g, bx + 3, by + 3, 4, 4);

  // crop rows to the left, richer each tier
  const rows = Math.min(4, 1 + t);
  for (let i = 0; i < rows; i++) {
    const ry = y + h - 4 - i * 5;
    if (ry < y + rh) break;
    r(g, x, ry, Math.round(w * 0.36), 3, M.dirt.mid);
    for (let j = 0; j < Math.round(w * 0.36); j += 4) r(g, x + j + 1, ry - 2, 2, 3, M.crop.mid);
  }
  // silo appears at tier 3, doubles at 5
  if (t >= 3) {
    const sx = bx - 9, sy = y + Math.round(rh * 0.5), sh = h - (sy - y) - 1;
    wall(g, sx, sy, 8, sh, M.stone2, 'block');
    roofTrap(g, sx - 1, sy - 4, 10, 4, M.slate, 0);
  }
  if (t >= 5) {
    const sx = bx - 19, sy = y + Math.round(rh * 0.7), sh = h - (sy - y) - 1;
    wall(g, sx, sy, 7, sh, M.stone2, 'block');
    roofTrap(g, sx - 1, sy - 3, 9, 3, M.slate, 0);
  }
};

R.lumber = (g, x, y, w, h, t) => {
  const sh = Math.round(h * 0.34);
  // open-sided saw shed on posts
  const shx = x + Math.round(w * 0.22), shw = Math.round(w * 0.52);
  r(g, shx, y + sh, 2, h - sh - 1, M.wood2.mid);
  r(g, shx + shw - 2, y + sh, 2, h - sh - 1, M.wood2.mid);
  if (t >= 3) { // back wall fills in
    wall(g, shx, y + sh, shw, Math.round((h - sh) * 0.55), M.wood, 'plank');
  }
  roofTrap(g, shx - 2, y, shw + 4, sh, roofM(t), 3);
  // the saw bench + blade
  const by = y + h - 8;
  r(g, shx + 3, by, shw - 6, 4, M.wood.mid);
  box(g, shx + 3, by, shw - 6, 4, M.wood.out);
  if (t >= 2) { // circular blade
    const cx = shx + Math.round(shw / 2), cy = by - 2;
    r(g, cx - 3, cy, 6, 1, M.iron.hi);
    r(g, cx - 2, cy - 1, 4, 1, M.iron.mid);
    r(g, cx - 1, cy - 2, 2, 1, M.iron.mid);
  }
  logPile(g, x, y + h - 5, Math.min(4, 1 + t));
  logPile(g, x + w - 13, y + h - 9, Math.min(3, t));
  if (t >= 4) { // stacked lumber wall behind
    for (let i = 0; i < 3; i++) r(g, x + w - 14, y + h - 14 - i * 3, 13, 2, i % 2 ? M.logs.mid : M.logs.hi);
  }
  if (t >= 5) { logPile(g, x + 2, y + h - 12, 3); }
};

R.quarry = (g, x, y, w, h, t) => {
  // exposed rock face cut back into the hillside
  const faceH = Math.round(h * 0.62);
  const fy = y + h - faceH;
  r(g, x, fy, w, faceH, M.stone.mid);
  r(g, x, fy, w, 2, M.stone.hi);
  // chisel courses across the face
  for (let i = fy + 4; i < y + h - 3; i += 4) {
    r(g, x + 1, i, w - 2, 1, M.stone.lo);
    for (let j = x + 2; j < x + w - 2; j += 7) r(g, j + (i % 8 ? 3 : 0), i - 3, 1, 3, M.stone.lo);
  }
  box(g, x, fy, w, faceH, M.stone.out);

  // the pit mouth — a dark bite out of the face, deeper each tier
  const mw = Math.round(w * (0.26 + t * 0.05)), mh = Math.round(faceH * 0.62);
  const mx = x + Math.round(w * 0.16), my = y + h - mh - 2;
  r(g, mx, my, mw, mh, '#2b2925');
  r(g, mx + 1, my + 1, mw - 2, 2, '#3d3a34');
  box(g, mx - 1, my - 1, mw + 2, mh + 2, M.stone.out);
  // timber shoring around the mouth
  r(g, mx - 2, my - 2, 2, mh + 4, M.wood2.mid);
  r(g, mx + mw, my - 2, 2, mh + 4, M.wood2.mid);
  r(g, mx - 2, my - 3, mw + 4, 2, M.wood2.mid);
  r(g, mx - 2, my - 3, mw + 4, 1, M.wood2.hi);

  // scaffolding + treadwheel crane on the lip, taller each tier
  const cx = x + Math.round(w * 0.74);
  const ch = Math.round(h * 0.42) + t * 2;
  r(g, cx, y + h - ch, 2, ch, M.wood2.mid);
  r(g, cx, y + h - ch, 1, ch, M.wood2.hi);
  r(g, cx + 8, y + h - Math.round(ch * 0.6), 2, Math.round(ch * 0.6), M.wood2.mid);
  for (let i = 1; i < 3; i++) r(g, cx, y + h - Math.round(ch * i / 3), 10, 1, M.wood2.lo);
  // jib arm reaching over the pit
  const jw = Math.round(w * 0.42);
  r(g, cx - jw, y + h - ch, jw + 2, 2, M.wood2.mid);
  r(g, cx - jw, y + h - ch, jw + 2, 1, M.wood2.hi);
  box(g, cx - jw, y + h - ch, jw + 2, 2, M.wood2.out);
  // rope + a block hanging from it
  r(g, cx - jw + 2, y + h - ch + 2, 1, 7, M.iron.lo);
  r(g, cx - jw - 1, y + h - ch + 9, 7, 5, M.stone2.mid);
  r(g, cx - jw - 1, y + h - ch + 9, 7, 1, M.stone2.hi);
  box(g, cx - jw - 1, y + h - ch + 9, 7, 5, M.stone.out);

  // dressed blocks stacked on the apron, more each tier
  for (let i = 0; i < Math.min(6, t + 2); i++) {
    const bx = x + 3 + (i % 3) * 8, by = y + h - 5 - Math.floor(i / 3) * 5;
    r(g, bx, by, 7, 4, M.stone2.mid);
    r(g, bx, by, 7, 1, M.stone2.hi);
    r(g, bx, by + 3, 7, 1, M.stone2.lo);
    box(g, bx, by, 7, 4, M.stone.out);
  }
  // rubble
  for (let i = 0; i < 5 + t; i++) {
    r(g, x + 2 + ((i * 13) % (w - 6)), y + h - 2 - ((i * 7) % 3), 2, 2, M.stone.lo);
  }
  if (t >= 4) {                                  // winch hut on the lip
    wall(g, x + w - 13, y + h - 14, 12, 13, M.wood, 'plank');
    roofTrap(g, x + w - 14, y + h - 18, 14, 4, roofM(t), 1);
  }
  if (t >= 5) {                                  // ore cart on rails
    r(g, x + 2, y + h - 9, 12, 1, M.iron.lo);
    r(g, x + 4, y + h - 14, 9, 5, M.wood2.mid);
    r(g, x + 4, y + h - 14, 9, 1, M.wood2.hi);
    box(g, x + 4, y + h - 14, 9, 5, M.wood2.out);
    r(g, x + 5, y + h - 9, 2, 2, M.iron.mid);
    r(g, x + 10, y + h - 9, 2, 2, M.iron.mid);
  }
};

R.market = (g, x, y, w, h, t) => {
  const stalls = Math.min(3, 1 + Math.floor((t - 1) / 2));
  const sw = Math.round(w / stalls) - 2;
  for (let i = 0; i < stalls; i++) {
    const sx = x + i * (sw + 2), ah = Math.round(h * 0.3);
    const sy = y + Math.round(h * 0.28) + (i % 2) * 3;
    // striped awning
    for (let j = 0; j < sw; j++) {
      r(g, sx + j, sy, 1, ah, (Math.floor(j / 3) % 2) ? M.cloth.mid : M.plaster.mid);
    }
    r(g, sx, sy, sw, 1, M.plaster.hi);
    box(g, sx, sy, sw, ah, M.cloth.out);
    // counter + posts
    r(g, sx + 1, sy + ah, 1, h - (sy - y) - ah - 1, M.wood2.mid);
    r(g, sx + sw - 2, sy + ah, 1, h - (sy - y) - ah - 1, M.wood2.mid);
    const cy = y + h - Math.round(h * 0.26);
    r(g, sx, cy, sw, 3, M.wood.mid);
    r(g, sx, cy, sw, 1, M.wood.hi);
    box(g, sx, cy, sw, 3, M.wood.out);
    // goods on the counter
    for (let k = 0; k < 3; k++) {
      r(g, sx + 2 + k * 4, cy - 2, 2, 2, [M.crop.mid, M.cloth.mid, M.gold.mid][(i + k) % 3]);
    }
  }
  if (t >= 3) { // strung lanterns
    for (let i = x + 3; i < x + w - 2; i += 7) {
      r(g, i, y + Math.round(h * 0.2), 2, 3, M.gold.mid);
      r(g, i, y + Math.round(h * 0.2), 2, 1, M.gold.hi);
    }
    r(g, x, y + Math.round(h * 0.2) - 1, w, 1, M.wood2.lo);
  }
  if (t >= 4) barrel(g, x + w - 6, y + h - 8);
  if (t >= 5) { crate(g, x, y + h - 7); flag(g, x + Math.round(w / 2), y + 2, 1, M.gold); }
};

R.tavern = (g, x, y, w, h, t) => {
  const floors = t <= 2 ? 1 : 2;
  const rh = Math.round(h * 0.32);
  const bodyH = h - rh;
  wall(g, x, y + rh, w, bodyH, wallM(t), wallP(t));
  if (t >= 3) { r(g, x, y + h - 4, w, 4, M.stone.lo); box(g, x, y + h - 4, w, 4, M.stone.out); }
  roofTrap(g, x, y, w, rh, roofM(t), 3);
  chimney(g, x + Math.round(w * 0.16), y - 4, 5, rh + 2);

  const dw = 7, dh = Math.round(bodyH * 0.5);
  door(g, x + Math.round(w * 0.42), y + h - dh, dw, dh, M.wood2);
  // ground-floor windows either side of the door
  windowLit(g, x + 4, y + h - dh + 2, 6, 5);
  windowLit(g, x + w - 11, y + h - dh + 2, 6, 5);
  if (floors === 2) {
    for (let i = 0; i < 3; i++) windowLit(g, x + 4 + i * Math.round((w - 10) / 3), y + rh + 3, 5, 5);
  }
  // hanging sign
  const sx = x + w - 4;
  r(g, sx - 8, y + rh + 2, 9, 1, M.iron.mid);
  r(g, sx - 3, y + rh + 3, 1, 4, M.iron.lo);
  r(g, sx - 6, y + rh + 7, 7, 6, t >= 4 ? M.gold.mid : M.wood2.mid);
  box(g, sx - 6, y + rh + 7, 7, 6, M.wood2.out);
  r(g, sx - 4, y + rh + 9, 3, 2, M.cloth.mid);
  if (t >= 4) { barrel(g, x + 1, y + h - 8); barrel(g, x + 7, y + h - 8); }
  if (t >= 5) { banner(g, x + w - 8, y + rh + 1, 5, 10, M.cloth); flag(g, x + 4, y + 1, 1, M.cloth); }
};

R.barracks = (g, x, y, w, h, t) => {
  const rh = Math.round(h * 0.36), bh = h - rh;
  wall(g, x, y + rh, w, bh, wallM(t), wallP(t));
  roofTrap(g, x, y, w, rh, roofM(t), 2);
  door(g, x + Math.round(w * 0.44), y + h - Math.round(bh * 0.6), 7, Math.round(bh * 0.6), M.wood2);
  windowLit(g, x + 4, y + rh + 4, 4, 4, false);
  windowLit(g, x + w - 8, y + rh + 4, 4, 4, false);
  // weapon rack against the wall
  const rx = x + 2, ry = y + h - 10;
  r(g, rx, ry + 8, 12, 1, M.wood2.lo);
  for (let i = 0; i < 3; i++) {
    r(g, rx + 2 + i * 4, ry, 1, 8, M.wood2.mid);
    r(g, rx + 1 + i * 4, ry - 2, 3, 3, M.iron.mid);
    r(g, rx + 1 + i * 4, ry - 2, 3, 1, M.iron.hi);
  }
  if (t >= 2) { // training dummy
    const dx = x + w - 8;
    r(g, dx, y + h - 10, 2, 9, M.wood2.mid);
    r(g, dx - 3, y + h - 9, 8, 3, M.crop.mid);
    r(g, dx - 1, y + h - 13, 4, 4, M.crop.hi);
    box(g, dx - 1, y + h - 13, 4, 4, M.wood.out);
  }
  if (t >= 3) { // corner turrets
    for (const cx of [x - 1, x + w - 5]) {
      wall(g, cx, y + rh - 3, 6, bh + 3, M.stone, 'block');
      r(g, cx - 1, y + rh - 6, 8, 3, M.stone2.mid);
      box(g, cx - 1, y + rh - 6, 8, 3, M.stone.out);
      for (let i = 0; i < 3; i++) r(g, cx - 1 + i * 3, y + rh - 8, 2, 2, M.stone2.mid);
    }
  }
  if (t >= 4) { banner(g, x + Math.round(w * 0.2), y + rh + 2, 6, 12, M.cloth); }
  if (t >= 5) { banner(g, x + Math.round(w * 0.68), y + rh + 2, 6, 12, M.cloth); flag(g, x + Math.round(w / 2), y + 1, 1, M.cloth); }
};

R.archery = (g, x, y, w, h, t) => {
  const rh = Math.round(h * 0.3);
  // covered shooting line: roof on posts, back wall from tier 3
  const sw = Math.round(w * 0.5);
  if (t >= 3) wall(g, x, y + rh, sw, h - rh - 1, wallM(t), wallP(t));
  else {
    r(g, x + 1, y + rh, 2, h - rh - 1, M.wood2.mid);
    r(g, x + sw - 3, y + rh, 2, h - rh - 1, M.wood2.mid);
  }
  roofLean(g, x, y, sw, rh, roofM(t));
  // arrow barrels + a bow rack under the shelter
  barrel(g, x + 3, y + h - 8);
  for (let i = 0; i < 4; i++) r(g, x + 4 + i, y + h - 11, 1, 3, M.wood.hi);
  if (t >= 2) {
    r(g, x + sw - 9, y + h - 12, 1, 11, M.wood2.mid);
    r(g, x + sw - 11, y + h - 11, 5, 1, M.wood2.lo);
  }
  // straw targets down the range, one more per tier
  const targets = Math.min(4, 1 + Math.floor(t / 1.5));
  for (let i = 0; i < targets; i++) {
    const tx = x + sw + 4 + i * Math.round((w - sw - 6) / targets);
    const ty = y + h - 12 - (i % 2) * 3;
    r(g, tx, ty + 8, 2, 4, M.wood2.mid);
    r(g, tx - 3, ty, 8, 8, M.crop.mid);
    r(g, tx - 3, ty, 8, 1, M.crop.hi);
    box(g, tx - 3, ty, 8, 8, M.crop.out);
    r(g, tx - 1, ty + 2, 4, 4, M.plaster.mid);
    r(g, tx, ty + 3, 2, 2, M.cloth.mid);
    if (t >= 3) r(g, tx + 1, ty + 3, 4, 1, M.wood.hi); // an arrow stuck in it
  }
  if (t >= 5) flag(g, x + 2, y + 1, 1, M.cloth);
};

R.magetower = (g, x, y, w, h, t) => {
  const capH = Math.round(h * 0.22);
  const tw = Math.round(w * 0.72), tx = x + Math.round((w - tw) / 2);
  const ty = y + capH, th = h - capH;
  wall(g, tx, ty, tw, th, t <= 2 ? M.stone : M.stone2, 'block');
  // conical cap
  const capM = t >= 4 ? M.purple : t >= 3 ? M.blue : M.shingle;
  for (let i = 0; i < capH; i++) {
    const hw = Math.max(1, Math.round(((i + 1) / capH) * (tw / 2 + 2)));
    const cx = Math.round(tx + tw / 2 - hw);
    r(g, cx, y + i, hw * 2, 1, i < 2 ? capM.hi : (i % 3 === 0 ? capM.lo : capM.mid));
    r(g, cx, y + i, 1, 1, capM.out);
    r(g, cx + hw * 2 - 1, y + i, 1, 1, capM.out);
  }
  // arched windows up the shaft
  const floors = Math.min(4, 1 + t);
  for (let i = 0; i < floors; i++) {
    const wy = ty + 4 + i * Math.round((th - 8) / floors);
    windowLit(g, tx + Math.round(tw / 2) - 2, wy, 4, 4, true);
  }
  door(g, tx + Math.round(tw / 2) - 3, y + h - 9, 6, 9, M.wood2);
  if (t >= 2) { // buttresses
    r(g, tx - 2, ty + Math.round(th * 0.5), 2, Math.round(th * 0.5), M.stone.mid);
    r(g, tx + tw, ty + Math.round(th * 0.5), 2, Math.round(th * 0.5), M.stone.mid);
  }
  if (t >= 3) { // balcony ring
    const by = ty + Math.round(th * 0.3);
    r(g, tx - 3, by, tw + 6, 2, M.stone2.mid);
    box(g, tx - 3, by, tw + 6, 2, M.stone.out);
    for (let i = 0; i < 4; i++) r(g, tx - 2 + i * Math.round((tw + 4) / 3), by - 3, 1, 3, M.stone2.lo);
  }
  if (t >= 5) { // gold rings + a second spire
    r(g, tx, ty + 2, tw, 1, M.gold.mid);
    r(g, tx, y + h - 12, tw, 1, M.gold.mid);
  }
};

R.blacksmith = (g, x, y, w, h, t) => {
  const rh = Math.round(h * 0.34), bh = h - rh;
  wall(g, x, y + rh, w, bh, t <= 1 ? M.wood : M.stone, t <= 1 ? 'plank' : 'block');
  roofTrap(g, x, y, w, rh, roofM(t), 2);
  // the forge mouth, glowing
  const fw = Math.round(w * 0.4), fh = Math.round(bh * 0.5);
  const fx = x + Math.round(w * 0.1), fy = y + h - fh - 3;
  r(g, fx, fy, fw, fh, '#2a1608');
  r(g, fx + 1, fy + fh - 4, fw - 2, 3, '#e8641f');
  r(g, fx + 2, fy + fh - 3, fw - 4, 2, '#ffb545');
  box(g, fx - 1, fy - 1, fw + 2, fh + 2, M.stone.out);
  wall(g, fx - 2, fy + fh, fw + 4, 3, M.stone, 'block');
  chimney(g, fx + Math.round(fw / 2) - 2, y - (t >= 3 ? 6 : 3), 5, rh + (t >= 3 ? 7 : 4));
  // anvil
  const ax = x + Math.round(w * 0.62), ay = y + h - 8;
  r(g, ax, ay + 4, 6, 3, M.wood2.mid);
  r(g, ax + 1, ay, 5, 3, M.iron.mid);
  r(g, ax, ay, 7, 1, M.iron.hi);
  r(g, ax + 2, ay + 3, 2, 1, M.iron.lo);
  box(g, ax + 1, ay, 5, 4, M.iron.out);
  if (t >= 2) { // tool wall
    for (let i = 0; i < 3; i++) {
      r(g, x + w - 11 + i * 3, y + rh + 3, 1, 5, M.iron.mid);
      r(g, x + w - 12 + i * 3, y + rh + 2, 3, 2, M.iron.hi);
    }
  }
  if (t >= 3) { r(g, x + w - 8, y + h - 7, 7, 5, M.blue.mid); box(g, x + w - 8, y + h - 7, 7, 5, M.iron.out); } // quench trough
  if (t >= 4) { barrel(g, x + w - 6, y + h - 15); }
  if (t >= 5) { r(g, x, y + rh, w, 1, M.gold.mid); flag(g, x + Math.round(w / 2), y + 1, 1, M.iron); }
};

R.watchtower = (g, x, y, w, h, t) => {
  const baseH = t >= 3 ? Math.round(h * 0.34) : 0;
  const topH = Math.round(h * 0.26);
  const shaftY = y + topH, shaftH = h - topH - baseH;
  const sw = Math.round(w * 0.6), sx = x + Math.round((w - sw) / 2);
  if (baseH) wall(g, x, y + h - baseH, w, baseH, M.stone2, 'block');
  // legs + cross bracing
  r(g, sx, shaftY, 2, shaftH, M.wood2.mid);
  r(g, sx + sw - 2, shaftY, 2, shaftH, M.wood2.mid);
  for (let i = 0; i < 3; i++) {
    const yy = shaftY + Math.round(shaftH * (i + 0.5) / 3);
    r(g, sx, yy, sw, 1, M.wood2.lo);
  }
  if (t >= 2) { // ladder
    for (let yy = shaftY + 3; yy < shaftY + shaftH; yy += 4) r(g, sx + 2, yy, sw - 4, 1, M.wood.hi);
  }
  // platform + railing
  r(g, x, shaftY - 2, w, 3, M.wood.mid);
  r(g, x, shaftY - 2, w, 1, M.wood.hi);
  box(g, x, shaftY - 2, w, 3, M.wood.out);
  for (let i = 0; i < 4; i++) r(g, x + 1 + i * Math.round((w - 2) / 3), shaftY - 6, 1, 4, M.wood2.mid);
  r(g, x, shaftY - 6, w, 1, M.wood2.mid);
  if (t >= 3) { // roofed crow's nest
    roofTrap(g, x - 1, y, w + 2, topH - 5, roofM(t), 2);
    r(g, x + 1, shaftY - 10, 1, 5, M.wood2.mid);
    r(g, x + w - 2, shaftY - 10, 1, 5, M.wood2.mid);
  }
  if (t >= 4) { // brazier
    r(g, x + w - 4, shaftY - 10, 3, 4, M.iron.mid);
    r(g, x + w - 4, shaftY - 11, 3, 2, '#e8641f');
  }
  if (t >= 5) flag(g, x + 1, y + 1, 1, M.cloth);
};

// ---------------------------------------------------------------------------
// Cache: one small canvas per (building, tier). Invalidated when a tier changes.
// ---------------------------------------------------------------------------
const cache = new Map();

export function buildingSprite(id, tier, W, H) {
  const key = id + ':' + tier + ':' + W + 'x' + H;
  let hit = cache.get(key);
  if (hit) return hit;
  const { c, g } = mkPix(W, H + 4);           // +4 for chimneys / flags poking out
  g.translate(0, 4);
  const b = boxFor(W, H, tier);
  groundShadow(g, b.x, b.y + b.h, b.w);
  (R[id] || R.townhall)(g, b.x, b.y, b.w, b.h, tier);
  hit = { c, dy: -4 };
  cache.set(key, hit);
  return hit;
}

// Animated overlays drawn live on top of the cached sprite.
export function buildingFx(g, id, tier, W, H, time, ox, oy) {
  const b = boxFor(W, H, tier);
  const puff = (px, py, seed) => {
    for (let i = 0; i < 3; i++) {
      const p = ((time * 0.5) + i * 0.33 + seed) % 1;
      const yy = py - p * 16;
      const s = 1 + p * 2;
      g.globalAlpha = 0.34 * (1 - p);
      r(g, ox + px + Math.sin((p + seed) * 6) * 2, oy + yy, s, s, '#e8e2d4');
    }
    g.globalAlpha = 1;
  };
  if (id === 'blacksmith') {
    const fw = Math.round(b.w * 0.4), fx = b.x + Math.round(b.w * 0.1);
    puff(fx + Math.round(fw / 2), b.y - (tier >= 3 ? 6 : 3), 0.1);
    // forge flicker
    const fl = 0.55 + 0.45 * Math.sin(time * 7.3);
    g.globalAlpha = fl * 0.5;
    r(g, ox + fx, oy + b.y + b.h - Math.round(b.h * 0.34) - 6, fw, 6, '#ff9c33');
    g.globalAlpha = 1;
  }
  if (id === 'tavern') puff(b.x + Math.round(b.w * 0.16) + 2, b.y - 4, 0.6);
  if (id === 'townhall' && tier >= 3) puff(b.x + Math.round(b.w * 0.78) + 2, b.y - 3, 0.3);
  if (id === 'magetower') {
    const p = 0.5 + 0.5 * Math.sin(time * 2.1);
    const cx = ox + b.x + Math.round(b.w / 2), cy = oy + b.y - 3;
    g.globalAlpha = 0.4 + p * 0.5;
    r(g, cx - 1, cy - 1, 3, 3, tier >= 4 ? '#c79bf0' : '#8fd0f0');
    r(g, cx, cy - 2, 1, 5, tier >= 4 ? '#e6cbff' : '#c7ecff');
    r(g, cx - 2, cy, 5, 1, tier >= 4 ? '#e6cbff' : '#c7ecff');
    g.globalAlpha = 1;
  }
  if (id === 'watchtower' && tier >= 4) {
    const fl = 0.5 + 0.5 * Math.sin(time * 9);
    g.globalAlpha = 0.5 + fl * 0.5;
    r(g, ox + b.x + b.w - 4, oy + b.y + Math.round(b.h * 0.26) - 13, 3, 2, '#ffb545');
    g.globalAlpha = 1;
  }
}

export function invalidateSprites() { cache.clear(); }
