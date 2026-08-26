# Ironvale

A pixel-art village builder welded to an endless auto-battler. Your village sits
at the south end of the valley; the horde comes from the north. Upgrade buildings
to raise and arm an army that marches out on its own and holds the line — wave
after wave, forever.

**No build step, no dependencies.** It is plain HTML, CSS and ES modules.

| Tier I — thatch and timber | Tier V — stone, tile and banners |
|---|---|
| ![tier I village](docs/tier1.png) | ![tier V village](docs/tier5.png) |

*The same village, same camera. Every building rebuilds its art every 5 levels.*

## Running it

Because it uses ES modules, it needs to be served over HTTP rather than opened
from the filesystem. Any static server works:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

The repo also ships a GitHub Pages workflow. To get a public URL, go to
**Settings → Pages** and set **Source** to **GitHub Actions** — the next push to
`main` publishes the game automatically.

## How it plays

The valley scrolls vertically. Drag the map, use the wheel, press `W`/`S` or the
arrow keys, or hit `Space` to snap between the village and the front line.

**Buildings have unlimited levels and rebuild their architecture every 5 levels.**
A thatched timber hut becomes a stone hall, then a tiled and bannered one, then a
gold-trimmed one — five distinct tiers of art per building, all drawn
procedurally. A green chevron floats over anything you can currently afford.

The **Town Hall** caps every other building at its own level + 1, so it is the
bottleneck you keep returning to. It is also the thing the horde is trying to
smash: when its HP reaches zero the run ends, your buildings survive, and the
waves restart from 1.

You never control troops directly. The Barracks, Archery Range and Mage Tower
train them on a timer, they walk out through the gate themselves, and they hold a
line north of the wall. Your levers are which buildings you feed:

| Building | What it does |
|---|---|
| Barracks | Militia, and armoured Knights from level 8 |
| Archery Range | Archers — out-range everything until the shamans arrive |
| Mage Tower | Splash damage; needs Town Hall 6 before it can be raised |
| Blacksmith | Flat attack + health multiplier on the whole army |
| Watchtower | Shoots anything that reaches the palisade |
| Farm | Troops eat. At zero food the army fights at 60% |
| Lumber Camp / Quarry / Market | Wood, stone and gold income |
| Tavern | Population cap and a cut of all gold |

Waves scale quadratically rather than exponentially, so late waves bite without
the wall-clock blow-up that makes idle games unplayable around wave 40. An Ogre
joins every fifth wave, and a second one every 25 waves after that.

Progress saves to `localStorage` automatically. Resources accrue while you are
away (capped at 8 hours), but waves only run while you are watching.

## Layout

```
index.html            markup + HUD chrome
style.css             panel / toolbar / sheet styling
src/
  config.js           EVERY tuning number — costs, curves, troop and foe stats
  state.js            game state, derived stats, save / load / offline catch-up
  main.js             boot, game loop, defeat handling
  input.js            camera drag / wheel / keys, building picking
  render.js           camera, depth sorting, the draw call
  art/
    prims.js          pixel primitives + material palettes
    buildings.js      procedural building art, one renderer per building × tier
    units.js          troop, foe and villager sprites
    terrain.js        one-off world generation (ground, roads, mountains, palisade)
  sim/
    economy.js        production, upkeep, troop training
    combat.js         waves, targeting, projectiles, damage, deaths
    village.js        ambient villagers and hens
```

### Notes for changing things

- **All balance lives in `src/config.js`.** Nothing else hardcodes a number.
  `waveHp` / `waveDmg` / `waveCount` are the difficulty curve; `costFor` and each
  building's `base` + `mul` are the economy.
- **Art is procedural, not sprite sheets.** `src/art/buildings.js` has one
  function per building that takes `(g, x, y, w, h, tier)` and composes walls,
  roofs, windows and trim from `prims.js`. That is what makes five visual tiers
  per building affordable — and why adding a sixth is a couple of `if (t >= 6)`
  lines rather than a new asset.
- Rendering happens on a fixed **400 px logical grid** scaled up with smoothing
  off. The logical *height* follows the window aspect, so the picture always
  fills the screen. One unit in draw code is one chunky pixel on screen.
- Building sprites are cached per `(id, tier)` and invalidated on upgrade;
  animated bits (forge glow, chimney smoke, the mage tower's orb) are drawn live
  on top in `buildingFx`.
- Coordinates come in two flavours and mixing them up is the bug you will hit:
  **world** Y (0 at the horde's camp, 910 at the back of the village) and
  **screen** Y (`world - camera`). `pick()` and every `draw*` helper take screen Y.
- `window.IV` is exposed in the browser console: `IV.S` is live state and
  `IV.ff(seconds)` fast-forwards the simulation, which is how the balance above
  was checked.

## Not built yet

- No prestige layer — a defeat restarts the waves but keeps everything, so very
  long runs eventually plateau against the wave curve.
- Troops have no formation or targeting orders; positioning is emergent.
- No audio.
- Enemy variety stops at five types; the wave table in `config.js` is where more
  would go.
