import { BUILDINGS, BY_ID, TROOPS, ROMAN, INTERMISSION } from './config.js';
import {
  S, lvl, tier, hallMax, popCap, popUsed, income, upgradeCost, upgradeBlock,
  levelCap, canAfford, pay, troopStats, starving, logLine, save, hardReset,
} from './state.js';
import { trainProgress } from './sim/economy.js';
import { drawBuildingIcon } from './render.js';
import { drawUnitIcon } from './art/units.js';

const $ = (id) => document.getElementById(id);

export const fmt = (n) => {
  n = Math.floor(n);
  if (n < 1000) return '' + n;
  if (n < 1e6) return (n / 1e3).toFixed(n < 1e4 ? 1 : 0) + 'k';
  if (n < 1e9) return (n / 1e6).toFixed(n < 1e7 ? 1 : 0) + 'M';
  return (n / 1e9).toFixed(1) + 'B';
};

// ---------------------------------------------------------------------------
// Objectives — a guided opening, then an endless "survive wave N" cadence.
// ---------------------------------------------------------------------------
const anyLevel = () => Math.max(...BUILDINGS.map(b => lvl(b.id)));
const OBJECTIVES = [
  { t: 'Raise the Town Hall to level 2', p: () => lvl('townhall') / 2,   r: 60 },
  { t: 'Drill the Barracks to level 3',  p: () => lvl('barracks') / 3,   r: 90 },
  { t: 'Survive wave 3',                 p: () => (S.wave - 1) / 3,      r: 120 },
  { t: 'Stoke the Blacksmith to level 3',p: () => lvl('blacksmith') / 3, r: 150 },
  { t: 'Man the Watchtower to level 3',  p: () => lvl('watchtower') / 3, r: 180 },
  { t: 'Survive wave 6',                 p: () => (S.wave - 1) / 6,      r: 240 },
  { t: 'Raise the Town Hall to level 6', p: () => lvl('townhall') / 6,   r: 320 },
  { t: 'Raise the Mage Tower',           p: () => lvl('magetower') / 1,  r: 400 },
  { t: 'Survive wave 10',                p: () => (S.wave - 1) / 10,     r: 500 },
  { t: 'Take any building to level 10',  p: () => anyLevel() / 10,       r: 700 },
  { t: 'Survive wave 15',                p: () => (S.wave - 1) / 15,     r: 900 },
  { t: 'Take any building to level 15',  p: () => anyLevel() / 15,       r: 1200 },
];

function objective() {
  if (S.objIdx < OBJECTIVES.length) return OBJECTIVES[S.objIdx];
  const n = 20 + (S.objIdx - OBJECTIVES.length) * 5;
  return { t: `Survive wave ${n}`, p: () => (S.wave - 1) / n, r: 800 + (S.objIdx - OBJECTIVES.length) * 600 };
}

function checkObjective() {
  const o = objective();
  if (o.p() >= 1) {
    S.res.gold += o.r;
    logLine(`Objective complete: ${o.t}. +${o.r} gold.`);
    toast(`Objective complete  +${o.r}g`, 'good');
    S.objIdx++;
  }
}

// ---------------------------------------------------------------------------
export function toast(text, kind = '') {
  const host = $('toasts');
  const el = document.createElement('div');
  el.className = 'toast ' + kind;
  el.textContent = text;
  host.appendChild(el);
  while (host.children.length > 4) host.firstChild.remove();
  setTimeout(() => el.remove(), 2900);
}

// ---------------------------------------------------------------------------
let selected = null;
export const getSelected = () => selected;

export function selectBuilding(id) {
  selected = id;
  if (!id) { $('buildpanel').classList.add('hidden'); return; }
  closeSheet();
  $('buildpanel').classList.remove('hidden');
  renderBuildPanel();
}
export function closeBuilding() { selectBuilding(null); }

function statRows(def, L) {
  const now = def.stats(Math.max(1, L));
  const next = def.stats(Math.max(1, L) + 1);
  let html = '';
  for (const k in now) {
    const a = now[k], b = next[k];
    const same = String(a.v) === String(b.v);
    html += `<span class="k">${k}</span>`
          + `<span class="a">${a.v}${a.s}</span>`
          + `<span class="ar">${same ? '' : '→'}</span>`
          + `<span class="b">${same ? '' : b.v + b.s}</span>`;
  }
  return html;
}

