// ---------------------------------------------------------------------------
// Pixel drawing primitives. Everything snaps to integers; nothing anti-aliases.
// ---------------------------------------------------------------------------

export function mkPix(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  return { c, g };
}

export const r = (g, x, y, w, h, c) => {
  if (w <= 0 || h <= 0) return;
  g.fillStyle = c;
  g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
};

// 1px border around a box
export const box = (g, x, y, w, h, c) => {
  r(g, x, y, w, 1, c); r(g, x, y + h - 1, w, 1, c);
  r(g, x, y, 1, h, c); r(g, x + w - 1, y, 1, h, c);
};

// ---------------------------------------------------------------------------
// Materials: hi = lit edge, mid = body, lo = shade, out = outline
// ---------------------------------------------------------------------------
export const M = {
  wood:    { hi: '#c08a4d', mid: '#9a6a35', lo: '#6f4a24', out: '#33200f' },
  wood2:   { hi: '#a97b45', mid: '#84582b', lo: '#5b3a1b', out: '#2b1b0d' },
  logs:    { hi: '#d0a066', mid: '#a97b45', lo: '#77522a', out: '#33200f' },
  stone:   { hi: '#b3b0a4', mid: '#8d8a7e', lo: '#66645a', out: '#312e27' },
  stone2:  { hi: '#c9c6b8', mid: '#a09d8e', lo: '#767364', out: '#38352d' },
  plaster: { hi: '#efe4cb', mid: '#d6c8a9', lo: '#ad9d7d', out: '#4a4032' },
  thatch:  { hi: '#e2c069', mid: '#bb9640', lo: '#8a6d27', out: '#3d3011' },
  shingle: { hi: '#836647', mid: '#614a31', lo: '#432f1d', out: '#22160c' },
  tile:    { hi: '#bc5540', mid: '#90392a', lo: '#65251a', out: '#2c110b' },
  slate:   { hi: '#637181', mid: '#454f5c', lo: '#2e3740', out: '#171b20' },
  gold:    { hi: '#ffe08a', mid: '#f2c14e', lo: '#b8860f', out: '#5c420a' },
  cloth:   { hi: '#cf5138', mid: '#98291a', lo: '#63130b', out: '#2c0805' },
  blue:    { hi: '#5f8fc4', mid: '#3d6493', lo: '#274263', out: '#111d2e' },
  purple:  { hi: '#9b6ec6', mid: '#6d4593', lo: '#472a63', out: '#1e112e' },
  iron:    { hi: '#c3c9d1', mid: '#8d949d', lo: '#5c626a', out: '#282c31' },
  dirt:    { hi: '#a37c4e', mid: '#82603a', lo: '#5f4529', out: '#2e2013' },
  grass:   { hi: '#7fae52', mid: '#66913f', lo: '#4d7130', out: '#2c4419' },
  crop:    { hi: '#d9b84e', mid: '#b3903a', lo: '#856a26', out: '#3d3011' },
};

export const SHADOW = 'rgba(24,14,6,0.24)';

// ---------------------------------------------------------------------------
// Structural pieces
// ---------------------------------------------------------------------------

// A flat wall face with an optional surface pattern.
export function wall(g, x, y, w, h, m, pattern = 'plain') {
  r(g, x, y, w, h, m.mid);
  r(g, x, y, w, 1, m.hi);
  r(g, x, y, 1, h, m.hi);
  r(g, x + w - 1, y, 1, h, m.lo);
  r(g, x, y + h - 1, w, 1, m.lo);

  if (pattern === 'plank') {
    for (let i = y + 3; i < y + h - 1; i += 3) r(g, x + 1, i, w - 2, 1, m.lo);
  } else if (pattern === 'block') {
    let row = 0;
    for (let i = y + 3; i < y + h - 1; i += 3, row++) {
      r(g, x + 1, i, w - 2, 1, m.lo);
      for (let j = x + (row % 2 ? 2 : 4); j < x + w - 1; j += 5) r(g, j, i - 2, 1, 2, m.lo);
    }
  } else if (pattern === 'timber') {
    // half-timbered: pale panels crossed by dark beams
    r(g, x + 1, y + 1, w - 2, h - 2, M.plaster.mid);
    r(g, x + 1, y + 1, w - 2, 1, M.plaster.hi);
    for (let j = x + 4; j < x + w - 2; j += 6) r(g, j, y + 1, 1, h - 2, m.lo);
    r(g, x + 1, y + Math.floor(h / 2), w - 2, 1, m.lo);
  } else if (pattern === 'log') {
    for (let i = y; i < y + h; i += 3) {
      r(g, x, i, w, 2, m.mid);
      r(g, x, i, w, 1, m.hi);
      r(g, x, i + 2, w, 1, m.lo);
    }
  }
  box(g, x, y, w, h, m.out);
}

