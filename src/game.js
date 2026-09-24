export const NES_FPS = 60.0988;
export const STEP_MS = 1000 / NES_FPS;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const NEUTRAL_JOE_STATES = new Set(["idle", "guardHigh", "guardLow"]);

export class Game {
  constructor(audio, hooks = {}) {
    this.audio = audio;
    this.hooks = {
      toast: hooks.toast || (() => {}),
      haptic: hooks.haptic || (() => {}),
      screen: hooks.screen || (() => {}),
      telemetry: hooks.telemetry || (() => {}),
    };
    this.globalFrame = 0;
    this.screenFrame = 0;
    this.screen = "title";
    this.paused = false;
    this.flash = 0;
    this.flashColor = "#ffffff";
    this.shake = 0;
    this.fightBanner = 0;
    this.seed = 0x19871018;
    this.particles = [];
    this.lastDownTap = -999;
    this.best = localStorage.getItem("ringside-best") || "—";
    this.result = null;
    this.cornerMessage = "STICK AND MOVE, STICK AND MOVE!";
    this.resetBoutData();
  }

  resetBoutData() {
    this.round = 1;
    this.roundSeconds = 0;
    this.clockFrame = 0;
    this.score = 0;
    this.hitCount = 0;
    this.coachUsed = false;
    this.knockdownsRound = 0;
    this.macKnockdowns = 0;
    this.joeKnockdowns = 0;
    this.specialTriggered = false;
    this.specialKO = false;
    this.specialKnockdown = false;
    this.pendingTKO = false;
    this.downFor = null;
    this.count = 0;
    this.countFrame = 0;
    this.countPhase = "";
    this.recovery = 0;
    this.recoveryTarget = 12;
    this.result = null;
    this.mac = {
      maxHealth: 96,
      health: 96,
      hearts: 20,
      stars: 0,
      state: "idle",
      stateFrame: 0,
      tired: false,
      punch: null,
      invulnerable: false,
    };
    this.joe = {
      maxHealth: 96,
      health: 96,
      state: "idle",
      stateFrame: 0,
      guard: "neutral",
      guardTarget: "neutral",
      guardReaction: 0,
      comboTimer: 0,
      cooldown: 9999,
      attackResolved: false,
      shakeCount: 2,
    };
  }

