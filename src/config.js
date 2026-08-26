// ---------------------------------------------------------------------------
// Ironvale — all tuning lives here. Nothing else should hardcode a number.
// ---------------------------------------------------------------------------

// Logical pixel grid. The canvas is scaled up by an integer factor with
// smoothing off, so 1 unit here == 1 chunky pixel on screen.
export const VIEW  = { W: 400, H: 225 };
export const WORLD = { W: 400, H: 910 };

// World landmarks (y grows downward: 0 = deep enemy territory, 1080 = village rear)
export const GATE_Y   = 640;   // the palisade line
export const GATE_X   = 240;   // the road through it
export const SPAWN_Y  = -8;    // enemies walk in from off-screen north
export const RALLY_Y  = 470;   // where idle troops hold the line
export const HALL_PT  = { x: 200, y: 704 };

export const CAM_MIN = 0;
export const CAM_MAX = WORLD.H - VIEW.H;
export const CAM_VILLAGE = CAM_MAX;   // scrolled fully down
export const CAM_BATTLE  = 0;         // scrolled fully up

// A building rebuilds its look every VIS_STEP levels, up to TIER_MAX looks.
export const VIS_STEP = 5;
export const TIER_MAX = 5;
export const tierOf = (lvl) => Math.min(TIER_MAX, 1 + Math.floor((lvl - 1) / VIS_STEP));
export const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];

// ---------------------------------------------------------------------------
// Buildings
// x,y,w,h are world coordinates of the footprint. `sx,sy` is where this
// building's troops pop out of (offset from x,y).
// ---------------------------------------------------------------------------
// Growth curves. These are the two dials that decide how the whole game feels:
// how fast income compounds, and how fast troop power compounds.
export const RATES     = { gold: 2.1, wood: 1.6, stone: 1.0, food: 1.1 };
export const RATE_MUL  = 1.37;
export const TROOP_MUL = 1.36;
export const rateFor = (res, l) => RATES[res] * Math.pow(RATE_MUL, Math.max(1, l) - 1);

const P = (b, m) => (lvl) => Math.round(b * Math.pow(m, lvl - 1));

