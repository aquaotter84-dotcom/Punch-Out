const P = {
  black: "#090911",
  ink: "#fff4d2",
  paper: "#f4e6b4",
  blue: "#0877e8",
  deepBlue: "#253dd3",
  red: "#dd2b2f",
  brightRed: "#f34a35",
  darkRed: "#721827",
  green: "#24ba42",
  lime: "#82ef42",
  orange: "#ff8b2d",
  amber: "#ffc241",
  skin: "#efaa78",
  skinLight: "#ffc18a",
  skinDark: "#b95e50",
  brown: "#6c3026",
  white: "#fff8dc",
  gray: "#9d9ba1",
  crowd: "#e1534c",
  purple: "#a86bd7",
};

const FONT = {
  "A": ["01110","10001","10001","11111","10001","10001","10001"],
  "B": ["11110","10001","10001","11110","10001","10001","11110"],
  "C": ["01111","10000","10000","10000","10000","10000","01111"],
  "D": ["11110","10001","10001","10001","10001","10001","11110"],
  "E": ["11111","10000","10000","11110","10000","10000","11111"],
  "F": ["11111","10000","10000","11110","10000","10000","10000"],
  "G": ["01111","10000","10000","10111","10001","10001","01111"],
  "H": ["10001","10001","10001","11111","10001","10001","10001"],
  "I": ["11111","00100","00100","00100","00100","00100","11111"],
  "J": ["00111","00010","00010","00010","10010","10010","01100"],
  "K": ["10001","10010","10100","11000","10100","10010","10001"],
  "L": ["10000","10000","10000","10000","10000","10000","11111"],
  "M": ["10001","11011","10101","10101","10001","10001","10001"],
  "N": ["10001","11001","10101","10011","10001","10001","10001"],
  "O": ["01110","10001","10001","10001","10001","10001","01110"],
  "P": ["11110","10001","10001","11110","10000","10000","10000"],
  "Q": ["01110","10001","10001","10001","10101","10010","01101"],
  "R": ["11110","10001","10001","11110","10100","10010","10001"],
  "S": ["01111","10000","10000","01110","00001","00001","11110"],
  "T": ["11111","00100","00100","00100","00100","00100","00100"],
  "U": ["10001","10001","10001","10001","10001","10001","01110"],
  "V": ["10001","10001","10001","10001","10001","01010","00100"],
  "W": ["10001","10001","10001","10101","10101","10101","01010"],
  "X": ["10001","10001","01010","00100","01010","10001","10001"],
  "Y": ["10001","10001","01010","00100","00100","00100","00100"],
  "Z": ["11111","00001","00010","00100","01000","10000","11111"],
  "0": ["01110","10001","10011","10101","11001","10001","01110"],
  "1": ["00100","01100","00100","00100","00100","00100","01110"],
  "2": ["01110","10001","00001","00010","00100","01000","11111"],
  "3": ["11110","00001","00001","01110","00001","00001","11110"],
  "4": ["00010","00110","01010","10010","11111","00010","00010"],
  "5": ["11111","10000","10000","11110","00001","00001","11110"],
  "6": ["01110","10000","10000","11110","10001","10001","01110"],
  "7": ["11111","00001","00010","00100","01000","01000","01000"],
  "8": ["01110","10001","10001","01110","10001","10001","01110"],
  "9": ["01110","10001","10001","01111","00001","00001","01110"],
  "!": ["00100","00100","00100","00100","00100","00000","00100"],
  "?": ["01110","10001","00001","00010","00100","00000","00100"],
  ".": ["00000","00000","00000","00000","00000","00110","00110"],
  ",": ["00000","00000","00000","00000","00110","00110","00100"],
  ":": ["00000","00110","00110","00000","00110","00110","00000"],
  "-": ["00000","00000","00000","11111","00000","00000","00000"],
  "/": ["00001","00010","00010","00100","01000","01000","10000"],
  "#": ["01010","11111","01010","01010","11111","01010","00000"],
  "'": ["00100","00100","00010","00000","00000","00000","00000"],
  "×": ["00000","10001","01010","00100","01010","10001","00000"],
  " ": ["00000","00000","00000","00000","00000","00000","00000"],
};

function pixelText(ctx, text, x, y, options = {}) {
  const scale = options.scale || 1;
  const spacing = options.spacing ?? 1;
  const normalized = String(text).toUpperCase();
  const charWidth = (5 + spacing) * scale;
  const width = Math.max(0, normalized.length * charWidth - spacing * scale);
  let startX = x;
  if (options.align === "center") startX -= Math.floor(width / 2);
  if (options.align === "right") startX -= width;
  const color = options.color || P.white;
  const shadow = options.shadow;
  const draw = (dx, dy, drawColor) => {
    ctx.fillStyle = drawColor;
    for (let c = 0; c < normalized.length; c += 1) {
      const glyph = FONT[normalized[c]] || FONT["?"];
      for (let row = 0; row < 7; row += 1) {
        for (let col = 0; col < 5; col += 1) {
          if (glyph[row][col] === "1") {
            ctx.fillRect(Math.round(startX + c * charWidth + col * scale + dx), Math.round(y + row * scale + dy), scale, scale);
          }
        }
      }
    }
  };
  if (shadow) draw(shadow.x ?? scale, shadow.y ?? scale, shadow.color || P.black);
  draw(0, 0, color);
  return width;
}

function rect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function strokeRect(ctx, x, y, w, h, color, line = 1) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), line);
  ctx.fillRect(Math.round(x), Math.round(y + h - line), Math.round(w), line);
  ctx.fillRect(Math.round(x), Math.round(y), line, Math.round(h));
  ctx.fillRect(Math.round(x + w - line), Math.round(y), line, Math.round(h));
}