export function renderBuildPanel() {
  if (!selected) return;
  const def = BY_ID[selected];
  const L = lvl(selected);
  const built = L > 0;
  const t = tier(selected);

  $('bp-name').textContent = def.name;
  $('bp-tier').textContent = built
    ? `Level ${L} · Tier ${ROMAN[t]}${L > 0 && t < 5 ? `  (tier ${ROMAN[t + 1]} at level ${t * 5 + 1})` : ''}`
    : 'Not yet raised';
  $('bp-blurb').textContent = def.blurb;
  drawBuildingIcon($('bp-icon').getContext('2d'), selected, built ? t : 1, 72);

  $('bp-stats').innerHTML = built
    ? statRows(def, L)
    : `<span class="k">Once raised</span><span class="a"></span><span class="ar"></span><span class="b"></span>`
      + statRows(def, 1).split('</span>').slice(0, 4).join('</span>') + '</span>';

  const cost = upgradeCost(selected);
  $('bp-cost').innerHTML = Object.entries(cost).map(([k, v]) =>
    `<span class="c ${S.res[k] >= v ? '' : 'no'}"><i class="ic ${k}"></i>${fmt(v)}</span>`).join('');

  const block = upgradeBlock(selected);
  const btn = $('bp-upgrade');
  btn.textContent = built ? `Upgrade to level ${L + 1}` : `Raise ${def.name}`;
  btn.disabled = !!block;
  $('bp-note').textContent = block || (built && t < 5 && (L + 1) % 5 === 1
    ? `This upgrade rebuilds it — tier ${ROMAN[t + 1]} architecture.`
    : `Level cap ${levelCap(selected) === Infinity ? '∞' : levelCap(selected)}`);
}

// The single path an upgrade ever takes. Returns false if it was blocked.
export function tryUpgrade(id, quiet = false) {
  const block = upgradeBlock(id);
  if (block) { if (!quiet) toast(block, 'bad'); return false; }
  const cost = upgradeCost(id);
  if (!canAfford(cost)) return false;
  pay(cost);
  const before = tier(id);
  S.lv[id] = lvl(id) + 1;
  const after = tier(id);
  const def = BY_ID[id];
  if (after !== before) {
    if (!quiet) toast(`${def.name} rebuilt — Tier ${ROMAN[after]}`, 'good');
    logLine(`${def.name} rebuilt to Tier ${ROMAN[after]}.`);
  } else {
    logLine(`${def.name} upgraded to level ${lvl(id)}.`);
  }
  if (id === 'townhall') S.hallHp = Math.min(hallMax(), S.hallHp + hallMax() * 0.25);
  return true;
}

function doUpgrade() {
  if (!selected) return;
  if (tryUpgrade(selected)) { renderBuildPanel(); save(); }
}

// ---------------------------------------------------------------------------
// Sheets
// ---------------------------------------------------------------------------
function openSheet(title, html) {
  closeBuilding();
  $('sh-title').textContent = title;
  $('sh-body').innerHTML = html;
  $('sheet').classList.remove('hidden');
}
export function closeSheet() { $('sheet').classList.add('hidden'); }

