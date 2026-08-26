import { r, box, mkPix, M, pine, rock, bush, fenceRun, barrel, crate, logPile } from './prims.js';
import { WORLD, GATE_Y, GATE_X, BUILDINGS } from '../config.js';

// Deterministic RNG so the valley is the same every session.
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hex = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
const mix = (a, b, t) => {
  const A = hex(a), B = hex(b);
  const c = A.map((v, i) => Math.round(v + (B[i] - v) * t));
  return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
};

// The land grows greener the further south you go: scorched at the front line,
// lush and mown inside the palisade.
function landAt(y) {
  const t = Math.max(0, Math.min(1, (y - 40) / (GATE_Y - 40)));
  const lush = Math.max(0, Math.min(1, (y - GATE_Y + 60) / 120));
  return {
    base:  mix(mix('#4a4736', '#5d8038', t), '#66913f', lush),
    dark:  mix(mix('#3b3a2c', '#4b6a2c', t), '#517532', lush),
    light: mix(mix('#5c5844', '#6f9647', t), '#7fae52', lush),
  };
}

// Rectangles that terrain scatter must avoid.
function keepOut() {
  const out = BUILDINGS.map(b => ({ x: b.x - 4, y: b.y - 4, w: b.w + 8, h: b.h + 8 }));
  out.push({ x: GATE_X - 26, y: 0, w: 52, h: WORLD.H });                 // the main road
  out.push({ x: 0, y: GATE_Y - 12, w: WORLD.W, h: 20 });                 // the palisade
  out.push({ x: 0, y: 736, w: WORLD.W, h: 22 });                         // village cross-street
  return out;
}
const hits = (zones, x, y, w = 8, h = 8) =>
  zones.some(z => x + w > z.x && x < z.x + z.w && y + h > z.y && y < z.y + z.h);

// ---------------------------------------------------------------------------
export function buildTerrain(seed = 20260826) {
  const { c, g } = mkPix(WORLD.W, WORLD.H);
  return paint(c, g, mulberry32(seed));
}