export const BUILDINGS = [
  {
    id: 'townhall', name: 'Town Hall', art: 'townhall',
    x: 168, y: 676, w: 64, h: 54,
    blurb: 'The heart of Ironvale. Caps how far every other building may be raised, and its own walls are what the horde must break.',
    base: { gold: 180, wood: 140, stone: 90 }, mul: 1.42,
    stats: (l) => ({
      'Level cap':  { v: l + 5, s: '' },
      'Hall HP':    { v: Math.round(500 * Math.pow(1.38, l - 1)), s: '' },
      'Population': { v: 10 + l * 5, s: '' },
    }),
  },
  {
    id: 'farm', name: 'Farmstead', art: 'farm',
    x: 16, y: 690, w: 64, h: 42,
    blurb: 'Grain, cattle and hens. Soldiers eat — an empty larder saps their strength in the field.',
    base: { gold: 60, wood: 40 }, mul: 1.42,
    stats: (l) => ({ 'Food / sec': { v: +rateFor('food', l).toFixed(2), s: '' } }),
  },
  {
    id: 'lumber', name: 'Lumber Camp', art: 'lumber',
    x: 40, y: 770, w: 68, h: 44,
    blurb: 'A saw pit and a stack of felled pine. Wood underwrites nearly every rebuild.',
    base: { gold: 50, wood: 25 }, mul: 1.40,
    stats: (l) => ({ 'Wood / sec': { v: +rateFor('wood', l).toFixed(2), s: '' } }),
  },
  {
    id: 'quarry', name: 'Quarry', art: 'quarry',
    x: 272, y: 852, w: 60, h: 42,
    blurb: 'Cut stone for walls that actually hold. Slower than timber, and worth more.',
    base: { gold: 90, wood: 60 }, mul: 1.43,
    stats: (l) => ({ 'Stone / sec': { v: +rateFor('stone', l).toFixed(2), s: '' } }),
  },
  {
    id: 'market', name: 'Market', art: 'market',
    x: 160, y: 784, w: 52, h: 40,
    blurb: 'Stalls, scales and a very loud trader. Turns the valley’s traffic into coin.',
    base: { gold: 130, wood: 70, stone: 40 }, mul: 1.44,
    stats: (l) => ({ 'Gold / sec': { v: +rateFor('gold', l).toFixed(2), s: '' } }),
  },
  {
    id: 'tavern', name: 'Tavern', art: 'tavern',
    x: 64, y: 856, w: 56, h: 44,
    blurb: 'Beds upstairs, ale downstairs. Draws settlers to the valley and takes a cut of every round.',
    base: { gold: 190, wood: 130, stone: 60 }, mul: 1.46,
    stats: (l) => ({
      'Population': { v: l * 4, s: '+' },
      'Gold bonus': { v: l * 6, s: '%' },
    }),
  },
  {
    id: 'barracks', name: 'Barracks', art: 'barracks',
    x: 252, y: 686, w: 52, h: 42,
    blurb: 'Drills militia, and from level 8 fields armoured knights. Your front line lives and dies here.',
    base: { gold: 150, wood: 100, stone: 50 }, mul: 1.45,
    unit: 'militia',
    stats: (l) => ({
      'Militia power': { v: Math.round(100 * Math.pow(TROOP_MUL, l - 1)), s: '%' },
      'Train speed':   { v: +(6 / (1 + 0.16 * (l - 1))).toFixed(1), s: 's' },
      'Knights':       { v: l >= 8 ? 'yes' : 'lvl 8', s: '' },
    }),
  },
  {
    id: 'archery', name: 'Archery Range', art: 'archery',
    x: 268, y: 760, w: 56, h: 38,
    blurb: 'Butts and straw targets. Archers out-range everything the horde brings until the shamans arrive.',
    base: { gold: 185, wood: 145, stone: 40 }, mul: 1.45,
    unit: 'archer',
    stats: (l) => ({
      'Archer power': { v: Math.round(100 * Math.pow(TROOP_MUL, l - 1)), s: '%' },
      'Train speed':  { v: +(7 / (1 + 0.16 * (l - 1))).toFixed(1), s: 's' },
    }),
  },
  {
    id: 'magetower', name: 'Mage Tower', art: 'magetower',
    x: 344, y: 752, w: 34, h: 58,
    blurb: 'Slow to cast, but the bolt splashes. The only sane answer to a packed wave.',
    base: { gold: 380, wood: 190, stone: 210 }, mul: 1.47,
    unit: 'mage', req: { townhall: 6 },
    stats: (l) => ({
      'Mage power':  { v: Math.round(100 * Math.pow(TROOP_MUL, l - 1)), s: '%' },
      'Train speed': { v: +(13 / (1 + 0.14 * (l - 1))).toFixed(1), s: 's' },
      'Splash':      { v: 14 + l, s: 'px' },
    }),
  },
  {
    id: 'blacksmith', name: 'Blacksmith', art: 'blacksmith',
    x: 96, y: 684, w: 48, h: 44,
    blurb: 'Sharpens and plates everything that marches. A flat multiplier on the whole army — usually your best coin.',
    base: { gold: 230, wood: 120, stone: 150 }, mul: 1.46,
    stats: (l) => ({
      'Army attack': { v: l * 9, s: '%' },
      'Army health': { v: l * 7, s: '%' },
    }),
  },
  {
    id: 'watchtower', name: 'Watchtower', art: 'watchtower',
    x: 338, y: 660, w: 26, h: 62,
    blurb: 'A bowman with the high ground. Fires on anything that reaches the palisade — your last line when the field is lost.',
    base: { gold: 170, wood: 110, stone: 130 }, mul: 1.45,
    stats: (l) => ({
      'Tower damage': { v: Math.round(9 * Math.pow(1.32, l - 1)), s: '' },
      'Range':        { v: 55 + l * 4, s: 'px' },
      'Rate':         { v: +(1.5 / (1 + 0.1 * (l - 1))).toFixed(2), s: 's' },
    }),
  },
];

export const BY_ID = Object.fromEntries(BUILDINGS.map(b => [b.id, b]));

// Upgrade cost for the NEXT level (i.e. going from `lvl` to `lvl+1`).
export function costFor(def, lvl) {
  const out = {};
  const k = Math.pow(def.mul, lvl);
  for (const r in def.base) out[r] = Math.ceil(def.base[r] * k);
  return out;
}

