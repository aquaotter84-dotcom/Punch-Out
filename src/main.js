import { AudioEngine } from "./audio.js";
import { Renderer } from "./art.js";
import { Game, STEP_MS, NES_FPS } from "./game.js";

class InputManager {
  constructor(onActivity) {
    this.sources = new Map();
    this.justPressed = new Set();
    this.onActivity = onActivity;
  }

  press(action, source = `manual:${action}`) {
    if (!this.sources.has(action)) this.sources.set(action, new Set());
    const set = this.sources.get(action);
    if (set.size === 0) {
      this.justPressed.add(action);
      this.onActivity?.(action);
    }
    set.add(source);
  }

  release(action, source = `manual:${action}`) {
    const set = this.sources.get(action);
    if (!set) return;
    set.delete(source);
    if (set.size === 0) this.sources.delete(action);
  }

  releaseSource(source) {
    for (const [action, set] of this.sources) {
      if (set.has(source)) {
        set.delete(source);
        if (set.size === 0) this.sources.delete(action);
      }
    }
  }

  held(action) { return (this.sources.get(action)?.size || 0) > 0; }
  pressed(action) { return this.justPressed.has(action); }
  endFrame() { this.justPressed.clear(); }

  pulse(action) {
    const token = `pulse:${action}:${performance.now()}`;
    this.press(action, token);
    queueMicrotask(() => this.release(action, token));
  }

  clear() {
    this.sources.clear();
    this.justPressed.clear();
  }
}

const canvas = document.querySelector("#gameCanvas");
const playOverlay = document.querySelector("#playOverlay");
const soundToggle = document.querySelector("#soundToggle");
const fullscreenButton = document.querySelector("#fullscreenButton");
const pauseButton = document.querySelector("#pauseButton");
const restartButton = document.querySelector("#restartButton");
const helpButton = document.querySelector("#helpButton");
const openDossier = document.querySelector("#openDossier");
const closeDossier = document.querySelector("#closeDossier");
const labDialog = document.querySelector("#labDialog");
const toastRegion = document.querySelector("#toastRegion");
const frameReadout = document.querySelector("#frameReadout");
const inputReadout = document.querySelector("#inputReadout");
const stateReadout = document.querySelector("#stateReadout");
const fpsReadout = document.querySelector("#fpsReadout");
const bestReadout = document.querySelector("#bestReadout");
const coachTip = document.querySelector("#coachTip");
const coachState = document.querySelector("#coachState");
const roundLeds = [1, 2, 3].map((n) => document.querySelector(`#roundLed${n}`));

const audio = new AudioEngine();
let lastInputLabel = "—";
const actionLabels = {
  up: "UP / FACE",
  down: "DOWN / BLOCK",
  left: "DODGE LEFT",
  right: "DODGE RIGHT",
  a: "A / RIGHT",
  b: "B / LEFT",
  start: "STAR / START",
  select: "COACH",
  pause: "PAUSE",
};

const input = new InputManager((action) => {
  lastInputLabel = actionLabels[action] || action.toUpperCase();
  inputReadout.textContent = lastInputLabel;
});

function toast(message) {
  const element = document.createElement("div");
  element.className = "toast";
  element.textContent = message;
  toastRegion.append(element);
  window.setTimeout(() => element.remove(), 2700);
}

function haptic(pattern) {
  if ("vibrate" in navigator) navigator.vibrate(pattern);
}

let telemetryTick = 0;
const game = new Game(audio, {
  toast,
  haptic,
  screen(screen, instance) {
    playOverlay.classList.toggle("is-hidden", screen !== "title");
    updateRoundLeds(instance.round);
    document.body.dataset.screen = screen;
  },
  telemetry(instance) {
    telemetryTick += 1;
    if (telemetryTick % 7 !== 0) return;
    frameReadout.textContent = String(instance.globalFrame).padStart(6, "0");
    stateReadout.textContent = instance.getStateLabel();
    bestReadout.textContent = instance.best;
    updateRoundLeds(instance.round);
    updateCoach(instance);
  },
});
const renderer = new Renderer(canvas);

function updateRoundLeds(round) {
  roundLeds.forEach((led, index) => led.classList.toggle("active", index + 1 === round));
}

function updateCoach(instance) {
  let state = "SCOUTING";
  let tip = "Joe reads your guard. Mix face jabs with body blows and stay loose.";
  if (instance.screen === "prefight") {
    state = "TALE OF TAPE";
    tip = "Fast left, stronger right. Hold up with either punch to work the jaw.";
  } else if (instance.screen === "roundIntro") {
    state = "SECONDS OUT";
    tip = "Watch his gloves—not the clock. Every attack begins with a readable tell.";
  } else if (instance.screen === "fight") {
    state = `${instance.getClockText()} / R${instance.round}`;
    if (instance.mac.tired) tip = "You’re winded! Stop punching. Dodge cleanly to rebuild three hearts.";
    else if (instance.joe.state === "backstep" || instance.joe.state === "taunt") tip = "Here it comes. Let Joe step in, then intercept the first four vulnerable frames.";
    else if (instance.joe.state === "rush") tip = "NOW! Fire a punch as he crosses center. The full intercept window is 16 frames.";
    else if (instance.joe.state.startsWith("tell")) tip = "That twitch is the tell. Dodge now, then unload while Joe is open.";
    else if (instance.joe.state === "vulnerable") tip = "He missed. Alternate hands before his guard comes back online.";
    else if (instance.roundSeconds >= 34 && !instance.specialTriggered) tip = "At :38 Joe retreats. Your punch must meet him on the way back in.";
    else tip = "Make him raise his gloves with ↑, release, then sneak a body blow underneath.";
  } else if (instance.screen === "count") {
    state = "COUNTING";
    tip = instance.downFor === "mac" ? "Mash both punch buttons. Later knockdowns demand more fighting spirit." : "Stay composed. Three knockdowns in one round earn the TKO.";
  } else if (instance.screen === "corner") {
    state = "BETWEEN ROUNDS";
    tip = instance.coachUsed ? "Coach is spent. Breathe, reset, and press a punch when ready." : "Tap COACH once per bout to recover extra stamina before the next round.";
  } else if (instance.screen === "result") {
    state = instance.result?.winner === "mac" ? "VICTORY" : "BACK TO WORK";
    tip = instance.result?.special ? "That was the famous 42.00 route: first four frames of Joe’s return." : "Every clean evade creates your safest counter-punch window.";
  }
  coachState.textContent = state;
  coachTip.textContent = tip;
}