function armySheet() {
  const counts = {};
  for (const u of S.units) counts[u.type] = (counts[u.type] || 0) + 1;
  let html = `<p>Troops train automatically and march north on their own. Population is
    capped by the Town Hall and Tavern; training pauses when the valley is full.</p>`;
  for (const key of Object.keys(TROOPS)) {
    const T = TROOPS[key], src = BY_ID[T.from];
    const built = lvl(T.from) > 0;
    const locked = T.minLvl && lvl(T.from) < T.minLvl;
    const st = troopStats(key);
    const prog = built ? Math.round(trainProgress(T.from) * 100) : 0;
    html += `<div class="lrow">
      <canvas width="32" height="32" data-unit="${key}"></canvas>
      <span class="n">${T.name} <span class="d">${
        !built ? `${src.name} not yet raised`
        : locked ? `unlocks at ${src.name} level ${T.minLvl}`
        : `${Math.round(st.dmg * 10) / 10} dmg · ${st.hp} hp · ${st.pop} pop · from ${src.name}`}</span></span>
      <span class="v">${counts[key] || 0}${built && !locked ? ` <span class="d">${prog}%</span>` : ''}</span>
    </div>`;
  }
  const inc = income();
  html += `<h3>The valley</h3>
    <div class="lrow"><span class="n">Population <span class="d">raise the Town Hall or Tavern for more</span></span><span class="v">${popUsed()}/${popCap()}</span></div>
    <div class="lrow"><span class="n">Food balance <span class="d">${starving() ? 'STARVING — troops fight at 60%' : 'larder holding'}</span></span><span class="v">${inc.food.toFixed(1)}/s</span></div>
    <div class="lrow"><span class="n">Kills all-time</span><span class="v">${fmt(S.kills)}</span></div>
    <div class="lrow"><span class="n">Furthest wave</span><span class="v">${S.best}</span></div>`;
  return html;
}

function logSheet() {
  if (!S.log.length) return '<p>Nothing has happened yet.</p>';
  return S.log.map(l => {
    const d = new Date(l.t);
    const hh = String(d.getHours()).padStart(2, '0'), mm = String(d.getMinutes()).padStart(2, '0');
    return `<div class="logline"><b>${hh}:${mm}</b> ${l.text}</div>`;
  }).join('');
}

function helpSheet() {
  return `
  <p><b>Ironvale</b> is a village that has to feed, arm and outlast an endless horde.
  The valley runs north–south: your village sits at the bottom, the horde comes from the top.</p>
  <h3>Getting around</h3>
  <p><b>Drag</b> the map to pan it. <b>Scroll the wheel</b> to zoom toward your cursor, or
  <b>pinch</b> on a touchscreen. <kbd>+</kbd> and <kbd>−</kbd> zoom too, and <kbd>0</kbd> resets
  to the default framing.</p>
  <p><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> or the arrow keys pan, <kbd>Shift</kbd>+wheel
  scrolls without zooming, and <kbd>Space</kbd> snaps between the village and the front line.</p>
  <h3>Building</h3>
  <p>Click any building to open it. Every building has unlimited levels, and <b>rebuilds its
  architecture every 5 levels</b> — a thatched hut becomes a stone hall, then a tiled and
  bannered one. A green chevron floats over anything you can currently afford.</p>
  <p>The <b>Town Hall</b> caps every other building at its own level + 1, so it is the
  bottleneck you keep coming back to. It is also what the horde is trying to smash.</p>
  <h3>Fighting</h3>
  <p>You do not control troops. The Barracks, Archery Range and Mage Tower train them on a
  timer, they march through the gate on their own, and they hold the line north of the wall.
  Your levers are which buildings you feed:</p>
  <p>· <b>Barracks / Archery / Mage Tower</b> — how fast troops arrive and how hard they hit.<br>
  · <b>Blacksmith</b> — a flat multiplier on the whole army, usually the best coin you spend.<br>
  · <b>Watchtower</b> — shoots anything that reaches the wall; your safety net.<br>
  · <b>Farm</b> — troops eat. At zero food the whole army fights at 60%.</p>
  <h3>Waves</h3>
  <p>Waves never stop and each is bigger and tougher than the last. An <b>Ogre</b> joins every
  fifth wave. Between waves you get ${INTERMISSION} seconds of calm and the Town Hall repairs
  itself. If the Hall falls, the run ends — you keep your buildings and start the waves again.</p>
  <h3>Saving</h3>
  <p>The game saves to this browser automatically. Resources accrue while you are away
  (up to 8 hours' worth), but waves only run while you are watching.</p>
  <div style="margin-top:14px"><button id="wipe" class="cta" style="background:linear-gradient(#8e3a2a,#5c1f14);border-color:#3a120b">Erase save and start over</button></div>`;
}