function paint(c, g, rnd) {
  const W = WORLD.W, H = WORLD.H;

  // --- ground bands -------------------------------------------------------
  for (let y = 0; y < H; y++) {
    r(g, 0, y, W, 1, landAt(y).base);
  }
  // speckle texture
  for (let i = 0; i < 9000; i++) {
    const x = Math.floor(rnd() * W), y = Math.floor(rnd() * H);
    const L = landAt(y);
    r(g, x, y, 1 + (rnd() < 0.2 ? 1 : 0), 1, rnd() < 0.5 ? L.dark : L.light);
  }
  // tufts of grass
  for (let i = 0; i < 3000; i++) {
    const x = Math.floor(rnd() * W), y = Math.floor(rnd() * H);
    const L = landAt(y);
    r(g, x, y, 1, 2, L.dark);
    r(g, x + 1, y + 1, 1, 1, L.light);
  }

  // --- battlefield scarring (north end) ----------------------------------
  for (let i = 0; i < 70; i++) {
    const cx = 34 + Math.floor(rnd() * (W - 68));
    const cy = Math.floor(rnd() * 380);
    const rw = 4 + Math.floor(rnd() * 8), rh = 2 + Math.floor(rnd() * 4);
    for (let dy = -rh; dy <= rh; dy++) {
      const k = Math.sqrt(Math.max(0, 1 - (dy * dy) / (rh * rh + 0.01)));
      const half = Math.round(rw * k * (0.75 + rnd() * 0.5));
      if (half <= 0) continue;
      r(g, cx - half, cy + dy, half * 2, 1, dy < 0 ? '#4a3b28' : '#3b2f1f');
    }
    r(g, cx - rw, cy - rh, rw * 2, 1, '#5c4a32');
  }
  // scattered bones and broken spears
  for (let i = 0; i < 46; i++) {
    const x = 26 + Math.floor(rnd() * (W - 52)), y = Math.floor(rnd() * 410);
    if (Math.abs(x - GATE_X) < 22) continue;
    if (rnd() < 0.5) {
      r(g, x, y, 4, 1, '#cfc7b2'); r(g, x, y - 1, 1, 1, '#cfc7b2'); r(g, x + 3, y + 1, 1, 1, '#cfc7b2');
    } else {
      r(g, x, y - 5, 1, 6, '#6f4a24'); r(g, x, y - 7, 1, 2, '#a9b0b8');
    }
  }
  // the horde's staging ground: skull totems and cold fires along the top
  for (let i = 0; i < 9; i++) {
    const x = 42 + Math.floor(rnd() * (W - 84));
    const y = 18 + Math.floor(rnd() * 80);
    if (Math.abs(x - GATE_X) < 18) continue;
    if (rnd() < 0.55) {                       // totem
      r(g, x, y - 12, 2, 13, '#4a3320');
      r(g, x - 2, y - 16, 6, 5, '#d8d2c0');
      r(g, x - 1, y - 15, 1, 2, '#2a2018'); r(g, x + 2, y - 15, 1, 2, '#2a2018');
      r(g, x - 2, y - 11, 6, 1, '#2a2018');
      r(g, x - 4, y - 13, 2, 1, '#98291a'); r(g, x + 4, y - 13, 2, 1, '#98291a');
    } else {                                   // burnt-out fire ring
      for (let a = 0; a < 7; a++) {
        const ax = x + Math.round(Math.cos(a / 7 * 6.28) * 5);
        const ay = y + Math.round(Math.sin(a / 7 * 6.28) * 3);
        r(g, ax, ay, 2, 2, '#6e6b62');
      }
      r(g, x - 2, y - 1, 4, 2, '#241a12');
      r(g, x - 1, y, 2, 1, '#5c3a1a');
    }
  }

  // --- roads --------------------------------------------------------------
  const road = (x, y, w, h) => {
    r(g, x, y, w, h, M.dirt.mid);
    for (let i = 0; i < w * h * 0.09; i++) {
      const px = x + Math.floor(rnd() * w), py = y + Math.floor(rnd() * h);
      r(g, px, py, 1, 1, rnd() < 0.5 ? M.dirt.lo : M.dirt.hi);
    }
    // soft, ragged edges
    for (let i = 0; i < h; i += 2) {
      r(g, x - 1 + Math.floor(rnd() * 2), y + i, 1, 2, M.dirt.lo);
      r(g, x + w - 1 + Math.floor(rnd() * 2), y + i, 1, 2, M.dirt.lo);
    }
  };
  road(GATE_X - 11, 0, 22, H - 40);              // the great north road
  road(0, 738, W, 18);                            // village cross-street
  road(96, 730, 12, 60);                          // spur to the smithy/mill
  road(292, 728, 10, 130);                        // spur to the range/quarry

  // --- mountains down both flanks ----------------------------------------
  // A heightmap wall: two sine octaves give an organic, non-repeating ridge.
  const ridge = (side) => {
    const ph = side === 'L' ? 0 : 2.7;
    const ext = (y) => 20
      + Math.sin(y * 0.021 + ph) * 11
      + Math.sin(y * 0.053 + ph * 2.1) * 6
      + Math.sin(y * 0.011 + ph * 0.6) * 8;

    for (let y = 0; y < H; y++) {
      const e = Math.max(6, Math.round(ext(y)));
      // is this row a local peak? only those get a lit rim and snow
      const peaky = ext(y) - Math.max(ext(y - 7), ext(y + 7));

      for (let i = 0; i < e; i++) {
        const t = i / e;                          // 0 = screen edge, 1 = inner rim
        const x = side === 'L' ? i : W - 1 - i;
        const shade = side === 'L' ? 0.22 + t * 0.62 : 0.80 - t * 0.50;
        // crags: coarse vertical banding so the mass isn't a flat gradient
        const crag = Math.sin(y * 0.31 + i * 0.9 + ph) * 0.09
                   + Math.sin(y * 0.07 + i * 2.3) * 0.06;
        r(g, x, y, 1, 1, mix('#43413a', '#9d9a8e', Math.max(0, Math.min(1, shade + crag))));
      }
      // rim: close to the rock, and only where the ridge actually rises
      if (peaky > -3) {
        const rx = side === 'L' ? e - 1 : W - e;
        r(g, rx, y, 1, 1, peaky > 1 ? '#b6b3a6' : '#8f8c81');
      }
      // snow only on genuine high shoulders
      if (e > 30 && peaky > 0.5) {
        const cap = Math.min(3, e - 28);
        for (let i = 0; i < cap; i++) {
          const x = side === 'L' ? e - 1 - i : W - e + i;
          r(g, x, y, 1, 1, i === 0 ? '#e8e6dd' : '#c9c6bb');
        }
      }
      // shadow cast onto the grass
      const sx = side === 'L' ? e : W - 1 - e;
      g.globalAlpha = 0.28;
      r(g, sx, y, side === 'L' ? 3 : -3, 1, '#2b3320');
      g.globalAlpha = 1;
      // occasional boulder spilled at the foot
      if (rnd() < 0.012) r(g, side === 'L' ? e + 1 : W - e - 3, y, 3, 2, '#6e6b62');
    }
  };
  ridge('L'); ridge('R');

  // --- palisade + gate ----------------------------------------------------
  const py = GATE_Y - 10;
  for (let x = 0; x < W; x += 4) {
    if (Math.abs(x - GATE_X) < 15) continue;
    r(g, x, py, 4, 12, M.wood2.mid);
    r(g, x, py, 1, 12, M.wood2.hi);
    r(g, x + 3, py, 1, 12, M.wood2.lo);
    r(g, x + 1, py - 2, 2, 3, M.wood2.mid);      // sharpened tip
    r(g, x + 1, py - 2, 1, 3, M.wood2.hi);
    box(g, x, py - 2, 4, 14, M.wood2.out);
  }
  // gate towers either side of the opening
  for (const gx of [GATE_X - 22, GATE_X + 15]) {
    r(g, gx, py - 8, 8, 20, M.stone.mid);
    r(g, gx, py - 8, 8, 1, M.stone.hi);
    for (let i = 0; i < 3; i++) r(g, gx + i * 3, py - 11, 2, 3, M.stone2.mid);
    box(g, gx, py - 11, 8, 23, M.stone.out);
  }
  // gate arch beam
  r(g, GATE_X - 15, py - 6, 30, 4, M.wood2.mid);
  r(g, GATE_X - 15, py - 6, 30, 1, M.wood2.hi);
  box(g, GATE_X - 15, py - 6, 30, 4, M.wood2.out);

  // --- village fences and paddocks ---------------------------------------
  fenceRun(g, 12, 742, 74);        // farm paddock
  fenceRun(g, 262, 906, 78);       // quarry yard
  const zones = keepOut();

  // --- trees, rocks, shrubs ----------------------------------------------
  for (let i = 0; i < 340; i++) {
    const x = Math.floor(rnd() * (W - 24)) + 12;
    const y = Math.floor(rnd() * (H - 30)) + 18;
    if (hits(zones, x - 6, y - 16, 16, 20)) continue;
    // density: thick at the flanks, sparse in the open middle and the village
    const edge = Math.min(x, W - x) / (W / 2);
    const inVillage = y > GATE_Y;
    const p = (1 - edge) * 0.9 + 0.12 + (inVillage ? -0.25 : 0);
    if (rnd() > p) continue;
    const scorch = y < 340 && rnd() < 0.45;
    if (scorch) {                       // burnt stump on the battlefield
      r(g, x + 3, y - 6, 3, 6, '#3b2f1f');
      r(g, x + 2, y - 8, 2, 3, '#3b2f1f');
      r(g, x + 6, y - 9, 2, 4, '#3b2f1f');
    } else {
      pine(g, x, y, 0.8 + rnd() * 0.5);
    }
  }
  for (let i = 0; i < 90; i++) {
    const x = Math.floor(rnd() * (W - 20)) + 10, y = Math.floor(rnd() * (H - 20)) + 10;
    if (hits(zones, x, y - 8, 10, 10)) continue;
    if (rnd() < 0.55) rock(g, x, y, 0.7 + rnd() * 0.8); else bush(g, x, y);
  }
  // wildflowers, village side only
  for (let i = 0; i < 220; i++) {
    const x = Math.floor(rnd() * W), y = GATE_Y + Math.floor(rnd() * (H - GATE_Y));
    if (hits(zones, x, y, 3, 3)) continue;
    r(g, x, y, 1, 1, ['#f2c14e', '#e8e2d4', '#cf5138', '#b06adf'][Math.floor(rnd() * 4)]);
  }

  // --- village clutter ----------------------------------------------------
  barrel(g, 214, 726); barrel(g, 220, 728); crate(g, 208, 730);
  crate(g, 310, 742); barrel(g, 318, 740);
  logPile(g, 118, 806, 3); logPile(g, 30, 820, 2);
  crate(g, 150, 830); barrel(g, 158, 828);

  // --- lamp posts along the road -----------------------------------------
  for (let y = 690; y < H - 30; y += 62) {
    for (const x of [GATE_X - 17, GATE_X + 14]) {
      r(g, x, y - 12, 2, 13, M.wood2.mid);
      r(g, x, y - 12, 1, 13, M.wood2.hi);
      r(g, x - 2, y - 16, 6, 5, M.iron.mid);
      r(g, x - 1, y - 15, 4, 3, '#f6d67a');
      box(g, x - 2, y - 16, 6, 5, M.iron.out);
    }
  }

  // --- vignette at the very top: the horde's territory --------------------
  for (let y = 0; y < 60; y++) {
    g.globalAlpha = 0.5 * (1 - y / 60);
    r(g, 0, y, W, 1, '#1b1020');
  }
  g.globalAlpha = 1;

  return c;
}