// Triangular gable end.
export function gable(g, x, y, w, h, m) {
  for (let i = 0; i < h; i++) {
    const hw = Math.max(1, Math.round(((i + 1) / h) * (w / 2)));
    const xx = Math.round(x + w / 2 - hw), ww = hw * 2;
    r(g, xx, y + i, ww, 1, i < 2 ? m.hi : (i % 3 === 0 ? m.lo : m.mid));
    r(g, xx, y + i, 1, 1, m.out);
    r(g, xx + ww - 1, y + i, 1, 1, m.out);
  }
  r(g, x, y + h - 1, w, 1, m.out);
}

// Trapezoid roof (narrow ridge, wide eaves) — reads as a hipped roof.
export function roofTrap(g, x, y, w, h, m, over = 2) {
  for (let i = 0; i < h; i++) {
    const t = h === 1 ? 1 : i / (h - 1);
    const ww = Math.round(w * (0.40 + 0.60 * t) + over * 2 * t);
    const xx = Math.round(x + (w - ww) / 2);
    r(g, xx, y + i, ww, 1, i === 0 ? m.hi : (i % 3 === 2 ? m.lo : m.mid));
    r(g, xx, y + i, 1, 1, m.out);
    r(g, xx + ww - 1, y + i, 1, 1, m.out);
  }
  const bw = Math.round(w + over * 2);
  r(g, Math.round(x + (w - bw) / 2), y + h - 1, bw, 1, m.out);
}

// Simple lean-to / shed roof, high on the left.
export function roofLean(g, x, y, w, h, m) {
  for (let i = 0; i < w; i++) {
    const hh = Math.round(h * (1 - i / w) + 2);
    r(g, x + i, y + (h - hh), 1, hh, i % 3 === 2 ? m.lo : m.mid);
    r(g, x + i, y + (h - hh), 1, 1, m.hi);
  }
  box(g, x, y, w, h + 2, m.out);
}

export function windowLit(g, x, y, w, h, lit = true) {
  r(g, x, y, w, h, lit ? '#f6d67a' : '#2c3a49');
  if (lit) { r(g, x, y, w, 1, '#fff0b8'); r(g, x, y + h - 1, w, 1, '#c99a2e'); }
  box(g, x - 1, y - 1, w + 2, h + 2, '#3a2614');
  if (w >= 5) r(g, x + Math.floor(w / 2), y, 1, h, '#3a2614');
  if (h >= 5) r(g, x, y + Math.floor(h / 2), w, 1, '#3a2614');
}

export function door(g, x, y, w, h, m = M.wood2) {
  r(g, x, y, w, h, m.mid);
  r(g, x, y, w, 1, m.hi);
  for (let i = x + 2; i < x + w - 1; i += 3) r(g, i, y + 1, 1, h - 2, m.lo);
  box(g, x, y, w, h, m.out);
  r(g, x + w - 2, y + Math.floor(h / 2), 1, 1, M.gold.mid);
}

export function chimney(g, x, y, w, h, m = M.stone) {
  wall(g, x, y, w, h, m, 'block');
  r(g, x - 1, y, w + 2, 2, m.lo);
  box(g, x - 1, y, w + 2, 2, m.out);
}

// Hanging cloth banner with a device on it.
export function banner(g, x, y, w, h, m = M.cloth, crest = M.gold) {
  r(g, x, y, w, h - 2, m.mid);
  r(g, x, y, 1, h - 2, m.hi);
  r(g, x + w - 1, y, 1, h - 2, m.lo);
  // pointed hem
  for (let i = 0; i < 2; i++) {
    r(g, x + i, y + h - 2 + i, w - i * 2, 1, m.mid);
  }
  box(g, x, y, w, h - 2, m.out);
  r(g, x + Math.floor(w / 2) - 1, y + 2, 2, 3, crest.mid);
  r(g, x - 1, y - 1, w + 2, 1, M.wood2.lo);
}

export function flag(g, x, y, dir, m = M.cloth) {
  r(g, x, y - 6, 1, 8, M.wood2.mid);          // pole
  r(g, x + dir, y - 6, 5 * dir, 4, m.mid);
  r(g, x + dir, y - 6, 5 * dir, 1, m.hi);
  r(g, x + dir, y - 3, 5 * dir, 1, m.lo);
}