  random() {
    // Mulberry32-style deterministic RNG keeps attack patterns replayable.
    this.seed |= 0;
    this.seed = (this.seed + 0x6D2B79F5) | 0;
    let t = this.seed;
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  setScreen(screen) {
    this.screen = screen;
    this.screenFrame = 0;
    this.hooks.screen(screen, this);
  }

  goTitle() {
    this.resetBoutData();
    this.paused = false;
    this.setScreen("title");
    if (this.audio.context) this.audio.startMusic("title");
  }

  startBout() {
    this.resetBoutData();
    this.audio.sfx("start");
    this.audio.startMusic("title");
    this.setScreen("prefight");
  }

  beginRound() {
    this.roundSeconds = 0;
    this.clockFrame = 0;
    this.knockdownsRound = 0;
    this.specialTriggered = false;
    this.specialKO = false;
    this.specialKnockdown = false;
    this.pendingTKO = false;
    this.fightBanner = 0;
    this.mac.state = "idle";
    this.mac.stateFrame = 0;
    this.mac.punch = null;
    this.mac.tired = this.mac.hearts <= 0;
    this.joe.state = "idle";
    this.joe.stateFrame = 0;
    this.joe.guard = "neutral";
    this.joe.guardTarget = "neutral";
    this.joe.guardReaction = 0;
    this.joe.comboTimer = 0;
    this.joe.cooldown = this.round === 1 ? 9999 : 80;
    this.joe.attackResolved = false;
    this.audio.stopMusic();
    this.setScreen("roundIntro");
  }

  togglePause(force) {
    if (this.screen === "title" || this.screen === "prefight" || this.screen === "result") return this.paused;
    this.paused = typeof force === "boolean" ? force : !this.paused;
    this.hooks.toast(this.paused ? "PAUSED" : "BACK IN THE RING");
    if (this.paused) this.audio.stopMusic();
    else if (this.screen === "fight") this.audio.startMusic("fight");
    return this.paused;
  }

  resetFight() {
    this.startBout();
  }

  getClockText() {
    const minutes = Math.floor(this.roundSeconds / 60);
    const seconds = this.roundSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }

  getStateLabel() {
    if (this.paused) return "PAUSED";
    if (this.screen === "fight") return this.joe.state.toUpperCase();
    if (this.screen === "count") return `${this.downFor?.toUpperCase()} DOWN`;
    return this.screen.toUpperCase();
  }

  update(input) {
    this.globalFrame += 1;
    if (this.flash > 0) this.flash -= 1;
    if (this.shake > 0) this.shake -= 1;
    this.updateParticles();

    if (input.pressed("pause")) this.togglePause();
    if (this.paused) return;

    this.screenFrame += 1;
    switch (this.screen) {
      case "title": this.updateTitle(input); break;
      case "prefight": this.updatePrefight(input); break;
      case "roundIntro": this.updateRoundIntro(input); break;
      case "fight": this.updateFight(input); break;
      case "count": this.updateCount(input); break;
      case "corner": this.updateCorner(input); break;
      case "result": this.updateResult(input); break;
      default: break;
    }

    if (this.fightBanner > 0) this.fightBanner -= 1;
    this.hooks.telemetry(this);
  }

  anyFightButton(input) {
    return input.pressed("start") || input.pressed("a") || input.pressed("b");
  }

  updateTitle(input) {
    this.mac.stateFrame += 1;
    this.joe.stateFrame += 1;
    if (this.anyFightButton(input)) this.startBout();
  }

  updatePrefight(input) {
    if (this.screenFrame > 95 && this.anyFightButton(input)) this.beginRound();
    else if (this.screenFrame > 260) this.beginRound();
  }

  updateRoundIntro(input) {
    this.mac.stateFrame += 1;
    this.joe.stateFrame += 1;
    if (this.screenFrame === 74) this.audio.sfx("bell");
    if (this.screenFrame >= 112 || (this.screenFrame > 78 && this.anyFightButton(input))) {
      this.setScreen("fight");
      this.fightBanner = 42;
      this.audio.startMusic("fight");
    }
  }

  updateFight(input) {
    this.advanceClock();
    if (this.screen !== "fight") return;

    this.updateMac(input);
    if (this.screen !== "fight") return;
    this.updateJoe(input);
    if (this.screen !== "fight") return;

    if (this.roundSeconds >= 180) this.endRound();
  }

  advanceClock() {
    this.clockFrame += 1;
    if (this.clockFrame >= 20) {
      this.clockFrame -= 20;
      this.roundSeconds += 1;
    }
  }

  updateMac(input) {
    const mac = this.mac;
    mac.stateFrame += 1;

    if (mac.state === "idle") {
      if (input.pressed("left")) this.startMacMove("dodgeLeft");
      else if (input.pressed("right")) this.startMacMove("dodgeRight");
      else if (input.pressed("down")) {
        if (this.globalFrame - this.lastDownTap <= 15) {
          this.startMacMove("duck");
          this.lastDownTap = -999;
        } else {
          this.lastDownTap = this.globalFrame;
          this.startMacMove("block");
        }
      } else if (input.pressed("b")) this.startPunch("left", input.held("up") ? "face" : "body");
      else if (input.pressed("a")) this.startPunch("right", input.held("up") ? "face" : "body");
      else if (input.pressed("start")) this.startUppercut();
    } else if (mac.state === "block") {
      if (!input.held("down")) this.setMacState("idle");
      else if (this.globalFrame - this.lastDownTap <= 15 && input.pressed("down")) this.startMacMove("duck");
    } else if (mac.state === "dodgeLeft" || mac.state === "dodgeRight") {
      const opposite = mac.state === "dodgeLeft" ? "right" : "left";
      if (mac.stateFrame >= 7 && input.pressed(opposite)) mac.stateFrame = 17;
      if (mac.stateFrame >= 20) this.setMacState("idle");
    } else if (mac.state === "duck") {
      if (mac.stateFrame >= 22) this.setMacState("idle");
    } else if (mac.state === "punchLeft" || mac.state === "punchRight") {
      const hitFrame = mac.punch.hand === "left" ? 6 : 7;
      const endFrame = mac.punch.hand === "left" ? 14 : 16;
      if (!mac.punch.resolved && mac.stateFrame >= hitFrame) {
        mac.punch.resolved = true;
        this.resolveMacPunch(mac.punch);
      }
      if (this.screen === "fight" && mac.stateFrame >= endFrame) this.setMacState("idle");
    } else if (mac.state === "uppercut") {
      if (!mac.punch.resolved && mac.stateFrame >= 13) {
        mac.punch.resolved = true;
        this.resolveMacPunch(mac.punch);
      }
      if (this.screen === "fight" && mac.stateFrame >= 28) this.setMacState("idle");
    } else if (mac.state === "hit") {
      if (mac.stateFrame >= 30) this.setMacState("idle");
    }

    mac.invulnerable = (mac.state.startsWith("dodge") && mac.stateFrame >= 3 && mac.stateFrame <= 15)
      || (mac.state === "duck" && mac.stateFrame >= 4 && mac.stateFrame <= 17);
  }

  setMacState(state) {
    this.mac.state = state;
    this.mac.stateFrame = 0;
    if (state === "idle") this.mac.punch = null;
  }

  startMacMove(state) {
    this.setMacState(state);
    if (state.startsWith("dodge") || state === "duck") this.audio.sfx("dodge");
  }

  startPunch(hand, target) {
    if (this.mac.tired || this.mac.hearts <= 0) {
      this.mac.tired = true;
      this.audio.sfx("error");
      this.hooks.toast("WINDED — DODGE TO RECOVER");
      return;
    }
    this.setMacState(hand === "left" ? "punchLeft" : "punchRight");
    this.mac.punch = { hand, target, type: "basic", resolved: false };
    this.audio.sfx("jab");
  }

  startUppercut() {
    if (this.mac.stars <= 0) {
      this.audio.sfx("error");
      this.hooks.toast("EARN A STAR FIRST");
      return;
    }
    if (this.mac.tired) return;
    this.mac.stars -= 1;
    this.setMacState("uppercut");
    this.mac.punch = { hand: "right", target: "face", type: "uppercut", resolved: false };
    this.audio.sfx("uppercut");
  }

  updateJoe(input) {
    const joe = this.joe;
    joe.stateFrame += 1;
    if (joe.comboTimer > 0) joe.comboTimer -= 1;

    if (NEUTRAL_JOE_STATES.has(joe.state)) {
      this.updateJoeGuard(input);
      const specialSecond = this.round === 1 ? 38 : 28;
      if (!this.specialTriggered && this.roundSeconds >= specialSecond) {
        this.specialTriggered = true;
        joe.shakeCount = this.random() < 0.55 ? 2 : 4;
        this.setJoeState("backstep");
        return;
      }
      if (this.round > 1 || this.specialTriggered || this.mac.tired) {
        // Reaching zero hearts wakes Joe up immediately, even during his
        // otherwise passive opening lesson.
        if (this.mac.tired && joe.cooldown > 1000) joe.cooldown = 18;
        joe.cooldown -= 1;
        if (joe.cooldown <= 0) this.beginJoeAttack();
      }
      return;
    }

    switch (joe.state) {
      case "backstep":
        if (joe.stateFrame >= 20) this.setJoeState("taunt");
        break;
      case "taunt": {
        const duration = joe.shakeCount === 2 ? 42 : 58;
        if (joe.stateFrame >= duration) this.setJoeState("rush");
        break;
      }
      case "rush":
        if (!joe.attackResolved && joe.stateFrame >= 32) {
          joe.attackResolved = true;
          this.resolveJoePunch("tauntHook");
        }
        if (this.screen === "fight" && joe.stateFrame >= 42) this.finishJoeAttack(58);
        break;
      case "tellHook":
        if (joe.stateFrame >= 23) this.setJoeState("hook");
        break;
      case "hook":
        if (!joe.attackResolved && joe.stateFrame >= 8) {
          joe.attackResolved = true;
          this.resolveJoePunch("hook");
        }
        if (this.screen === "fight" && joe.stateFrame >= 20) this.finishJoeAttack(48);
        break;
      case "tellJab":
        if (joe.stateFrame >= 18) this.setJoeState("jab");
        break;
      case "jab":
        if (!joe.attackResolved && joe.stateFrame >= 6) {
          joe.attackResolved = true;
          this.resolveJoePunch("jab");
        }
        if (this.screen === "fight" && joe.stateFrame >= 16) this.finishJoeAttack(40);
        break;
      case "recover":
        if (joe.stateFrame >= 25) this.finishJoeAttack(44);
        break;
      case "vulnerable":
        if (joe.comboTimer <= 0 || joe.stateFrame >= 62) this.finishJoeAttack(42);
        break;
      case "hitLeft":
      case "hitRight":
      case "hitBody":
        if (joe.stateFrame >= 10) {
          if (joe.comboTimer > 0) this.setJoeState("vulnerable", true);
          else this.finishJoeAttack(48);
        }
        break;
      default:
        break;
    }
  }

  updateJoeGuard(input) {
    const joe = this.joe;
    const desired = input.held("up") ? "high" : "low";
    if (desired !== joe.guardTarget) {
      joe.guardTarget = desired;
      // The original data gives Joe a famously slow guard reaction. Eighteen
      // frames feels faithful while remaining readable on a touch screen.
      joe.guardReaction = 18;
    }
    if (joe.guardReaction > 0) joe.guardReaction -= 1;
    else joe.guard = joe.guardTarget;
    const visual = joe.guard === "high" ? "guardHigh" : joe.guard === "low" ? "guardLow" : "idle";
    if (joe.state !== visual) {
      joe.state = visual;
      joe.stateFrame = 0;
    }
  }

  setJoeState(state, preserveCombo = false) {
    this.joe.state = state;
    this.joe.stateFrame = 0;
    this.joe.attackResolved = false;
    if (!preserveCombo && state !== "vulnerable" && !state.startsWith("hit")) this.joe.comboTimer = 0;
  }

  beginJoeAttack() {
    const useJab = this.round >= 2 && this.random() < 0.42;
    this.setJoeState(useJab ? "tellJab" : "tellHook");
  }

  finishJoeAttack(cooldown = 45) {
    this.joe.cooldown = cooldown + Math.floor(this.random() * 20);
    this.joe.guardTarget = "neutral";
    this.joe.guard = "neutral";
    this.setJoeState("idle");
  }

  resolveMacPunch(punch) {
    if (this.screen !== "fight") return;
    const joe = this.joe;
    const isUppercut = punch.type === "uppercut";

    // Glass Joe's famous return from the taunt: 16 vulnerable frames, with
    // the first four yielding the special KO route.
    if (joe.state === "rush") {
      const frame = joe.stateFrame;
      if (frame >= 14 && frame <= 29) {
        const framePerfect = frame <= 17;
        this.landMacPunch(punch, {
          damage: joe.health,
          counter: true,
          heavy: true,
          special: true,
          specialKO: framePerfect,
        });
      } else {
        this.blockMacPunch();
      }
      return;
    }

    const counterWindow = (joe.state === "tellHook" && joe.stateFrame >= 11 && joe.stateFrame <= 18)
      || (joe.state === "tellJab" && joe.stateFrame >= 8 && joe.stateFrame <= 14);
    if (counterWindow) {
      const damage = isUppercut ? 23 : punch.hand === "right" ? 8 : 7;
      this.landMacPunch(punch, { damage, counter: true, heavy: isUppercut });
      if (!isUppercut) this.awardStar("COUNTER STAR!");
      return;
    }

    const open = joe.state === "vulnerable" || joe.state.startsWith("hit") || joe.state === "recover";
    if (open) {
      const damage = isUppercut ? 22 : punch.hand === "right" ? 6 : 5;
      this.landMacPunch(punch, { damage, heavy: isUppercut, combo: true });
      return;
    }

    if (isUppercut) {
      // Joe will guard raw star punches unless he is stunned.
      this.blockMacPunch(true);
      return;
    }

    const guarded = joe.guard === punch.target;
    if (!guarded) {
      const damage = punch.hand === "right" ? 5 : 4;
      this.landMacPunch(punch, { damage });
    } else {
      this.blockMacPunch();
    }
  }

  landMacPunch(punch, options = {}) {
    if (this.screen !== "fight") return;
    const damage = options.damage ?? 5;
    const target = punch.target;
    this.joe.health = Math.max(0, this.joe.health - damage);
    this.score += options.counter ? 100 : options.heavy ? 80 : 10;
    this.hitCount += punch.type === "basic" ? 1 : 0;
    this.joe.comboTimer = options.combo || options.counter ? 34 : 17;
    if (target === "body") this.setJoeState("hitBody", true);
    else this.setJoeState(punch.hand === "left" ? "hitRight" : "hitLeft", true);

    this.flash = options.heavy ? 5 : 2;
    this.flashColor = "#fff7d0";
    this.shake = options.heavy ? 8 : 3;
    this.audio.sfx(options.heavy ? "hitHeavy" : "hitLight");
    this.hooks.haptic(options.heavy ? 28 : 10);
    this.spawnImpact(target === "face" ? 128 : 128, target === "face" ? 102 : 151, options.heavy ? 12 : 7);

    if (this.hitCount === 20 || (this.hitCount > 20 && (this.hitCount - 20) % 8 === 0)) {
      this.awardStar("20TH HIT — STAR EARNED!");
    }

    // Teach Joe to cover the last target after a brief reaction delay.
    this.joe.guardTarget = target;
    this.joe.guardReaction = 13;

    if (this.joe.health <= 0) {
      this.startJoeKnockdown({
        special: !!options.special,
        specialKO: !!options.specialKO,
      });
    }
  }

  blockMacPunch(uppercut = false) {
    this.mac.hearts = Math.max(0, this.mac.hearts - 1);
    this.mac.tired = this.mac.hearts <= 0;
    this.audio.sfx("block");
    this.spawnImpact(128, uppercut ? 105 : 136, 3, "#8da1b3");
    if (this.mac.tired) this.hooks.toast("OUT OF HEARTS — EVADE!");
  }

  awardStar(message = "STAR EARNED!") {
    if (this.mac.stars >= 3) return;
    this.mac.stars += 1;
    this.audio.sfx("star");
    this.hooks.toast(message);
    for (let i = 0; i < 4; i += 1) {
      this.particles.push({
        type: "star",
        x: 112 + i * 10,
        y: 90 + (i % 2) * 7,
        vx: (i - 1.5) * 0.23,
        vy: -0.48 - i * 0.05,
        gravity: 0.012,
        life: 42,
        maxLife: 42,
        size: 3,
        color: "#ffc241",
      });
    }
  }

  resolveJoePunch(kind) {
    if (this.screen !== "fight") return;
    const mac = this.mac;
    if (mac.invulnerable) {
      mac.hearts = Math.min(20, mac.hearts + 3);
      mac.tired = mac.hearts <= 0;
      this.joe.comboTimer = kind === "tauntHook" ? 30 : 55;
      this.setJoeState("vulnerable", true);
      this.audio.sfx("dodge");
      this.score += 20;
      this.hooks.haptic(6);
      if (mac.hearts === 3) this.hooks.toast("FIGHTING SPIRIT RESTORED");
      return;
    }

    if (mac.state === "block" && kind !== "tauntHook") {
      mac.hearts = Math.max(0, mac.hearts - 1);
      mac.health = Math.max(1, mac.health - 1);
      mac.tired = mac.hearts <= 0;
      this.audio.sfx("block");
      this.shake = 2;
      this.setJoeState("recover");
      return;
    }

    const damage = kind === "tauntHook" ? 18 : kind === "hook" ? 11 : 8;
    this.damageMac(damage);
    this.setJoeState("recover");
  }

  damageMac(damage) {
    const mac = this.mac;
    mac.health = Math.max(0, mac.health - damage);
    mac.hearts = Math.max(0, mac.hearts - 3);
    mac.tired = mac.hearts <= 0;
    if (mac.stars > 0) mac.stars -= 1;
    this.setMacState("hit");
    this.audio.sfx("hurt");
    this.flash = 4;
    this.flashColor = "#ef3f43";
    this.shake = 7;
    this.spawnImpact(128, 194, 9, "#ff6b50");
    this.hooks.haptic([20, 25, 20]);
    if (mac.health <= 0) this.startMacKnockdown();
  }

  startJoeKnockdown(options = {}) {
    if (this.screen !== "fight") return;
    this.joe.health = 0;
    this.joe.state = "down";
    this.mac.state = "idle";
    this.mac.stateFrame = 0;
    this.joeKnockdowns += 1;
    this.knockdownsRound += 1;
    this.score += 500;
    this.specialKO = !!options.specialKO;
    this.specialKnockdown = !!options.special;
    this.pendingTKO = this.knockdownsRound >= 3;
    this.downFor = "joe";
    this.count = 0;
    this.countFrame = -38;
    this.countPhase = "fall";
    this.audio.stopMusic();
    this.audio.sfx("hitHeavy");
    this.hooks.toast(this.specialKO ? "FRAME-PERFECT INTERCEPT!" : this.pendingTKO ? "THIRD KNOCKDOWN!" : "JOE IS DOWN!");
    this.hooks.haptic([35, 35, 55]);
    this.setScreen("count");
  }

  startMacKnockdown() {
    if (this.screen !== "fight") return;
    this.mac.health = 0;
    this.mac.hearts = 0;
    this.mac.stars = 0;
    this.mac.state = "down";
    this.joe.state = "idle";
    this.macKnockdowns += 1;
    this.downFor = "mac";
    this.count = 0;
    this.countFrame = -38;
    this.countPhase = "fall";
    this.recovery = 0;
    this.recoveryTarget = 10 + this.macKnockdowns * 4;
    this.audio.stopMusic();
    this.audio.sfx("ko");
    this.hooks.toast("MAC IS DOWN — MASH A + B!");
    this.setScreen("count");
  }

  updateCount(input) {
    this.countFrame += 1;
    if (this.downFor === "mac") {
      if (input.pressed("a")) this.recovery += 2;
      if (input.pressed("b")) this.recovery += 2;
    }

    if (this.pendingTKO && this.downFor === "joe") {
      if (this.countFrame === 12) this.audio.sfx("tko");
      if (this.countFrame > 78) this.finishResult("mac", "TKO");
      return;
    }

    if (this.countPhase === "fall" && this.countFrame >= 0) {
      this.countPhase = "counting";
      this.countFrame = 0;
    }

    if (this.countPhase === "counting" && this.countFrame > 0 && this.countFrame % 40 === 0) {
      this.count += 1;
      this.audio.sfx("count");

      if (this.downFor === "joe") {
        const getUpAt = this.specialKnockdown && !this.specialKO ? 1 : Math.min(2 + this.knockdownsRound, 5);
        if (!this.specialKO && this.count >= getUpAt) {
          this.startGetUp("joe");
          return;
        }
      } else if (this.macKnockdowns < 4 && this.count >= 2 && this.recovery >= this.recoveryTarget) {
        this.startGetUp("mac");
        return;
      }

      if (this.count >= 10) {
        this.finishResult(this.downFor === "joe" ? "mac" : "joe", "KO", { special: this.specialKO });
      }
    }

    if (this.countPhase === "getup") {
      if (this.downFor === "joe") this.joe.stateFrame += 1;
      else this.mac.stateFrame += 1;
      if (this.countFrame >= 62) this.resumeAfterCount();
    }
  }

  startGetUp(who) {
    this.countPhase = "getup";
    this.countFrame = 0;
    if (who === "joe") {
      this.joe.state = "getup";
      this.joe.stateFrame = 0;
    } else {
      this.mac.state = "getup";
      this.mac.stateFrame = 0;
    }
  }

  resumeAfterCount() {
    if (this.downFor === "joe") {
      this.joe.health = Math.max(34, 58 - this.knockdownsRound * 10);
      this.joe.state = "idle";
      this.joe.stateFrame = 0;
      this.joe.cooldown = 42;
      this.joe.guard = "neutral";
      this.joe.guardTarget = "neutral";
    } else {
      this.mac.health = Math.max(26, 46 - this.macKnockdowns * 5);
      this.mac.hearts = 8;
      this.mac.tired = false;
      this.mac.state = "idle";
      this.mac.stateFrame = 0;
      this.joe.state = "idle";
      this.joe.stateFrame = 0;
      this.joe.cooldown = 50;
    }
    this.downFor = null;
    this.specialKO = false;
    this.specialKnockdown = false;
    this.countPhase = "";
    this.setScreen("fight");
    this.fightBanner = 0;
    this.audio.startMusic("fight");
  }

  endRound() {
    if (this.round >= 3) {
      const won = this.score >= 5000;
      this.finishResult(won ? "mac" : "joe", "DECISION");
      return;
    }
    this.audio.stopMusic();
    this.audio.sfx("bell");
    this.cornerMessage = this.mac.health < 35
      ? "HANG IN THERE! USE COACH FOR EXTRA STAMINA."
      : this.round === 1
        ? "LISTEN MAC! DODGE HIS PUNCH, THEN COUNTER!"
        : "PUT HIM AWAY! MIX THE BODY AND THE JAW!";
    this.setScreen("corner");
  }

  updateCorner(input) {
    if (input.pressed("select") && !this.coachUsed) {
      this.coachUsed = true;
      this.mac.health = Math.min(this.mac.maxHealth, this.mac.health + 28);
      this.audio.sfx("heal");
      this.hooks.toast("DOC RESTORED STAMINA");
    }
    if ((this.screenFrame > 80 && this.anyFightButton(input)) || this.screenFrame > 330) {
      this.round += 1;
      this.mac.health = Math.min(this.mac.maxHealth, this.mac.health + 18);
      this.mac.hearts = this.round === 3 ? 15 : 20;
      this.mac.tired = false;
      this.joe.health = this.joe.maxHealth;
      this.beginRound();
    }
  }

  finishResult(winner, method, options = {}) {
    if (this.screen === "result") return;
    this.audio.stopMusic();
    const special = !!options.special || (this.specialKO && winner === "mac");
    const time = special ? "0:42.00" : this.getClockText();
    this.result = { winner, method, round: this.round, time, special };
    this.mac.state = winner === "mac" ? "guard" : "down";
    this.joe.state = winner === "joe" ? "guard" : "down";
    this.setScreen("result");
    this.audio.sfx(winner === "mac" ? (method === "TKO" ? "tko" : "ko") : "ko");
    if (winner === "mac") {
      this.saveBest(time, special);
      this.hooks.toast(special ? "42.00 CLUB UNLOCKED" : `${method} — VICTORY!`);
    }
  }

  saveBest(time, special) {
    if (special || this.best === "—") {
      this.best = time;
      localStorage.setItem("ringside-best", time);
    }
  }

  updateResult(input) {
    this.mac.stateFrame += 1;
    this.joe.stateFrame += 1;
    if (this.screenFrame > 80 && this.anyFightButton(input)) this.startBout();
  }

  spawnImpact(x, y, amount = 7, color = "#fff4d2") {
    for (let i = 0; i < amount; i += 1) {
      const angle = (Math.PI * 2 * i) / amount + this.random() * 0.4;
      const speed = 0.45 + this.random() * 1.15;
      this.particles.push({
        type: i % 5 === 0 ? "star" : "pixel",
        x: x + (this.random() - 0.5) * 6,
        y: y + (this.random() - 0.5) * 5,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.3,
        gravity: 0.035,
        life: 22 + Math.floor(this.random() * 18),
        maxLife: 40,
        size: i % 5 === 0 ? 3 : 2,
        color: i % 3 === 0 ? "#6be9ff" : color,
      });
    }
  }

  updateParticles() {
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity || 0;
      p.life -= 1;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }
}