const keyMap = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  KeyZ: "b",
  KeyX: "a",
  KeyA: "a",
  KeyB: "b",
  KeyC: "start",
  Enter: "start",
  Space: "start",
  ShiftLeft: "select",
  ShiftRight: "select",
  KeyP: "pause",
  Escape: "pause",
};

window.addEventListener("keydown", (event) => {
  const action = keyMap[event.code];
  if (!action) return;
  event.preventDefault();
  if (!event.repeat) {
    audio.unlock();
    input.press(action, `key:${event.code}`);
  }
}, { passive: false });

window.addEventListener("keyup", (event) => {
  const action = keyMap[event.code];
  if (!action) return;
  event.preventDefault();
  input.release(action, `key:${event.code}`);
}, { passive: false });

window.addEventListener("blur", () => {
  input.clear();
  if (game.screen === "fight" && !game.paused) game.togglePause(true);
});

const controlButtons = [...document.querySelectorAll("[data-action]")];
for (const button of controlButtons) {
  const action = button.dataset.action;
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    // Queue the input before resuming audio so first-contact latency never
    // depends on AudioContext startup. Sound unlock still occurs in the same
    // trusted pointer gesture.
    const token = `pointer:${event.pointerId}`;
    button.setPointerCapture?.(event.pointerId);
    button.classList.add("pressed");
    input.press(action, token);
    audio.unlock();
  });
  const release = (event) => {
    const token = `pointer:${event.pointerId}`;
    button.classList.remove("pressed");
    input.release(action, token);
  };
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("lostpointercapture", release);
  button.addEventListener("contextmenu", (event) => event.preventDefault());
}

async function activateGame() {
  await audio.unlock();
  if (game.screen === "title") game.startBout();
  else input.pulse("start");
}

playOverlay.addEventListener("click", activateGame);
canvas.addEventListener("pointerdown", async (event) => {
  event.preventDefault();
  if (game.screen === "title" || game.screen === "prefight" || game.screen === "result") await activateGame();
});

soundToggle.addEventListener("click", async () => {
  await audio.unlock();
  const enabled = audio.toggle();
  soundToggle.classList.toggle("is-muted", !enabled);
  soundToggle.setAttribute("aria-pressed", String(!enabled));
  soundToggle.setAttribute("aria-label", enabled ? "Mute sound" : "Enable sound");
  toast(enabled ? "SOUND ON" : "SOUND MUTED");
});
soundToggle.classList.toggle("is-muted", !audio.enabled);
soundToggle.setAttribute("aria-pressed", String(!audio.enabled));

fullscreenButton.addEventListener("click", async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen({ navigationUI: "hide" });
  } catch {
    toast("FULLSCREEN ISN’T AVAILABLE HERE");
  }
});

document.addEventListener("fullscreenchange", () => {
  fullscreenButton.setAttribute("aria-label", document.fullscreenElement ? "Exit fullscreen" : "Enter fullscreen");
});

pauseButton.addEventListener("click", async () => {
  await audio.unlock();
  game.togglePause();
});

restartButton.addEventListener("click", async () => {
  await audio.unlock();
  game.goTitle();
  toast("BOUT RESET");
});

function showDossier() {
  if (typeof labDialog.showModal === "function") labDialog.showModal();
  else labDialog.setAttribute("open", "");
}
helpButton.addEventListener("click", showDossier);
openDossier.addEventListener("click", showDossier);
closeDossier.addEventListener("click", () => labDialog.close());
labDialog.addEventListener("click", (event) => {
  if (event.target === labDialog) labDialog.close();
});

let lastTime = performance.now();
let accumulator = 0;
let renderedFrames = 0;
let fpsWindowStart = lastTime;

function loop(now) {
  let delta = now - lastTime;
  lastTime = now;
  if (delta > 100) delta = STEP_MS;
  accumulator += delta;
  let steps = 0;
  while (accumulator >= STEP_MS && steps < 6) {
    game.update(input);
    input.endFrame();
    accumulator -= STEP_MS;
    steps += 1;
  }
  if (steps === 6 && accumulator > STEP_MS * 6) accumulator = 0;

  renderer.render(game);
  renderedFrames += 1;
  if (now - fpsWindowStart >= 1000) {
    const measured = renderedFrames * 1000 / (now - fpsWindowStart);
    fpsReadout.textContent = `${measured.toFixed(2)} FPS`;
    renderedFrames = 0;
    fpsWindowStart = now;
  }
  requestAnimationFrame(loop);
}

renderer.render(game);
updateCoach(game);
bestReadout.textContent = game.best;
fpsReadout.textContent = `${NES_FPS.toFixed(2)} FPS`;
requestAnimationFrame(loop);

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
}
