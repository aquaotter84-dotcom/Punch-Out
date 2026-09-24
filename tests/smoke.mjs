import assert from "node:assert/strict";

globalThis.localStorage = {
  values: new Map(),
  getItem(key) { return this.values.get(key) ?? null; },
  setItem(key, value) { this.values.set(key, String(value)); },
};

const { Game } = await import("../src/game.js");

class TestInput {
  constructor() {
    this.pressSet = new Set();
    this.heldSet = new Set();
  }
  pressed(action) { return this.pressSet.has(action); }
  held(action) { return this.heldSet.has(action); }
  set(actions = [], held = actions) {
    this.pressSet = new Set(actions);
    this.heldSet = new Set(held);
  }
  clear() {
    this.pressSet.clear();
    this.heldSet.clear();
  }
}

const silentAudio = {
  context: {},
  sfx() {},
  startMusic() {},
  stopMusic() {},
};

function freshFight() {
  const game = new Game(silentAudio);
  const input = new TestInput();
  game.startBout();
  game.beginRound();
  while (game.screen !== "fight") game.update(input);
  return { game, input };
}

function framePerfectRoute() {
  const { game, input } = freshFight();
  let punched = false;
  for (let frame = 0; frame < 2000 && game.screen !== "result"; frame += 1) {
    if (!punched && game.screen === "fight" && game.joe.state === "rush" && game.joe.stateFrame === 8) {
      input.set(["b"]);
      punched = true;
    }
    game.update(input);
    input.clear();
  }
  assert.equal(punched, true, "the opening rush should occur");
  assert.equal(game.result?.winner, "mac");
  assert.equal(game.result?.method, "KO");
  assert.equal(game.result?.special, true);
  assert.equal(game.result?.time, "0:42.00");
}

function lateInterceptRoute() {
  const { game, input } = freshFight();
  let punched = false;
  let stoodUp = false;
  for (let frame = 0; frame < 2000; frame += 1) {
    if (!punched && game.screen === "fight" && game.joe.state === "rush" && game.joe.stateFrame === 17) {
      input.set(["a"]);
      punched = true;
    }
    game.update(input);
    input.clear();
    if (punched && game.screen === "fight" && game.joeKnockdowns === 1 && game.joe.health > 0) {
      stoodUp = true;
      break;
    }
  }
  assert.equal(stoodUp, true, "a later hit in the 16-frame window should knock Joe down, but not KO him");
  assert.equal(game.joe.health, 48);
}

function tiredAggression() {
  const { game, input } = freshFight();
  game.mac.hearts = 0;
  game.mac.tired = true;
  for (let frame = 0; frame < 24; frame += 1) game.update(input);
  assert.match(game.joe.state, /tell|hook|jab/, "zero hearts should provoke an attack");
}

framePerfectRoute();
lateInterceptRoute();
tiredAggression();
console.log("Frame simulation smoke tests passed.");
