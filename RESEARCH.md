# Mechanical research dossier

This document records the historical behavior studied for the playable opening-bout reconstruction. It is an implementation reference, not a distribution of game data.

## Primary references

1. **Nintendo instruction manual** — controls; stamina, heart, and star meters; basic technique; between-round recovery.  
   <https://www.nintendo.co.jp/clv/manuals/en/pdf/CLV-P-NAATE.pdf>
2. **TASVideos game resources** — advanced maneuvers, clock behavior, guard manipulation (“gutters”), clock-stop behavior, and opponent-specific strategy.  
   <https://tasvideos.org/GameResources/NES/MikeTysonsPunchout>
3. **TASVideos Glass Joe strategies** — twentieth-hit star route and taunt interception strategies.  
   <https://tasvideos.org/GameResources/NES/MikeTysonsPunchout/GlassJoeStrats>
4. **Community disassembly research by nmikstas** — state-machine organization and commented Glass Joe fight constants.  
   <https://github.com/nmikstas/mike-tysons-punch-out-disassembly>
5. **NESdev disassembly discussion** — cartridge structure, opponent-state data organization, and reverse-engineering notes.  
   <https://forums.nesdev.org/viewtopic.php?t=20615>
6. **TAS / speedrun timing archive** — verified best fight times and frame-sensitive routes.  
   <https://tasvideos.org/56G>
7. **Background map archive** — screen composition and ring/crowd/HUD study.  
   <https://nesmaps.com/maps/MikeTysonsPunchOut/MikeTysonsPunchOutBG.html>

## Reconstructed control model

The NES controller creates a surprisingly broad move set from a D-pad and two face buttons:

- `B`: left body blow.
- `A`: right body blow.
- `Up + B/A`: left/right face jab.
- `Left/Right`: dodge in that direction.
- `Down`: block.
- rapid `Down, Down`: duck.
- `Start`, with a star: uppercut.
- rapid `A/B` while down: attempt to stand.
- `Select` between rounds: one extra recovery opportunity per bout.

The left is faster and weaker; the right is slower and stronger. The web build retains hand-specific startup and recovery rather than treating both punch buttons as aliases.

## Three independent resources

| Resource | Studied behavior | Web implementation |
|---|---|---|
| Stamina | Damage drains the white bar; zero causes a knockdown | 96-point stamina model with opponent-specific damage |
| Hearts | Misses, blocks, and incoming punches drain fighting spirit; zero prevents punching | Starts at 20 against Joe; clean evasion restores 3 |
| Stars | Timely/qualified hits award stars; taking a hit can lose one; maximum three | Counter windows plus Joe’s guaranteed twentieth-hit star; spent on uppercuts |

Hearts are deliberately not presented as “lives” or health. This distinction is central to the original design: a player can have stamina remaining but be temporarily unable to attack.

## Timing model

### Console cadence

- NTSC NES video cadence is approximately **60.0988 frames per second**.
- Punch-Out’s fight clock commonly advances at **20 frames per in-game second**, making displayed fight time run roughly three times faster than wall time.
- Historical result decimals use a small set of displayed increments rather than arbitrary hundredths.

The web game uses a `1000 / 60.0988 ms` fixed simulation step and an accumulator. Combat never uses variable `requestAnimationFrame` delta time, so a 120 Hz phone and a 60 Hz laptop run identical fight logic.

### Input latency

Touch controls use Pointer Events, avoid a click delay, support multiple simultaneous pointers (`Up + Punch`), and set `touch-action: none`. Input is sampled on the next fixed simulation step. Rendering can interpolate independently, although collision logic remains integer-frame deterministic.

## Glass Joe profile

Commented disassembly data and TAS documentation establish useful opening-fight constants:

- Starting hearts: **20**.
- A guaranteed star arrives on the **20th qualifying hit**; later star opportunities repeat.
- Joe has a deliberately slow high/low guard reaction, enabling the technique runners call a **gutter**: induce high guard with `Up`, release, then hit the body before he reacts.
- Joe retreats for his special opening taunt near the **0:40** sequence (runner setups often observe the retreat around 0:38).
- His return has a **16-frame interception window**.
- Connecting in the opening **four frames** of that window produces the famous immediate-KO route, conventionally recorded as **0:42.00 / 0:42.25** depending on exact timing.
- A later hit in the 16-frame window still causes an instant knockdown, but Joe rises.

### State-machine translation

```text
IDLE / GUARD
  ├─ high/low guard reaction
  ├─ normal tell → hook/jab → hit, block, or vulnerable recovery
  └─ timed retreat → taunt → rush
                             ├─ frames 1–4 of vulnerable span: special KO
                             ├─ frames 5–16: knockdown, rises
                             └─ outside span: block / Joe attacks
```

The implementation does not copy assembly or binary data. It translates documented behavioral facts into an original JavaScript state machine with new timing tables suitable for touch screens.

## Fight rules implemented

- Three rounds of three displayed minutes.
- KO when a boxer does not rise by ten.
- TKO on a third knockdown in one round.
- Increasing mash requirement across Mac knockdowns.
- Opponent stamina refills after standing.
- One between-round coach recovery.
- Score-based decision after round three.
- Stars capped at three and reduced when Mac is hit.
- Clean evasion opens a counter-combo window.
- Repeated attacks teach Joe to cover that zone; face/body variation beats his guard.

## Presentation study

The visual target is the *composition language* of an NES broadcast rather than a sprite rip:

- 256 × 240 internal surface.
- cream tile HUD, black meter wells, blue timer panel.
- red/black crowd rows and three rope bands.
- bright Minor Circuit blue canvas.
- tiny foreground player for an unobstructed read of the oversized opponent.
- sharply staged anticipation frames, short hit-freezes, camera shake, sweat pixels, and high-contrast tells.

All fighters, portraits, HUD elements, lettering, particles, and animations are drawn procedurally in `src/art.js`. Web Audio oscillators and generated noise create every sound in `src/audio.js`.

## Mobile decisions

The original controller required simultaneous `Up + A/B`. The on-screen controller preserves that via multi-touch rather than introducing a simplified “high punch” button. The app also:

- fits common portrait phone widths down to 320 CSS pixels;
- respects safe-area insets;
- prevents browser panning/zoom gestures only on the game controls;
- pauses when the page loses focus;
- supports fullscreen and standalone PWA display;
- caches the complete dependency-free build for offline play;
- supplies keyboard parity for desktop testing.

## Known scope boundary

This release is a deeply modeled **opening-bout vertical slice**, not a ROM reimplementation of the complete career. The architecture separates opponent AI, rendering, input, and frame simulation so additional original opponents and circuits can be added without changing the input or fight-rule core.