function refreshSheetCanvases() {
  for (const c of $('sh-body').querySelectorAll('canvas[data-unit]')) {
    drawUnitIcon(c.getContext('2d'), c.dataset.unit, 32);
  }
  const w = $('wipe');
  if (w) w.onclick = () => {
    if (!confirm('Erase your village and every upgrade? This cannot be undone.')) return;
    hardReset();
    location.reload();
  };
}

// ---------------------------------------------------------------------------
// HUD
// ---------------------------------------------------------------------------
let bpTick = 0;
export function updateHud(dt) {
  $('r-gold').textContent  = fmt(S.res.gold);
  $('r-wood').textContent  = fmt(S.res.wood);
  $('r-stone').textContent = fmt(S.res.stone);
  $('r-food').textContent  = fmt(S.res.food);
  $('r-food').style.color  = starving() ? '#e0603f' : '';
  $('r-pop').textContent   = `${popUsed()}/${popCap()}`;

  $('wave-label').textContent = S.phase === 'calm'
    ? `Wave ${S.wave} in ${Math.max(0, Math.ceil(S.timer))}s`
    : `Wave ${S.wave}`;

  checkObjective();
  const o = objective();
  const p = Math.max(0, Math.min(1, o.p()));
  $('quest-text').textContent = o.t;
  $('quest-bar').style.width = (p * 100) + '%';
  $('quest-chk').classList.toggle('done', p >= 1);
  $('quest-bang').style.display = p >= 1 ? '' : 'none';

  const hp = S.hallHp / hallMax();
  $('s-hp-label').textContent = `Town Hall ${Math.max(0, Math.round(S.hallHp))}`;
  $('s-hp-bar').style.width = (Math.max(0, hp) * 100) + '%';
  $('s-army').textContent = `Army ${S.units.length}`;
  $('s-army-bar').style.width = Math.min(100, S.units.length / Math.max(1, popCap()) * 100) + '%';
  $('s-foes').textContent = `Foes ${S.foes.length + S.queue.length}`;
  $('s-foe-bar').style.width = Math.min(100, (S.foes.length + S.queue.length) * 4) + '%';

  $('log-bang').style.display = S.foes.some(f => f.y > 600) ? '' : 'none';

  // keep the open building panel live (cost affordability changes every tick)
  bpTick += dt;
  if (selected && bpTick > 0.35) { bpTick = 0; renderBuildPanel(); }
}

// ---------------------------------------------------------------------------
export function showDefeat(onRestart) {
  $('df-text').innerHTML =
    `The horde broke through on <b>wave ${S.wave}</b> after ${fmt(S.kills)} kills.<br><br>
     Your buildings stand — the walls have been shored up and the Hall repaired.
     The horde regroups from wave 1.`;
  $('defeat').classList.remove('hidden');
  $('df-btn').onclick = () => { $('defeat').classList.add('hidden'); onRestart(); };
}

export function showOffline(gain) {
  const h = Math.floor(gain.away / 3600), m = Math.floor((gain.away % 3600) / 60);
  const parts = Object.entries(gain.gained).filter(([, v]) => v > 0)
    .map(([k, v]) => `${fmt(v)} ${k}`).join(', ');
  if (parts) toast(`Away ${h ? h + 'h ' : ''}${m}m — stores gathered ${parts}`, 'good');
}

// ---------------------------------------------------------------------------
export function wireUi(api) {
  $('bp-close').onclick = closeBuilding;
  $('bp-upgrade').onclick = doUpgrade;
  $('sh-close').onclick = closeSheet;

  for (const btn of document.querySelectorAll('#toolbar button')) {
    btn.onclick = () => {
      const tab = btn.dataset.tab;
      if (tab === 'village') { closeSheet(); closeBuilding(); api.goVillage(); return; }
      if ($('sheet').classList.contains('hidden') === false && $('sh-title').dataset.tab === tab) {
        closeSheet(); return;
      }
      if (tab === 'army') openSheet('Army', armySheet());
      if (tab === 'log')  openSheet('Chronicle', logSheet());
      if (tab === 'help') openSheet('How Ironvale works', helpSheet());
      $('sh-title').dataset.tab = tab;
      refreshSheetCanvases();
    };
  }
}
