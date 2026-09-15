# NUKE 3000 — ARMAGEDDON PROTOCOL
### Strategic Board Game · Online Playtester v0.3

---

## Overview

NUKE 3000 is a 3–6 player strategic board game set in a post-apocalyptic world divided into 12 regions and 59 territories. Each player controls one of 6 asymmetric factions competing for world domination through military conquest, nuclear development, and missile warfare.

This repository contains an interactive digital playtester built as a web application. It supports solo play against CPU opponents and is designed to be extended with online multiplayer via Firebase.

---

## Project Structure

```
nuke3000/
├── index.html                  ← Entry point (served version, loads assets from files)
├── nuke3000-standalone.html    ← Self-contained single file (works via file://, no server needed)
├── css/
│   └── game.css                ← All styles (dark theme, Orbitron font, hex grid, modals)
├── js/
│   ├── assets.js               ← Asset loader (converts files to base64 data URIs)
│   ├── data.js                 ← Static game data (territories, regions, factions, rules)
│   ├── state.js                ← Global state (G object, G_step, STEPS, VICTORY_DETAIL)
│   ├── setup.js                ← Setup phase logic (roll order, claim, place soldiers/nuclears)
│   ├── map.js                  ← SVG map rendering, pan/zoom, territory drawing
│   ├── engine.js               ← Turn engine (phases, step runner, CPU AI, maintenance)
│   ├── combat.js               ← Combat system (dice, missiles, movement popup)
│   └── ui.js                   ← UI layer (lobby, faction cards, log, rules editor)
└── assets/
    ├── tablero.jpg             ← Background map image (1672×940px, rendered at 1400×787)
    └── units/
        ├── soldier.png         ← Unit sprites (from NUKE LORE PDF)
        ├── mech.png
        ├── aircraft.png
        ├── scorpion.png
        ├── nuclear.png         ← Nuclear Complex icon
        ├── imp_portrait.jpg    ← Faction leader portraits
        ├── lib_portrait.jpg
        ├── clt_portrait.jpg
        ├── erb_portrait.jpg
        ├── prm_portrait.jpg
        └── shn_portrait.jpg
```

---

## Running the Game

### Option A — Standalone (no server)
Open `nuke3000-standalone.html` directly in Chrome/Firefox. All assets are embedded as base64. No server required.

> ⚠ Chrome blocks some features on `file://` URLs. If you see security errors, use Option B.

### Option B — Local server (recommended for development)
```bash
# Python
python3 -m http.server 8080

# Node.js
npx serve .

# Then open: http://localhost:8080
```

### Option C — GitHub Pages (free hosting)
1. Push this folder to a GitHub repository
2. Go to Settings → Pages → Source: main branch / root
3. Your game is live at `https://yourusername.github.io/nuke3000`

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla HTML/CSS/JS (no frameworks) |
| Map rendering | SVG (inline, programmatic) |
| Fonts | Google Fonts — Orbitron |
| Assets | Base64-embedded PNGs/JPGs |
| Hosting | Static (GitHub Pages / Netlify / Vercel) |
| Multiplayer (planned) | Firebase Realtime DB or Firestore |

---

## Game Architecture

### Global State Object (`G`)
```javascript
let G = {
  pf: 'imp',           // player's faction key
  pname: 'COMANDANTE', // player name
  playerCount: 4,      // 3-6
  round: 1,
  phase: 'prep',       // 'prep' | 'combat' | 'end'
  territories: {},     // { [id]: TerritoryState }
  factions: {},        // { [fk]: FactionState }
  setup: {
    order: [],         // faction keys in turn order (set after dice roll)
    orderIdx: 0,
    rollResults: {},   // fk -> D6 roll
    _inSetup: true,
  },
  sel: null,           // selected territory id
  moveSrc: null,       // movement origin territory id
  attackSrc: null,     // combat origin territory id
  nuclearMode: false,
  missileFiringMode: false,
  moveMode: false,
  moveTargets: null,   // Set of reachable territory ids (BFS)
  vx: 0, vy: 0, vscale: 1, vscaleMin: 0.1,
  dragging: false,
}
```

### Turn Engine State (`G_step`)
```javascript
let G_step = {
  phase: 'prep',       // current phase
  idx: 0,              // current step index within phase
  isMyTurn: true,      // is it the human player's turn?
  currentFk: 'imp',    // faction key of active player
}
```

### Territory State
```javascript
// G.territories['01_01'] example:
{
  id: '01_01',
  region: 'r01',
  owner: 'imp',        // faction key or null
  soldiers: 3,
  mechs: 1,
  aircraft: 0,
  scorpions: 0,
  hasNuclear: false,
  cx: 212.0, cy: 136.2, // SVG center coordinates
  adj: ['01_02', '01_03'], // adjacent territory ids
  missiles: 0,
}
```