// ---------------------------------------------------------------------------
// Troops — stats scale off their producing building's level, forever.
// ---------------------------------------------------------------------------
export const TROOPS = {
  militia: { name: 'Militia', from: 'barracks', pop: 1, food: 0.05,
    hp: P(34, TROOP_MUL), dmg: P(5.5, TROOP_MUL), range: 9,  atk: 1.0,  spd: 15, w: 6, h: 9 },
  knight:  { name: 'Knight',  from: 'barracks', pop: 2, food: 0.09, minLvl: 8, every: 3,
    hp: P(120, TROOP_MUL), dmg: P(15, TROOP_MUL), range: 10, atk: 1.15, spd: 12, w: 7, h: 10 },
  archer:  { name: 'Archer',  from: 'archery',  pop: 1, food: 0.05,
    hp: P(20, TROOP_MUL), dmg: P(7, TROOP_MUL),  range: 44, atk: 0.95, spd: 14, w: 6, h: 9, ranged: true },
  mage:    { name: 'Mage',    from: 'magetower', pop: 2, food: 0.11,
    hp: P(26, TROOP_MUL), dmg: P(15, TROOP_MUL), range: 50, atk: 0.5,  spd: 12, w: 6, h: 10, ranged: true, splash: true },
};

// ---------------------------------------------------------------------------
// Enemies — base stats, multiplied by the wave curve below.
// ---------------------------------------------------------------------------
export const FOES = {
  goblin: { name: 'Goblin',   hp: 26,  dmg: 4,  range: 9,  atk: 1.0, spd: 17, w: 6, h: 8,  bounty: 6 },
  wolf:   { name: 'Dire Wolf',hp: 18,  dmg: 6,  range: 8,  atk: 0.8, spd: 27, w: 9, h: 7,  bounty: 7 },
  orc:    { name: 'Orc',      hp: 80,  dmg: 10, range: 10, atk: 1.2, spd: 12, w: 7, h: 10, bounty: 14 },
  shaman: { name: 'Shaman',   hp: 38,  dmg: 8,  range: 40, atk: 1.3, spd: 12, w: 6, h: 9,  bounty: 18, ranged: true },
  ogre:   { name: 'Ogre',     hp: 420, dmg: 26, range: 12, atk: 1.6, spd: 8,  w: 12,h: 15, bounty: 105, boss: true },
};

// Quadratic-ish so late waves bite without the exponential blow-up that makes
// idle games unplayable around wave 40.
// Quadratic early so the first 30 waves stay readable, with a mild exponential
// tail after wave 30 — troop power compounds, so without this an optimal player
// simply never loses again.
export const LATE_FROM = 30;
const late = (w, k) => Math.pow(k, Math.max(0, w - LATE_FROM));
export const waveHp  = (w) => (1 + 0.135 * (w - 1) + 0.0060 * (w - 1) * (w - 1)) * late(w, 1.014);
export const waveDmg = (w) => (1 + 0.100 * (w - 1) + 0.0030 * (w - 1) * (w - 1)) * late(w, 1.009);
export const waveCount = (w) => Math.min(46, 4 + Math.floor(w * 0.75));
export const waveGold  = (w) => Math.round(110 * Math.pow(1.16, w - 1));

// Which foes may appear, and how heavily, at a given wave.
export const WAVE_TABLE = [
  { from: 1,  weights: { goblin: 10 } },
  { from: 3,  weights: { goblin: 10, wolf: 4 } },
  { from: 6,  weights: { goblin: 9,  wolf: 5, orc: 3 } },
  { from: 10, weights: { goblin: 7,  wolf: 5, orc: 5, shaman: 3 } },
  { from: 16, weights: { goblin: 5,  wolf: 5, orc: 7, shaman: 5 } },
  { from: 25, weights: { goblin: 3,  wolf: 5, orc: 9, shaman: 7 } },
];
export const BOSS_EVERY = 5;   // an Ogre joins every 5th wave

export const SPAWN_GAP   = 0.55;  // seconds between foe spawns inside a wave
export const INTERMISSION = 9;    // seconds of calm between waves
export const HALL_REGEN   = 0.06; // fraction of max hall HP restored per second of calm

// ---------------------------------------------------------------------------
export const SAVE_KEY = 'ironvale.save.v1';
export const TICK_MAX = 0.05;      // clamp a frame's dt (tab-switch protection)
export const OFFLINE_CAP = 8 * 3600; // seconds of production banked while away