// Ground shadow beneath a structure.
export function groundShadow(g, x, y, w) {
  r(g, x + 2, y - 2, w - 4, 2, SHADOW);
  r(g, x + 4, y - 3, w - 8, 1, SHADOW);
}

export function barrel(g, x, y) {
  r(g, x, y, 5, 7, M.wood.mid);
  r(g, x, y, 1, 7, M.wood.hi);
  r(g, x + 4, y, 1, 7, M.wood.lo);
  r(g, x, y + 1, 5, 1, M.iron.mid);
  r(g, x, y + 5, 5, 1, M.iron.mid);
  box(g, x, y, 5, 7, M.wood.out);
}

export function crate(g, x, y) {
  r(g, x, y, 6, 6, M.wood.mid);
  r(g, x, y, 6, 1, M.wood.hi);
  r(g, x + 1, y + 2, 4, 1, M.wood.lo);
  r(g, x + 2, y + 1, 1, 4, M.wood.lo);
  box(g, x, y, 6, 6, M.wood.out);
}

export function logPile(g, x, y, n = 3) {
  for (let i = 0; i < n; i++) {
    const xx = x + i * 4, yy = y - (i % 2 ? 1 : 0);
    r(g, xx, yy, 4, 4, M.logs.mid);
    r(g, xx, yy, 4, 1, M.logs.hi);
    r(g, xx + 1, yy + 1, 2, 2, M.logs.lo);
    box(g, xx, yy, 4, 4, M.logs.out);
  }
}

// Pine tree — the valley's signature silhouette.
export function pine(g, x, y, s = 1) {
  const h = Math.round(14 * s), w = Math.round(11 * s);
  r(g, x + Math.round(w / 2) - 1, y - 3, 2, 3, '#5b3a1b');
  for (let layer = 0; layer < 3; layer++) {
    const ly = y - 3 - Math.round((layer + 1) * h * 0.26);
    const lw = Math.round(w * (1 - layer * 0.24));
    const lh = Math.round(h * 0.34);
    for (let i = 0; i < lh; i++) {
      const hw = Math.max(1, Math.round(((i + 1) / lh) * (lw / 2)));
      r(g, x + Math.round(w / 2) - hw, ly - lh + i, hw * 2, 1,
        i < 2 ? '#4d7130' : (i % 2 ? '#3f6127' : '#4a6d2d'));
    }
  }
  // sun-lit left edge
  r(g, x + 1, y - Math.round(h * 0.55), 1, 2, '#7fae52');
}

export function rock(g, x, y, s = 1) {
  const w = Math.max(5, Math.round(8 * s)), h = Math.max(4, Math.round(6 * s));
  // rounded boulder: narrower at the top, flat where it meets the ground
  for (let i = 0; i < h; i++) {
    const t = i / h;
    const inset = Math.round((1 - Math.sin((t * 0.8 + 0.2) * Math.PI)) * (w * 0.3));
    const xx = x + inset, ww = w - inset * 2;
    r(g, xx, y - h + i, ww, 1, i < 2 ? M.stone.hi : (t > 0.72 ? M.stone.lo : M.stone.mid));
    r(g, xx, y - h + i, 1, 1, M.stone.out);
    r(g, xx + ww - 1, y - h + i, 1, 1, M.stone.out);
  }
  r(g, x + 1, y - 1, w - 2, 1, M.stone.out);
  r(g, x + Math.round(w * 0.3), y - h + 1, 2, 1, '#cfccc0');   // catch-light
}

export function bush(g, x, y) {
  r(g, x + 1, y - 4, 5, 4, '#4a6d2d');
  r(g, x, y - 3, 7, 3, '#4a6d2d');
  r(g, x + 1, y - 4, 3, 1, '#6b9440');
  r(g, x, y - 1, 7, 1, '#33501f');
}

export function fencePost(g, x, y) {
  r(g, x, y - 7, 2, 7, M.wood2.mid);
  r(g, x, y - 7, 1, 7, M.wood2.hi);
  r(g, x, y - 7, 2, 1, M.wood2.out);
}

export function fenceRun(g, x, y, w) {
  r(g, x, y - 5, w, 1, M.wood2.mid);
  r(g, x, y - 3, w, 1, M.wood2.lo);
  for (let i = x; i < x + w; i += 8) fencePost(g, i, y);
}
