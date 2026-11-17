# makefun-best-game-04 — Prisma, Crystal Breaker

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/rioxbt/makefun-best-game-04/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/rioxbt/makefun-best-game-04/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

Prisma is an original neon crystal-breaker: five sectors of coloured crystals hang over your paddle,
one white pulse bounces between them, and the wall answers back. Move the paddle with the mouse or
the arrow keys, bend the pulse with the edge you catch it on, chain crystals while your combo
multiplies the score, and bank eight breaks to fire the Prism Lance that splits a whole column. Three
lives, five sectors, and a vault that only opens when the last crystal is gone. Every sound is a
short synthesised blip, every crystal is drawn in code, and the game runs from its own static files
with no build step and no network request.

## Run it

Play the game (any static server will do — there is no build step):

```sh
node serve.ts                 # serves game/ at http://localhost:8080
```

Hand the entry in — this writes `out/` exactly as the grader's `/output` (Node 22.18 or later,
which runs `main.ts` and its TypeScript as it is):

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## What is here

| Path | What it is |
| --- | --- |
| `game/index.html` | The page: a 1280x720 canvas and one module script. |
| `game/src/config.js` | Every tuning number and colour. |
| `game/src/levels.js` | The five sector layouts, as grids of crystal glyphs. |
| `game/src/world.js` | The rules: paddle, pulse, crystals, drops, lance, score, lives. |
| `game/src/render.js` | Drawing: crystals, pulse, sparks, HUD and every menu panel. |
| `game/src/audio.js` | The synthesised blips, no audio files. |
| `game/src/input.js` | Mouse and keyboard in one place. |
| `game/src/shots.js` | The deterministic screenshot scenes. |
| `game/src/main.js` | Boot, screens and the fixed-step loop. |
| `game/src/random.js` | The seeded generator that makes a scene repeat. |
| `main.ts` | The program that hands the game in: `game/` and `screenshots/` to `/output` plus `dossier.json`. |
| `serve.ts` | A tiny static server for playing `game/` locally. |
| `shots.json` | The `?shot=` URLs the screenshots were taken from. |
| `vendor/makefun-game.ts` | The kit's library, unchanged, that writes the dossier. |

## Controls

Move the paddle with the mouse or `←` `→` (`A` `D`). Click or press `Space` to launch the pulse.
Press `E` or right-click to fire the Prism Lance once eight crystals are charged. Press `P` to pause.

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
