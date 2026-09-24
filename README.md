# RINGSIDE ’87 — Frame Lab

A mobile-first, fixed-step boxing game inspired by the timing-puzzle design of the 1987 NES classic. It recreates the opening Minor Circuit bout with original canvas artwork, deterministic state machines, touch controls, synthesized chip audio, offline support, and a live frame telemetry panel.

> **Asset provenance:** no ROM, emulator, ripped sprite, sampled audio, or copyrighted game binary is included. Visuals, animation, sound, and gameplay code are original to this project; historical references informed behavior and composition.

## Run locally

```bash
npm run dev
```

Open <http://localhost:4173>.

There is no build step and no runtime dependency. Any static web server can host the project.

## Controls

| Move | Touch | Keyboard |
|---|---|---|
| Dodge | D-pad left/right | `←` / `→` |
| Block | Hold D-pad down | hold `↓` |
| Duck | Double-tap down | tap `↓` twice |
| Body blow | B / A | `Z` / `X` |
| Face jab | hold up + B / A | `↑` + `Z` / `X` |
| Star uppercut | STAR | `Enter`, `Space`, or `C` |
| Corner recovery | COACH | `Shift` |
| Pause | Pause button | `P` / `Escape` |

## Fidelity targets

- Native 256 × 240 game surface with integer, pixelated scaling.
- Fixed 60.0988 Hz simulation independent of display refresh.
- 20 simulation frames per in-game clock second.
- Separate stamina, heart, and star systems.
- Hand-specific punch speed and damage.
- Guard manipulation, dodge/duck invulnerability, stun combos, counters, knockdowns, ten-counts, three-knockdown TKO, rounds, corner recovery, and decision logic.
- Glass Joe’s opening retreat and return, including a 16-frame interception window and the first-four-frame special KO route.
- Installable Progressive Web App with an offline cache.

See [`RESEARCH.md`](RESEARCH.md) for the mechanical research dossier and implementation map.

## Project structure

```text
index.html          App shell, touch controller, telemetry, research dialog
styles.css          Responsive handheld/cabinet UI and CRT treatment
src/game.js         Fixed-step fight simulation and opponent state machine
src/art.js          Original procedural pixel artwork and screen renderer
src/audio.js        Original Web Audio chip synth and sound effects
src/main.js         Input, mobile events, app controls, and animation loop
manifest.webmanifest / sw.js  Installability and offline support
```