### Faction State
```javascript
// G.factions['imp'] example:
{
  name: 'IMPERATORS',
  color: '#C8A800',
  dimColor: '#3a3000',
  leader: 'Augustus XXVII',
  plutonium: 6,
  missiles: 2,
  alive: true,
  pendingSoldiers: 0,     // reinforcements not yet placed
  _plutIncome: 4,         // last income (for display)
  _reinfIncome: 3,
  missilesFiredThisTurn: 0,
  eliminatedArmies: 0,
  conqueredThisTurn: 0,
}
```

---

## Map System

### Hex Grid
- **Type:** Flat-top hexagons
- **Radius:** R = 44px (territory circle), HEX_R = 44
- **Grid:** col step dX = 66px, row step dY = 76.2px, odd cols offset = 38.1px
- **Origin:** ML = 80, MT = 60
- **Map canvas:** 1400 × 787px (SVG coordinate space)
- **Background:** `assets/tablero.jpg` (1672 × 940px, rendered at 1400 × 787)

### Antarctica (double-hex territories)
Three territories in Antarctica are rendered as merged double-hexagons (10-sided convex hull polygons). They have both `cx/cy` (primary hex center) and `cx2/cy2` (secondary hex center) fields and count as **1 territory / 1 movement step** despite covering 2 hex cells.

Antarctica pairs: `(7,7)+(8,8)`, `(9,7)+(10,8)`, `(11,7)+(12,8)` in column/row notation.

### Regions (12 total)
| ID | Name | Territories | Color |
|----|------|-------------|-------|
| r01 | North America | 7 | `#b8982a` |
| r02 | Greenland | 2 | `#9999bb` |
| r03 | Central America | 2 | `#4a8840` |
| r04 | South America | 7 | `#7a44bb` |
| r05 | Europe | 7 | `#88cc00` |
| r06 | Russia | 6 | `#3a8888` |
| r07 | Middle East | 3 | `#cc8833` |
| r08 | Africa | 8 | `#886622` |
| r09 | Asia | 7 | `#8833cc` |
| r10 | Southeast Asia | 2 | `#33aacc` |
| r11 | Oceania | 5 | `#cc3366` |
| r12 | Antarctica | 3 | `#4488aa` |

---

## Factions

| Key | Name | Color | Leader | Ability | Victory Condition |
|-----|------|-------|--------|---------|-------------------|
| `imp` | IMPERATORS | `#C8A800` | Augustus XXVII | +1 lowest defense die | 5 full regions OR 30 territories |
| `lib` | LIBERTOS | `#4A7C3F` | Vance Cruz | +5 Pu +5 sol per Nuclear destroyed | 6 regions without Nuclear OR 4 + eliminate Erebus |
| `clt` | TAL-MAUT | `#8B1A1A` | Malak-Maut | +1 lowest attack die | Conquer 10 + eliminate army same turn OR 1 Nuclear per enemy |
| `erb` | EREBUS SWARM | `#5555aa` | IA Colmena | Place reinforcements anywhere | Eliminate 2 full armies OR 1 + most Plutonium |
| `prm` | PROMETHEUS | `#1B4F8A` | Skye Apex | +1 Pu per 2 Nuclears | Nuclear in 7 regions OR 2× next player |
| `shn` | SHININ | `#b0b0b0` | Shin Khang | +1 soldier per 2 Nuclears | Largest army (AP) in 6 regions OR 2× next player |

---

## Units & Army Points (AP)

| Unit | Cost | AP Value | Attack Die | Defense Die |
|------|------|----------|------------|-------------|
| Soldier | base | 1 | D6 | D6 |
| Mech | 3 Sol + 1 Pu | 3 | D12 | D12 |
| Aircraft | 3 Sol + 1 Pu | 3 | D12 | D12 |
| Scorpion | 2 Mech + 1 Pu | 6 | D20 | D20 |

Max 5 Aircraft on the board per faction. Max attack dice: 5. Defense dice: min(attack dice, 4) — Risk-style.

---

## Turn Structure

Each player completes all 3 phases of their turn before the next player goes:

```
Player 1: PREP → COMBAT → END
Player 2: PREP → COMBAT → END
Player 3: PREP → COMBAT → END
...
```

### PREP Phase Steps
1. **Income** (auto) — +2 Pu per Nuclear; +⌊territories/2⌋ + regional bonus + Nuclears soldiers
2. **Reinforcements** — place soldiers in territories with Nuclear Complex (or 1 per region if none)
3. **Upgrades** (optional) — convert soldiers to Mechs/Aircraft/Scorpions
4. **Move** (optional) — up to 3 territory hops through owned territories (BFS)
5. **Missiles** (optional) — build (1 Pu each, max 5) then fire
6. **Build Nuclear** (optional) — 5 Pu per Complex

### COMBAT Phase Steps
1. **Attack** (optional) — select origin → click enemy adjacent territory → dice modal
2. **Move** (optional) — reposition units

### END Phase Steps
1. **Regroup** — move units (same as prep movement)
2. **Maintenance** — D20 per Nuclear Complex; roll 1 = explosion (removes Nuclear + ground units)