function poly(ctx, points, color, stroke = null, line = 1) {
  ctx.beginPath();
  ctx.moveTo(Math.round(points[0][0]), Math.round(points[0][1]));
  for (let i = 1; i < points.length; i += 1) ctx.lineTo(Math.round(points[i][0]), Math.round(points[i][1]));
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = line;
    ctx.lineJoin = "miter";
    ctx.stroke();
  }
}

function line(ctx, x1, y1, x2, y2, color, width = 1) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "butt";
  ctx.beginPath();
  ctx.moveTo(Math.round(x1), Math.round(y1));
  ctx.lineTo(Math.round(x2), Math.round(y2));
  ctx.stroke();
}

function star(ctx, x, y, radius, color, outline = P.black) {
  const points = [];
  for (let i = 0; i < 10; i += 1) {
    const angle = -Math.PI / 2 + i * Math.PI / 5;
    const r = i % 2 === 0 ? radius : radius * 0.42;
    points.push([x + Math.cos(angle) * r, y + Math.sin(angle) * r]);
  }
  poly(ctx, points, color, outline, 1);
}

function heart(ctx, x, y, color = P.red) {
  rect(ctx, x + 1, y, 3, 2, color);
  rect(ctx, x + 6, y, 3, 2, color);
  rect(ctx, x, y + 2, 10, 4, color);
  rect(ctx, x + 1, y + 6, 8, 2, color);
  rect(ctx, x + 3, y + 8, 4, 2, color);
}

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function easeOut(t) { return 1 - (1 - t) ** 3; }

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
    this.ctx.imageSmoothingEnabled = false;
    this.frame = 0;
  }

  render(game) {
    const ctx = this.ctx;
    this.frame = game.globalFrame;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    rect(ctx, 0, 0, 256, 240, P.black);

    const shakeX = game.shake > 0 ? ((game.globalFrame * 7) % 3) - 1 : 0;
    const shakeY = game.shake > 0 ? ((game.globalFrame * 11) % 3) - 1 : 0;
    if (game.shake > 0) ctx.translate(shakeX, shakeY);

    switch (game.screen) {
      case "title": this.drawTitle(game); break;
      case "prefight": this.drawPrefight(game); break;
      case "corner": this.drawCorner(game); break;
      case "result": this.drawResult(game); break;
      default: this.drawFightScene(game); break;
    }

    if (game.paused && game.screen !== "title") this.drawPause();
    if (game.flash > 0) {
      ctx.globalAlpha = clamp(game.flash / 7, 0, 0.65);
      rect(ctx, 0, 0, 256, 240, game.flashColor || P.white);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  drawTitle(game) {
    const ctx = this.ctx;
    rect(ctx, 0, 0, 256, 240, "#071021");
    // Arena spotlights and distant crowd.
    poly(ctx, [[18,0],[71,0],[125,190],[99,190]], "#142854");
    poly(ctx, [[184,0],[235,0],[155,190],[130,190]], "#1a2148");
    for (let row = 0; row < 5; row += 1) {
      for (let col = 0; col < 24; col += 1) {
        const x = 4 + col * 11 + (row % 2) * 4;
        const y = 146 + row * 8;
        const color = (col * 3 + row * 5) % 7 === 0 ? P.orange : (row % 2 ? "#35466b" : "#293957");
        rect(ctx, x, y, 4, 3, color);
      }
    }
    // Ring under the logo.
    rect(ctx, 0, 184, 256, 56, "#1e41ad");
    for (let y = 171; y <= 184; y += 6) line(ctx, 0, y, 256, y, y === 177 ? P.red : P.white, 2);
    rect(ctx, 10, 167, 4, 50, P.red); rect(ctx, 242, 167, 4, 50, P.red);

    // Championship belt.
    poly(ctx, [[18,17],[66,21],[78,32],[178,32],[190,21],[238,17],[229,47],[184,49],[169,59],[87,59],[72,49],[27,47]], "#7c4022", P.black, 2);
    poly(ctx, [[82,17],[104,8],[152,8],[174,17],[165,58],[91,58]], P.amber, P.black, 2);
    poly(ctx, [[100,17],[128,11],[156,17],[159,47],[128,55],[97,47]], "#f8df6b", P.black, 1);
    star(ctx, 128, 32, 12, P.red, P.black);
    pixelText(ctx, "87", 128, 29, { scale: 1, align: "center", color: P.white, shadow: { x: 1, y: 1 } });

    pixelText(ctx, "RINGSIDE", 128, 74, { scale: 3, align: "center", color: P.amber, shadow: { x: 3, y: 3, color: P.darkRed } });
    pixelText(ctx, "PUNCH-OUT!!", 128, 102, { scale: 2, align: "center", color: P.white, shadow: { x: 2, y: 2, color: P.deepBlue } });
    pixelText(ctx, "A FRAME-TIGHT TRIBUTE", 128, 122, { align: "center", color: "#9eb2df" });

    // Boxers framed below the wordmark.
    ctx.save();
    ctx.translate(-26, 13);
    ctx.scale(0.78, 0.78);
    this.drawJoeSprite({ state: "guard", stateFrame: game.screenFrame, health: 96 }, 195, 255);
    ctx.restore();
    ctx.save();
    ctx.translate(38, 4);
    ctx.scale(1.15, 1.15);
    this.drawMacSprite({ state: "guard", stateFrame: game.screenFrame, tired: false }, 82, 203);
    ctx.restore();

    if (Math.floor(game.screenFrame / 28) % 2 === 0) {
      pixelText(ctx, "PRESS START", 128, 218, { align: "center", color: P.lime, shadow: { x: 1, y: 1 } });
    }
    pixelText(ctx, "OR TOUCH THE RING", 128, 230, { align: "center", color: "#7182a9" });
  }

  drawPrefight(game) {
    const ctx = this.ctx;
    rect(ctx, 0, 0, 256, 240, P.black);
    pixelText(ctx, "MINOR CIRCUIT", 18, 22, { color: P.amber });
    pixelText(ctx, "RANKED: #2", 238, 11, { align: "right", color: P.lime });
    pixelText(ctx, "GLASS JOE", 238, 23, { align: "right", color: P.white });

    // Left portrait panel.
    strokeRect(ctx, 17, 103, 78, 69, P.white, 2);
    rect(ctx, 19, 105, 74, 65, "#2abb4f");
    line(ctx, 19, 143, 93, 143, P.white, 2);
    line(ctx, 49, 105, 49, 170, P.white, 2);
    // Coach bust.
    rect(ctx, 23, 125, 20, 35, P.brown);
    rect(ctx, 25, 116, 17, 17, "#74351f");
    rect(ctx, 28, 120, 3, 3, P.white); rect(ctx, 37, 120, 3, 3, P.white);
    rect(ctx, 32, 126, 6, 3, P.white);
    poly(ctx, [[22,158],[32,139],[45,159]], P.red, P.black);
    // Mac bust.
    poly(ctx, [[50,170],[54,144],[77,139],[91,170]], P.skin, P.black);
    rect(ctx, 53, 156, 36, 14, P.black);
    poly(ctx, [[55,146],[58,132],[75,126],[84,134],[79,149],[66,154]], P.skin, P.black);
    poly(ctx, [[55,137],[57,125],[66,128],[72,121],[84,129],[84,139],[78,133],[70,136],[64,131]], P.black);
    rect(ctx, 73, 139, 3, 2, P.black);

    pixelText(ctx, "FROM BRONX", 9, 47, { color: P.white });
    pixelText(ctx, "N.Y.", 73, 57, { align: "center", color: P.white });
    pixelText(ctx, "AGE: 17", 9, 71, { color: P.white });
    pixelText(ctx, "WEIGHT:107", 9, 84, { color: P.white });
    pixelText(ctx, "0-0  0KO", 49, 95, { align: "center", color: P.white });
    pixelText(ctx, "RANKED: #3", 17, 180, { color: P.lime });
    pixelText(ctx, "LITTLE MAC", 17, 194, { color: P.white });

    // Joe portrait panel.
    strokeRect(ctx, 162, 36, 77, 75, P.white, 2);
    rect(ctx, 164, 38, 73, 71, P.deepBlue);
    line(ctx, 164, 78, 237, 78, P.white, 2);
    line(ctx, 207, 38, 207, 109, P.white, 2);
    this.drawJoePortrait(201, 101);
    pixelText(ctx, "1-99  1KO", 199, 119, { align: "center", color: P.white });
    pixelText(ctx, "PROFILE", 199, 135, { align: "center", color: P.white });
    pixelText(ctx, "FROM", 162, 152, { color: P.white });
    pixelText(ctx, "PARIS,", 183, 163, { color: P.white });
    pixelText(ctx, "FRANCE", 194, 174, { color: P.white });
    pixelText(ctx, "AGE: 38", 162, 189, { color: P.white });
    pixelText(ctx, "WEIGHT:110", 162, 203, { color: P.white });

    pixelText(ctx, "VS.", 128, 109, { align: "center", color: P.amber });
    if (Math.floor(game.screenFrame / 25) % 2 === 0) pixelText(ctx, "PUSH START!", 128, 164, { align: "center", color: P.amber });
    pixelText(ctx, "OR TAP ANY PUNCH", 128, 224, { align: "center", color: "#6f7893" });
  }

  drawJoePortrait(x, y) {
    const ctx = this.ctx;
    // Glove behind shoulder.
    poly(ctx, [[x-42,y+7],[x-39,y-7],[x-28,y-14],[x-20,y-7],[x-22,y+9]], P.red, P.black, 2);
    poly(ctx, [[x-19,y+9],[x-12,y-26],[x+17,y-29],[x+31,y+9]], P.skin, P.black, 2);
    // Long face and orange hair.
    poly(ctx, [[x-11,y-38],[x-5,y-58],[x+17,y-57],[x+27,y-45],[x+24,y-23],[x+9,y-8],[x-7,y-15]], P.skin, P.black, 2);
    poly(ctx, [[x-14,y-45],[x-12,y-60],[x-3,y-55],[x+2,y-66],[x+8,y-57],[x+17,y-65],[x+18,y-54],[x+29,y-58],[x+22,y-40],[x+14,y-50],[x+7,y-43],[x,y-52],[x-4,y-42]], P.orange, P.black, 1);
    rect(ctx, x-3, y-39, 4, 3, P.black); rect(ctx, x+15, y-40, 4, 3, P.black);
    line(ctx, x+5, y-35, x+1, y-25, P.black, 2);
    line(ctx, x+1, y-24, x+12, y-22, P.black, 2);
    line(ctx, x-1, y-14, x+13, y-11, P.red, 2);
  }

  drawFightScene(game) {
    this.drawArena(game);
    const ctx = this.ctx;

    if (game.screen === "count") {
      if (game.downFor === "joe") {
        this.drawJoeDown(game);
        this.drawMacSprite(game.mac, 128, 233);
      } else {
        this.drawJoeSprite(game.joe, 128, 204);
        this.drawMacDown(game);
      }
      this.drawReferee(game);
      this.drawParticles(game);
      this.drawCountOverlay(game);
    } else {
      this.drawJoeSprite(game.joe, 128, 204);
      this.drawMacSprite(game.mac, 128, 233);
      if (game.screen === "roundIntro") this.drawReferee(game, true);
      this.drawParticles(game);
      if (game.screen === "roundIntro") this.drawRoundIntro(game);
      if (game.fightBanner > 0) this.drawFightBanner(game);
    }
  }

  drawArena(game) {
    const ctx = this.ctx;
    rect(ctx, 0, 0, 256, 240, P.blue);
    // Tile ceiling / HUD background.
    rect(ctx, 0, 0, 256, 40, P.paper);
    for (let x = 0; x < 256; x += 8) line(ctx, x, 0, x, 40, "#625e56", 1);
    for (let y = 0; y <= 40; y += 8) line(ctx, 0, y, 256, y, "#625e56", 1);

    // Crowd cavity.
    rect(ctx, 0, 39, 256, 43, P.black);
    rect(ctx, 5, 44, 246, 30, P.crowd);
    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 39; col += 1) {
        const x = 7 + col * 6 + (row % 2) * 2;
        const y = 45 + row * 9;
        const seed = (col * 17 + row * 31) % 9;
        rect(ctx, x, y, 3, 3, seed === 0 ? P.white : P.black);
        rect(ctx, x - 1, y + 3, 5, 3, seed === 2 ? P.amber : P.darkRed);
      }
    }
    // Camera flash in the crowd.
    if (game.globalFrame % 487 < 4) {
      rect(ctx, 204, 51, 4, 4, P.white);
      line(ctx, 201, 53, 211, 53, P.white, 1);
      line(ctx, 206, 48, 206, 58, P.white, 1);
    }

    // Ring ropes and corner posts.
    line(ctx, 0, 47, 256, 47, P.white, 2);
    line(ctx, 0, 57, 256, 57, P.red, 3);
    line(ctx, 0, 68, 256, 68, P.white, 2);
    line(ctx, 0, 78, 256, 78, P.red, 3);
    rect(ctx, 2, 42, 4, 49, P.white); rect(ctx, 3, 48, 2, 43, P.red);
    rect(ctx, 250, 42, 4, 49, P.white); rect(ctx, 251, 48, 2, 43, P.red);
    poly(ctx, [[6,75],[13,82],[13,91],[6,84]], P.white, P.black);
    poly(ctx, [[250,75],[243,82],[243,91],[250,84]], P.white, P.black);

    this.drawHUD(game);
  }

  drawHUD(game) {
    const ctx = this.ctx;
    const macHealth = clamp(game.mac.health / game.mac.maxHealth, 0, 1);
    const joeHealth = clamp(game.joe.health / game.joe.maxHealth, 0, 1);
    // Left meter cluster.
    rect(ctx, 7, 8, 66, 18, "#070b15");
    strokeRect(ctx, 7, 8, 66, 18, "#294f9e", 2);
    star(ctx, 16, 16, 5, P.white, P.black);
    pixelText(ctx, game.mac.stars, 25, 13, { color: P.white });
    heart(ctx, 37, 11, P.red);
    pixelText(ctx, String(Math.max(0, game.mac.hearts)).padStart(2, "0"), 70, 13, { align: "right", color: P.amber });
    // Mac stamina pip row.
    rect(ctx, 8, 28, 64, 5, P.black);
    for (let i = 0; i < 16; i += 1) {
      const active = i / 16 < macHealth;
      rect(ctx, 10 + i * 3.8, 29, 3, 3, active ? (macHealth < .25 ? P.red : P.green) : "#40424a");
    }

    // Opponent stamina and score.
    rect(ctx, 80, 8, 115, 11, P.black);
    strokeRect(ctx, 80, 8, 115, 11, "#263c62", 1);
    rect(ctx, 83, 11, 108 * joeHealth, 5, joeHealth < .25 ? P.red : P.white);
    rect(ctx, 80, 21, 115, 14, P.white);
    rect(ctx, 83, 24, 109, 8, P.deepBlue);
    pixelText(ctx, "POINTS:", 86, 25, { color: P.white });
    pixelText(ctx, String(game.score).padStart(5, " "), 189, 25, { align: "right", color: P.white });

    // Timer.
    rect(ctx, 202, 6, 48, 31, P.deepBlue);
    strokeRect(ctx, 202, 6, 48, 31, P.black, 2);
    const time = game.getClockText();
    pixelText(ctx, time, 226, 10, { align: "center", color: P.white });
    pixelText(ctx, `ROUND${game.round}`, 226, 24, { align: "center", color: P.paper });
  }

  drawJoeSprite(joe, baseX, baseY) {
    const ctx = this.ctx;
    const state = joe.state || "idle";
    const f = joe.stateFrame || 0;
    if (state === "down") return;

    let x = baseX;
    let y = baseY;
    let sx = 1;
    let sy = 1;
    let rotation = 0;
    const bob = state === "idle" || state === "guard" ? (Math.floor(f / 10) % 2) : 0;
    y -= bob;

    if (state === "backstep") {
      const t = clamp(f / 26, 0, 1);
      sx = sy = 1 - t * .13;
      y -= easeOut(t) * 16;
    } else if (state === "taunt") {
      sx = sy = .87;
      y -= 16;
    } else if (state === "rush") {
      const t = clamp(f / 34, 0, 1);
      sx = sy = .87 + easeOut(t) * .16;
      y -= 16 - easeOut(t) * 15;
    } else if (state === "hitLeft") {
      x += 4; rotation = .035;
    } else if (state === "hitRight") {
      x -= 4; rotation = -.035;
    } else if (state === "hitBody") {
      y += 3; sy = .96;
    } else if (state === "vulnerable") {
      rotation = Math.sin(f * .45) * .018;
    } else if (state === "getup") {
      const t = clamp(f / 65, 0, 1);
      sy = .5 + t * .5;
      y += (1 - t) * 15;
    }

    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.rotate(rotation);
    ctx.scale(sx, sy);
    this.drawJoeBody(state, f);
    ctx.restore();
  }

  drawJoeBody(state, f) {
    const ctx = this.ctx;
    const outline = P.black;
    const skin = P.skin;
    const skinLight = P.skinLight;
    const glove = P.red;
    let headX = 1;
    let headY = 0;
    if (state === "hitLeft") headX = 7;
    if (state === "hitRight") headX = -7;
    if (state === "vulnerable") { headX = 3; headY = -3; }
    if (state === "hitBody") headY = 3;

    // Rear leg and boots.
    poly(ctx, [[-12,-34],[-3,-33],[-2,-12],[-10,-10],[-16,-24]], skin, outline, 2);
    poly(ctx, [[-12,-14],[-2,-14],[-2,-3],[-8,1],[-16,-1],[-18,-6]], P.brown, outline, 2);
    rect(ctx, -14, -14, 13, 3, P.white);
    poly(ctx, [[5,-34],[15,-34],[18,-14],[9,-11],[3,-23]], skinLight, outline, 2);
    poly(ctx, [[9,-15],[19,-15],[21,-5],[15,0],[5,-2],[4,-7]], P.brown, outline, 2);
    rect(ctx, 8, -15, 12, 3, P.white);

    // Rear arm pose.
    const highGuard = state === "guardHigh" || state === "tellJab" || state === "guard";
    const lowGuard = state === "guardLow";
    if (state === "taunt") {
      poly(ctx, [[-16,-72],[-26,-87],[-22,-105],[-13,-101],[-7,-82]], skin, outline, 2);
      this.drawGlove(-20, -108, glove, 0);
    } else if (state === "tellHook") {
      poly(ctx, [[10,-70],[24,-78],[32,-72],[23,-61]], skin, outline, 2);
      this.drawGlove(32, -77, glove, 1);
    } else if (state === "hook") {
      poly(ctx, [[11,-70],[23,-61],[18,-43],[8,-51]], skin, outline, 2);
      this.drawGlove(18, -35, glove, 1, 1.18);
    } else if (state === "jab") {
      poly(ctx, [[-12,-74],[-7,-51],[-15,-39],[-22,-62]], skin, outline, 2);
      this.drawGlove(-14, -34, glove, -1, 1.12);
    } else if (highGuard) {
      poly(ctx, [[8,-72],[21,-84],[23,-72],[17,-61]], skin, outline, 2);
      this.drawGlove(21, -89, glove, 1);
    } else {
      poly(ctx, [[9,-70],[25,-62],[24,-49],[15,-53]], skin, outline, 2);
      this.drawGlove(25, lowGuard ? -48 : -58, glove, 1);
    }

    // Torso.
    poly(ctx, [[-12,-47],[-22,-65],[-20,-78],[-10,-84],[3,-86],[17,-81],[24,-67],[13,-46]], skin, outline, 2);
    poly(ctx, [[-13,-75],[-6,-80],[-7,-52]], skinLight);
    line(ctx, 1, -81, 1, -51, P.skinDark, 1);
    line(ctx, -2, -64, -9, -62, P.skinDark, 1);
    line(ctx, 5, -64, 12, -63, P.skinDark, 1);
    line(ctx, -5, -51, 2, -56, P.skinDark, 1);

    // Trunks.
    poly(ctx, [[-15,-49],[14,-49],[17,-31],[4,-29],[-2,-33],[-7,-29],[-17,-34]], P.white, outline, 2);
    rect(ctx, -15, -50, 30, 5, P.red);
    rect(ctx, -2, -47, 4, 15, "#e4d6ae");

    // Neck and head.
    poly(ctx, [[-6 + headX,-83 + headY],[11 + headX,-84 + headY],[11 + headX,-77 + headY],[-5 + headX,-76 + headY]], skin, outline, 1);
    poly(ctx, [[-10 + headX,-104 + headY],[-6 + headX,-116 + headY],[7 + headX,-121 + headY],[18 + headX,-114 + headY],[19 + headX,-98 + headY],[11 + headX,-84 + headY],[-4 + headX,-88 + headY]], skinLight, outline, 2);
    // Ear and long nose.
    rect(ctx, -13 + headX, -106 + headY, 5, 9, skin, outline);
    poly(ctx, [[9+headX,-108+headY],[18+headX,-104+headY],[10+headX,-100+headY]], skin, outline, 1);
    // Hair crest and ponytail.
    poly(ctx, [[-9+headX,-109+headY],[-11+headX,-121+headY],[-4+headX,-118+headY],[0+headX,-127+headY],[5+headX,-119+headY],[12+headX,-127+headY],[14+headX,-117+headY],[22+headX,-121+headY],[17+headX,-107+headY],[10+headX,-116+headY],[5+headX,-108+headY],[0+headX,-117+headY],[-4+headX,-107+headY]], P.orange, outline, 1);
    rect(ctx, 18 + headX, -110 + headY, 7, 4, P.orange);
    rect(ctx, 23 + headX, -108 + headY, 4, 7, P.orange);
    // Face pixels.
    rect(ctx, -2 + headX, -108 + headY, 4, 3, P.black);
    rect(ctx, 11 + headX, -109 + headY, 3, 3, P.black);
    line(ctx, 3 + headX, -96 + headY, 12 + headX, -94 + headY, P.black, 2);
    line(ctx, -1 + headX, -91 + headY, 8 + headX, -88 + headY, P.red, 2);
    rect(ctx, -5 + headX, -114 + headY, 5, 2, P.brown);

    // Foreground arm.
    if (state === "rush") {
      const punchPhase = f > 25;
      if (punchPhase) {
        poly(ctx, [[-12,-72],[-18,-53],[-10,-38],[-2,-53]], skinLight, outline, 2);
        this.drawGlove(-9, -31, glove, -1, 1.18);
      } else {
        poly(ctx, [[-14,-73],[-25,-67],[-22,-54],[-10,-56]], skinLight, outline, 2);
        this.drawGlove(-26, -60, glove, -1);
      }
    } else if (state === "tellJab") {
      poly(ctx, [[-15,-72],[-24,-83],[-17,-91],[-7,-79]], skinLight, outline, 2);
      this.drawGlove(-21, -92, glove, -1);
    } else if (state === "vulnerable" || state.startsWith("hit")) {
      poly(ctx, [[-15,-72],[-27,-59],[-25,-46],[-14,-55]], skinLight, outline, 2);
      this.drawGlove(-27, -43, glove, -1);
    } else if (highGuard) {
      poly(ctx, [[-14,-73],[-21,-83],[-15,-93],[-5,-79]], skinLight, outline, 2);
      this.drawGlove(-18, -96, glove, -1);
    } else {
      poly(ctx, [[-15,-72],[-27,-63],[-27,-50],[-14,-55]], skinLight, outline, 2);
      this.drawGlove(-29, lowGuard ? -48 : -60, glove, -1);
    }
  }

  drawGlove(x, y, color, side, scale = 1) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale * (side < 0 ? -1 : 1), scale);
    poly(ctx, [[-7,-6],[2,-8],[8,-3],[8,5],[2,9],[-6,6],[-9,1]], color, P.black, 2);
    rect(ctx, -7, 5, 10, 4, "#9d2029");
    rect(ctx, 1, -5, 4, 2, "#ff7b58");
    ctx.restore();
  }

  drawMacSprite(mac, baseX, baseY) {
    const ctx = this.ctx;
    const state = mac.state || "idle";
    const f = mac.stateFrame || 0;
    if (state === "down") return;
    let x = baseX;
    let y = baseY;
    let lean = 0;
    let sy = 1;
    if (state === "dodgeLeft") { x -= Math.min(19, f * 3); lean = -.13; }
    if (state === "dodgeRight") { x += Math.min(19, f * 3); lean = .13; }
    if (state === "duck") { y += 8; sy = .76; }
    if (state === "hit") { x += (f % 4 < 2 ? -3 : 3); y += 2; lean = -.08; }
    if (state === "punchLeft" || state === "punchRight" || state === "uppercut") y -= Math.min(4, f / 2);
    if (state === "getup") { sy = .55 + clamp(f / 48, 0, 1) * .45; y += (1 - clamp(f / 48, 0, 1)) * 10; }
    const bob = state === "idle" ? Math.floor(f / 12) % 2 : 0;
    y -= bob;

    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.rotate(lean);
    ctx.scale(1, sy);
    this.drawMacBody(state, f, !!mac.tired);
    ctx.restore();
  }

  drawMacBody(state, f, tired) {
    const ctx = this.ctx;
    const skin = P.skin;
    const green = tired ? "#d783b9" : P.green;
    // Legs and shoes.
    poly(ctx, [[-9,-23],[-2,-23],[-3,-7],[-9,-5],[-12,-15]], skin, P.black, 2);
    poly(ctx, [[3,-23],[10,-23],[12,-8],[6,-5],[1,-15]], skin, P.black, 2);
    rect(ctx, -12, -10, 10, 4, P.white); rect(ctx, 4, -10, 10, 4, P.white);
    poly(ctx, [[-11,-7],[-2,-7],[-2,-1],[-10,1],[-15,-1]], P.black, P.white, 1);
    poly(ctx, [[5,-7],[14,-7],[16,-1],[8,1],[3,-2]], P.black, P.white, 1);
    // Shorts.
    poly(ctx, [[-13,-35],[12,-35],[13,-21],[3,-19],[0,-25],[-3,-19],[-14,-23]], green, P.black, 2);
    rect(ctx, -12, -36, 24, 4, P.white);
    rect(ctx, -2, -32, 4, 10, P.white);
    // Torso, viewed from behind.
    poly(ctx, [[-9,-36],[-15,-48],[-10,-60],[0,-64],[11,-59],[16,-47],[10,-35]], skin, P.black, 2);
    poly(ctx, [[-8,-38],[-10,-57],[-2,-62],[7,-58],[9,-38]], P.black, P.black, 1);
    rect(ctx, -7, -42, 15, 9, P.black);

    // Head and hair.
    poly(ctx, [[-8,-61],[-9,-71],[-3,-78],[7,-76],[11,-68],[7,-60]], skin, P.black, 2);
    poly(ctx, [[-9,-70],[-8,-78],[-2,-75],[1,-81],[5,-76],[10,-78],[12,-67],[6,-72],[1,-68],[-4,-72]], P.black, P.black, 1);
    rect(ctx, 7, -68, 3, 3, P.skinDark);

    const facePunch = (state === "punchLeft" || state === "punchRight") && f >= 3 && f <= 10;
    const isRight = state === "punchRight";
    // Rear arm / glove.
    if (facePunch && !isRight) {
      poly(ctx, [[-10,-54],[-15,-75],[-11,-96],[-4,-92],[-3,-68]], skin, P.black, 2);
      this.drawMacGlove(-9, -101, green);
    } else if (facePunch && isRight) {
      poly(ctx, [[9,-54],[15,-76],[12,-96],[5,-92],[3,-68]], skin, P.black, 2);
      this.drawMacGlove(10, -101, green);
    } else if (state === "uppercut" && f >= 6) {
      poly(ctx, [[8,-54],[12,-77],[8,-103],[1,-98],[1,-68]], skin, P.black, 2);
      this.drawMacGlove(6, -108, green, 1.18);
    } else if (state === "block" || state === "guard") {
      poly(ctx, [[-11,-53],[-18,-66],[-12,-75],[-5,-61]], skin, P.black, 2);
      this.drawMacGlove(-15, -77, green);
      poly(ctx, [[10,-53],[18,-66],[12,-75],[5,-61]], skin, P.black, 2);
      this.drawMacGlove(15, -77, green);
    } else {
      // Low boxing stance.
      poly(ctx, [[-11,-53],[-21,-50],[-19,-40],[-9,-43]], skin, P.black, 2);
      this.drawMacGlove(-22, -40, green);
      poly(ctx, [[10,-53],[20,-50],[19,-40],[9,-43]], skin, P.black, 2);
      this.drawMacGlove(21, -40, green);
    }
  }

  drawMacGlove(x, y, color, scale = 1) {
    const ctx = this.ctx;
    ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
    poly(ctx, [[-5,-5],[2,-7],[6,-3],[6,4],[1,7],[-6,4],[-7,-1]], color, P.black, 2);
    rect(ctx, -5, 4, 8, 3, tiredColor(color));
    ctx.restore();
  }

  drawJoeDown(game) {
    const ctx = this.ctx;
    const wobble = game.count >= 4 && game.specialKO && (game.count === 4 || game.count === 7) ? Math.sin(game.countFrame * .4) * 2 : 0;
    ctx.save();
    ctx.translate(128 + wobble, 210);
    // Horizontal fallen body, reminiscent of the NES fall pose but newly drawn.
    poly(ctx, [[-43,-11],[-14,-21],[24,-17],[43,-7],[36,5],[-1,9],[-37,5]], P.skin, P.black, 2);
    poly(ctx, [[2,-18],[33,-16],[42,-7],[31,2],[4,-2]], P.white, P.black, 2);
    rect(ctx, 5, -19, 29, 5, P.red);
    poly(ctx, [[-29,-18],[-42,-23],[-48,-16],[-42,-7],[-25,-8]], P.orange, P.black, 1);
    this.drawGlove(-4, -14, P.red, 1);
    poly(ctx, [[24,0],[41,5],[38,12],[21,7]], P.brown, P.black, 2);
    ctx.restore();
  }

  drawMacDown() {
    const ctx = this.ctx;
    ctx.save(); ctx.translate(129, 226);
    poly(ctx, [[-29,-5],[-11,-16],[16,-13],[29,-3],[23,4],[-5,6],[-28,3]], P.skin, P.black, 2);
    poly(ctx, [[-2,-14],[17,-14],[25,-5],[12,1],[-6,-1]], P.green, P.black, 2);
    rect(ctx, -28, -7, 12, 6, P.black);
    ctx.restore();
  }

  drawReferee(game, intro = false) {
    const ctx = this.ctx;
    let x = intro ? 180 : 184;
    const y = 219;
    const bob = Math.floor(game.countFrame / 8) % 2;
    x += intro ? 0 : (game.downFor === "joe" ? 0 : -36);
    // Legs.
    rect(ctx, x - 7, y - 18 + bob, 6, 17, P.black);
    rect(ctx, x + 3, y - 18 + bob, 6, 17, P.black);
    rect(ctx, x - 9, y - 2 + bob, 9, 3, P.brown);
    rect(ctx, x + 3, y - 2 + bob, 9, 3, P.brown);
    // Shirt and head.
    poly(ctx, [[x-12,y-48+bob],[x+11,y-48+bob],[x+9,y-18+bob],[x-8,y-18+bob]], P.white, P.black, 2);
    rect(ctx, x - 2, y - 47 + bob, 4, 27, P.black);
    poly(ctx, [[x-7,y-59+bob],[x-5,y-69+bob],[x+6,y-69+bob],[x+9,y-59+bob],[x+5,y-49+bob],[x-5,y-50+bob]], P.skin, P.black, 2);
    rect(ctx, x - 9, y - 72 + bob, 20, 6, P.red);
    rect(ctx, x + 5, y - 68 + bob, 10, 3, P.red);
    // Counting arm.
    if (!intro) {
      poly(ctx, [[x+9,y-45],[x+21,y-58],[x+25,y-54],[x+14,y-36]], P.skin, P.black, 2);
      rect(ctx, x + 22, y - 64, 3, 10, P.white);
    }
  }

  drawRoundIntro(game) {
    const ctx = this.ctx;
    const f = game.screenFrame;
    const bannerY = f < 25 ? -24 + easeOut(f / 25) * 94 : 70;
    rect(ctx, 0, bannerY, 256, 37, "rgba(9,9,17,.92)");
    line(ctx, 0, bannerY, 256, bannerY, P.amber, 2);
    line(ctx, 0, bannerY + 36, 256, bannerY + 36, P.amber, 2);
    pixelText(ctx, `ROUND ${game.round}`, 128, bannerY + 10, { scale: 2, align: "center", color: P.white, shadow: { x: 2, y: 2, color: P.red } });
    if (f > 55) pixelText(ctx, "PROTECT YOURSELF AT ALL TIMES", 128, 116, { align: "center", color: P.white, shadow: { x: 1, y: 1 } });
  }

  drawFightBanner(game) {
    const ctx = this.ctx;
    const scale = game.fightBanner > 18 ? 3 : 2;
    pixelText(ctx, "FIGHT!", 128, 105, { scale, align: "center", color: P.white, shadow: { x: scale, y: scale, color: P.red } });
  }

  drawCountOverlay(game) {
    const ctx = this.ctx;
    if (game.count <= 0) return;
    const x = game.downFor === "joe" ? 204 : 53;
    const y = 123;
    poly(ctx, [[x-23,y-17],[x+20,y-17],[x+20,y+13],[x+4,y+13],[x-3,y+21],[x-3,y+13],[x-23,y+13]], P.white, P.black, 2);
    pixelText(ctx, String(game.count), x - 2, y - 10, { scale: 3, align: "center", color: P.black });
    if (game.downFor === "mac") {
      pixelText(ctx, "MASH A+B!", 128, 91, { align: "center", color: P.amber, shadow: { x: 1, y: 1 } });
      // Recovery strip.
      rect(ctx, 82, 104, 92, 7, P.black);
      rect(ctx, 84, 106, 88 * clamp(game.recovery / game.recoveryTarget, 0, 1), 3, P.lime);
    }
    if (game.specialKO && game.count === 7) pixelText(ctx, "HE'S TRYING...", 128, 94, { align: "center", color: P.white });
  }

  drawCorner(game) {
    const ctx = this.ctx;
    rect(ctx, 0, 0, 256, 240, P.black);
    rect(ctx, 0, 0, 256, 28, P.deepBlue);
    pixelText(ctx, `END OF ROUND ${game.round}`, 128, 10, { align: "center", color: P.white });
    line(ctx, 128, 28, 128, 240, "#393642", 1);
    // Doc / Mac corner.
    rect(ctx, 0, 174, 128, 66, "#1d3d29");
    this.drawCoachBust(39, 166, game.screenFrame);
    ctx.save(); ctx.translate(84, -28); this.drawMacSprite({ state: "idle", stateFrame: game.screenFrame, tired: false }, 0, 218); ctx.restore();
    // Joe corner.
    rect(ctx, 128, 174, 128, 66, "#3c1e26");
    ctx.save(); ctx.translate(67, 14); ctx.scale(.82,.82); this.drawJoeSprite({ state: "idle", stateFrame: game.screenFrame }, 128, 216); ctx.restore();
    pixelText(ctx, "DOC'S CORNER", 12, 38, { color: P.lime });
    pixelText(ctx, "JOE'S CORNER", 244, 38, { align: "right", color: P.red });
    this.drawWrappedPixelText(game.cornerMessage || "STICK AND MOVE, MAC!", 9, 61, 112, P.white);
    this.drawWrappedPixelText("MAKE IT QUICK! I WANT TO RETIRE...", 138, 61, 110, P.white);
    if (!game.coachUsed) {
      if (Math.floor(game.screenFrame / 26) % 2 === 0) pixelText(ctx, "TAP COACH TO RECOVER", 64, 205, { align: "center", color: P.amber });
    } else {
      pixelText(ctx, "COACH USED", 64, 205, { align: "center", color: "#777781" });
    }
    pixelText(ctx, "PUNCH TO CONTINUE", 192, 220, { align: "center", color: P.amber });
  }

  drawCoachBust(x, y, f) {
    const ctx = this.ctx;
    const bob = Math.floor(f / 12) % 2;
    poly(ctx, [[x-24,y+52],[x-19,y+13],[x+19,y+13],[x+27,y+52]], P.red, P.black, 2);
    poly(ctx, [[x-15,y+12],[x-14,y-15],[x+15,y-15],[x+19,y+12],[x+8,y+29],[x-8,y+28]], "#7b3c27", P.black, 2);
    rect(ctx, x-19, y-21, 38, 10, P.white);
    poly(ctx, [[x-16,y-13],[x-15,y-27],[x-4,y-35],[x+10,y-31],[x+18,y-18],[x+12,y-8],[x-8,y-7]], P.brown, P.black, 2);
    rect(ctx, x-10, y-20, 4, 3, P.white); rect(ctx, x+7, y-20, 4, 3, P.white);
    rect(ctx, x-9, y-19, 2, 2, P.black); rect(ctx, x+8, y-19, 2, 2, P.black);
    rect(ctx, x-5, y-10+bob, 13, 3, P.white);
  }

  drawResult(game) {
    const ctx = this.ctx;
    this.drawArena(game);
    if (game.result?.winner === "mac") {
      this.drawJoeDown(game);
      const pose = { ...game.mac, state: "guard", stateFrame: game.globalFrame };
      this.drawMacSprite(pose, 112, 233);
      this.drawReferee({ ...game, countFrame: game.globalFrame });
    } else {
      this.drawJoeSprite({ ...game.joe, state: "guard" }, 128, 204);
      this.drawMacDown(game);
    }
    rect(ctx, 16, 87, 224, 69, "rgba(7,8,15,.92)");
    strokeRect(ctx, 16, 87, 224, 69, game.result?.winner === "mac" ? P.amber : P.red, 2);
    pixelText(ctx, game.result?.method || "KO", 128, 94, { scale: 3, align: "center", color: game.result?.winner === "mac" ? P.amber : P.red, shadow: { x: 2, y: 2 } });
    const headline = game.result?.winner === "mac" ? "LITTLE MAC WINS!" : "GLASS JOE WINS";
    pixelText(ctx, headline, 128, 121, { align: "center", color: P.white });
    pixelText(ctx, `ROUND ${game.result?.round || game.round}  ${game.result?.time || game.getClockText()}`, 128, 135, { align: "center", color: P.white });
    if (game.result?.special) pixelText(ctx, "WELCOME TO THE 42 CLUB", 128, 163, { align: "center", color: P.lime, shadow: { x: 1, y: 1 } });
    if (Math.floor(game.screenFrame / 28) % 2 === 0) pixelText(ctx, "PUNCH TO FIGHT AGAIN", 128, 221, { align: "center", color: P.white, shadow: { x: 1, y: 1 } });
  }

  drawParticles(game) {
    const ctx = this.ctx;
    for (const p of game.particles) {
      ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1);
      if (p.type === "star") star(ctx, p.x, p.y, p.size, p.color, P.black);
      else rect(ctx, p.x, p.y, p.size, p.size, p.color);
    }
    ctx.globalAlpha = 1;
  }

  drawPause() {
    const ctx = this.ctx;
    rect(ctx, 0, 0, 256, 240, "rgba(5,6,12,.75)");
    rect(ctx, 43, 89, 170, 62, P.black);
    strokeRect(ctx, 43, 89, 170, 62, P.white, 2);
    pixelText(ctx, "PAUSED", 128, 101, { scale: 2, align: "center", color: P.white, shadow: { x: 2, y: 2, color: P.red } });
    pixelText(ctx, "PRESS P TO RETURN", 128, 133, { align: "center", color: P.amber });
  }

  drawWrappedPixelText(text, x, y, maxWidth, color) {
    const ctx = this.ctx;
    const words = text.toUpperCase().split(" ");
    let lineText = "";
    let row = 0;
    for (const word of words) {
      const test = lineText ? `${lineText} ${word}` : word;
      if (test.length * 6 > maxWidth && lineText) {
        pixelText(ctx, lineText, x, y + row * 10, { color });
        row += 1;
        lineText = word;
      } else lineText = test;
    }
    if (lineText) pixelText(ctx, lineText, x, y + row * 10, { color });
  }
}

function tiredColor(color) {
  return color === P.green ? "#0b7d32" : "#9d5684";
}

export { P, pixelText };