---

## Combat System

### Player attacks
1. Click own territory (origin set)
2. Click enemy adjacent territory
3. Dice modal opens → "LANZAR DADOS" → both sides roll simultaneously
4. Results shown → CONTINUAR / RETIRAR / TERMINAR

### CPU attacks player
1. Modal shows "¡X TE ATACA!" with territory highlighted red on map
2. "VER TIRADA ATACANTE" → CPU dice animate
3. "LANZAR DEFENSA" → player rolls defense dice
4. Results resolved

### Conquest
On conquest, attacking units move to captured territory. Cheapest unit (soldier → mech → aircraft → scorpion) stays in origin territory.

### Missiles
- Fire at any enemy territory (not adjacent required)
- Defender may intercept if they have missiles: D6 ≥ 4 = intercept (missile consumed regardless of result)
- Cannot eliminate last unit in territory
- Hit resolution: soldier = auto-eliminated; mech D6≥5; aircraft/scorpion D6=6

---

## Rules Configuration

All game rules are editable at runtime via the ⚙ REGLAS button (available in lobby before game start). Rules are stored in the `RULES` object (deep copy of `DEFAULT_RULES`).

Key configurable values:
- Starting assets per player count (soldiers, missiles, nukes, territories)
- Plutonium income rate
- Reinforcement calculation
- Unit upgrade costs
- Combat dice counts and unit dice sizes
- Maintenance explosion probability
- Victory conditions per faction

---

## Planned: Online Multiplayer (Firebase)

### Architecture
```
GitHub Pages (static hosting)     Firebase (Google Cloud)
  nuke3000/                          Firestore
    index.html  ──loads──▶ 🌐           rooms/{roomId}/
    js/*.js     ◀──sync────────────────   state: GameState
                                          actions: Action[]
                                          players: PlayerMap
```

### Room flow
1. Player creates room → generates 6-char code → writes initial state to Firestore
2. Others enter code → join room → subscribe to `onSnapshot`
3. Each action validates locally then writes to Firestore as a transaction
4. All clients receive updates in <1s via `onSnapshot` listener
5. `userId` stored in `localStorage` → reconnect to same room on refresh

### File to add
```javascript
// js/online.js
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, onSnapshot, runTransaction } from 'firebase/firestore';

// firebase-config.js (gitignored — add your own)
// export const firebaseConfig = { apiKey: '...', ... }
```

### State sync strategy
- **Full state sync** on join (snapshot of entire `GameState`)
- **Action-based deltas** during play (each action written as `{type, payload, timestamp, playerId}`)
- **Server-side validation** via Firebase Cloud Functions (prevents cheating)
- **Reconnection** via `localStorage` `roomId` + `userId`

---

## Development Notes

### Adding a new faction
1. Add entry to `FDATA` in `js/data.js`
2. Add victory condition to `DEFAULT_RULES.victory` in `js/data.js`
3. Add `VICTORY_DETAIL_FULL` entry in `js/state.js`
4. Add portrait to `assets/units/`
5. Handle faction ability in `applyIncome()` and `resolveCombatRound()` in `js/engine.js` / `js/combat.js`

### Adding a new territory
1. Add entry to `TERRITORIES_DEF` in `js/data.js` with correct `id`, `region`, `cx`, `cy`, `adj`
2. Update `adj` arrays of neighboring territories
3. Update `REGIONS` size count

### Key functions reference
| Function | File | Description |
|----------|------|-------------|
| `startGame()` | ui.js | Lobby → game transition |
| `startSetupPhase()` | setup.js | Begins roll/claim/place flow |
| `endSetupPhase()` | setup.js | Setup → game transition |
| `startPhase(phase, fk)` | engine.js | Begin a phase for a faction |
| `endPhaseForFaction()` | engine.js | Advance turn (prep→combat→end→next player) |
| `runCurrentStep()` | engine.js | Execute current step in phase |
| `applyIncome(fk)` | engine.js | Calculate and apply Pu + reinforcements |
| `openDice(targetId)` | combat.js | Player initiates attack |
| `openDiceCpu(src, tgt, fk, cb)` | combat.js | CPU initiates attack |
| `applyBattleResult(aR, dR)` | combat.js | Resolve dice rolls, apply losses |
| `updateMap()` | map.js | Redraw all territories on SVG |
| `refreshCards()` | ui.js | Redraw faction panel + turn order |
| `addLog(msg, type)` | ui.js | Append to game log |

### Log types
| Type | Use |
|------|-----|
| `sys` | System messages, phase transitions |
| `res` | Positive results (income, placement) |
| `combat` | Combat events |
| `move` | Movement events |
| `win` | Victory declaration |

---

## Credits

Game design: S. Pardo  
Digital implementation: Claude (Anthropic)  
Assets: NUKE LORE v1 / NUKE REGLAMENTO v2

---

## License

Private project — all rights reserved.
