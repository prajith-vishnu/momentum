import { player } from "./player.js";
import { firstPlatform, nextPlatform } from "./level.js";
import { updateHeat, MAX_HEAT } from "./heat.js";
import { drawEmber, drawTrail, drawBackground, drawFrostChip, drawSpikes, drawEnemy, stoneTile } from "./sprites.js";
import { initAudio, playJump, playChip, playStomp, playHurt } from "./sound.js";

// grab the canvas + its 2d drawing context
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// keep the pixel art crisp instead of blurry when it scales
ctx.imageSmoothingEnabled = false;

// paint a tile canvas repeatedly to fill a rectangle, clipped to its edges
function fillTiled(tile, x, y, w, h) {
  const size = tile.width;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const startX = Math.floor(x);
  const startY = Math.floor(y);
  for (let ty = startY; ty < y + h; ty += size) {
    for (let tx = startX; tx < x + w; tx += size) {
      ctx.drawImage(tile, tx, ty);
    }
  }
  ctx.restore();
}

const BASE_SPEED = 3;       // speed with no momentum
const MAX_EXTRA_SPEED = 4;  // added on top at full momentum, so top speed is 7
const MAX_MOMENTUM = 100;
const MOMENTUM_GAIN = 0.1;  // built per frame while moving, slow ramp up
const MOMENTUM_LOSS = 0.5;  // lost per frame while stopped, drops off quick
const GRAVITY = 0.5;
const JUMP_FORCE = -11; // negative because up is negative Y on a canvas
const CHIP_EVERY = 6;   // a cooling chip roughly every this many platforms
const FALL_LIMIT = 320; // fall this far below your last footing and it's over

// the endless world, rebuilt on each run
let platforms = [];
let chips = [];
let spikes = [];
let enemies = [];
let platformsSinceChip = 0;
let chipEvery = CHIP_EVERY;
let spikeCooldown = 4; // platforms to keep clear before the next spike patch
let enemyCooldown = 4; // same idea for enemies

// run state
let cameraX = 0;
let cameraY = 0;
let lastGroundY = 0; // top of the last platform we stood on, for the fall check
let tick = 0; // frame counter, used to time the run animation
let furthestX = 0; // how far right we've reached, drives the score
let chipsGrabbed = 0;
let enemiesStomped = 0;
let score = 0;
let highScore = loadHighScore(); // best run, kept in the browser between sessions
let gameState = "title"; // "title", "playing", "paused", "gameover"

// track which keys are held down right now
const keys = {
  left: false,
  right: false,
  up: false,
};

window.addEventListener("keydown", (e) => {
  initAudio(); // start/resume the audio context on the first key press

  if (e.code === "ArrowLeft" || e.code === "KeyA") keys.left = true;
  if (e.code === "ArrowRight" || e.code === "KeyD") keys.right = true;
  if (e.code === "ArrowUp" || e.code === "KeyW" || e.code === "Space") keys.up = true;

  // screen transitions, enter for menus and esc to pause
  if (e.code === "Enter") {
    if (gameState === "title" || gameState === "gameover") {
      resetGame();
      gameState = "playing";
    }
  }
  if (e.code === "Escape") {
    if (gameState === "playing") gameState = "paused";
    else if (gameState === "paused") gameState = "playing";
  }
});

window.addEventListener("keyup", (e) => {
  if (e.code === "ArrowLeft" || e.code === "KeyA") keys.left = false;
  if (e.code === "ArrowRight" || e.code === "KeyD") keys.right = false;
  if (e.code === "ArrowUp" || e.code === "KeyW" || e.code === "Space") keys.up = false;
});

// keep generating platforms (and the odd chip) ahead of the camera
function generateWorld() {
  let last = platforms[platforms.length - 1];
  while (last.x < cameraX + canvas.width + 400) {
    const p = nextPlatform(last);
    platforms.push(p);
    platformsSinceChip += 1;
    if (spikeCooldown > 0) spikeCooldown -= 1;
    if (enemyCooldown > 0) enemyCooldown -= 1;

    // drop a cooling chip every so many platforms
    let hasChip = false;
    if (platformsSinceChip >= chipEvery) {
      chips.push({
        x: p.x + p.width / 2 - 10,
        y: p.y - 40,
        width: 20,
        height: 40,
        collected: false,
      });
      platformsSinceChip = 0;
      chipEvery = CHIP_EVERY + Math.floor(Math.random() * 3); // 6 to 8
      hasChip = true;
    }

    // one hazard per platform at most, a spike patch or a patrolling enemy.
    // never on a chip platform, and spaced out by their cooldowns.
    if (!hasChip && p.width >= 180) {
      const roll = Math.random();
      if (spikeCooldown === 0 && roll < 0.28) {
        const sw = 48;
        spikes.push({ x: p.x + p.width / 2 - sw / 2, y: p.y - 20, width: sw, height: 20 });
        spikeCooldown = 2;
        enemyCooldown = Math.max(enemyCooldown, 1);
      } else if (enemyCooldown === 0 && roll < 0.56) {
        enemies.push({
          x: p.x + 20,
          y: p.y - 28,
          width: 30,
          height: 28,
          vx: 1,
          minX: p.x,
          maxX: p.x + p.width,
          alive: true,
        });
        enemyCooldown = 2;
        spikeCooldown = Math.max(spikeCooldown, 1);
      }
    }

    last = p;
  }
}

// drop platforms and chips that have scrolled off the left so the arrays stay small
function cullWorld() {
  const left = cameraX - 200;
  while (platforms.length > 1 && platforms[0].x + platforms[0].width < left) {
    platforms.shift();
  }
  while (chips.length > 0 && chips[0].x + chips[0].width < left) {
    chips.shift();
  }
  while (spikes.length > 0 && spikes[0].x + spikes[0].width < left) {
    spikes.shift();
  }
  while (enemies.length > 0 && enemies[0].x + enemies[0].width < left) {
    enemies.shift();
  }
}

// everything that changes each frame (movement, physics...)
function update() {
  // only the actual game runs physics, the screens just sit there
  if (gameState !== "playing") return;

  tick += 1;

  // assume we're in the air until a platform says otherwise this frame
  let isGrounded = false;

  // momentum builds while you keep moving and bleeds away the moment you stop
  if (keys.left || keys.right) {
    player.momentum = Math.min(MAX_MOMENTUM, player.momentum + MOMENTUM_GAIN);
  } else {
    player.momentum = Math.max(0, player.momentum - MOMENTUM_LOSS);
  }
  const momentumRatio = player.momentum / MAX_MOMENTUM;
  const speed = BASE_SPEED + momentumRatio * MAX_EXTRA_SPEED;

  // horizontal movement from input, faster the more momentum you've built
  if (keys.left) {
    player.velocityX = -speed;
  } else if (keys.right) {
    player.velocityX = speed;
  } else {
    player.velocityX = 0;
  }
  player.x += player.velocityX;

  // gravity, falling speeds up over time instead of a constant sink
  player.velocityY += GRAVITY;
  player.y += player.velocityY;

  // land on any platform the feet are dropping onto
  for (const p of platforms) {
    const playerBottom = player.y + player.height;
    const withinX = player.x + player.width > p.x && player.x < p.x + p.width;
    // feet are at or past the platform top while the head is still above it
    const landing = playerBottom >= p.y && player.y < p.y;

    if (withinX && landing && player.velocityY >= 0) {
      player.y = p.y - player.height;
      player.velocityY = 0;
      isGrounded = true;
      lastGroundY = player.y;
    }
  }

  // jump, only when standing on something
  if (keys.up && isGrounded) {
    player.velocityY = JUMP_FORCE;
    playJump();
  }

  // heat climbs every frame, faster the more momentum you're carrying
  updateHeat(player, momentumRatio);

  // grab a cooling chip to reset heat, worth bonus points
  for (const c of chips) {
    if (c.collected) continue;
    const hit =
      player.x < c.x + c.width &&
      player.x + player.width > c.x &&
      player.y < c.y + c.height &&
      player.y + player.height > c.y;

    if (hit) {
      c.collected = true;
      player.heat = 0;
      chipsGrabbed += 1;
      playChip();
    }
  }

  // spikes are instant death
  for (const s of spikes) {
    const hit =
      player.x < s.x + s.width &&
      player.x + player.width > s.x &&
      player.y < s.y + s.height &&
      player.y + player.height > s.y;
    if (hit) {
      endRun();
      return;
    }
  }

  // enemies patrol their platform. stomp them from above, die on side contact.
  for (const en of enemies) {
    if (!en.alive) continue;

    en.x += en.vx;
    if (en.x < en.minX || en.x + en.width > en.maxX) {
      en.vx *= -1;
      en.x = Math.max(en.minX, Math.min(en.maxX - en.width, en.x));
    }

    const hit =
      player.x < en.x + en.width &&
      player.x + player.width > en.x &&
      player.y < en.y + en.height &&
      player.y + player.height > en.y;
    if (!hit) continue;

    // coming down onto its head is a stomp, anything else kills you
    if (player.velocityY > 0 && player.y + player.height < en.y + en.height * 0.6) {
      en.alive = false;
      player.velocityY = JUMP_FORCE * 0.6; // bounce off the top
      enemiesStomped += 1;
      playStomp();
    } else {
      endRun();
      return;
    }
  }

  // overheating, or falling well below your last footing, ends the run
  if (player.heat >= MAX_HEAT || player.y > lastGroundY + FALL_LIMIT) {
    endRun();
    return;
  }

  // camera follows the player, snapping horizontally and easing vertically
  cameraX = player.x + player.width / 2 - canvas.width / 2;
  if (cameraX < 0) cameraX = 0;
  const targetCamY = player.y + player.height / 2 - canvas.height / 2;
  cameraY += (targetCamY - cameraY) * 0.1;

  // score climbs with distance, plus a chunk per chip and per enemy stomped
  if (player.x > furthestX) furthestX = player.x;
  score = Math.floor(furthestX / 10) + chipsGrabbed * 100 + enemiesStomped * 150;

  generateWorld();
  cullWorld();
}

// draw the actual game world (platforms, chips, player, HUD)
function drawWorld() {
  // draw the platforms with the stone tile
  for (const p of platforms) {
    fillTiled(stoneTile, p.x - cameraX, p.y - cameraY, p.width, p.height);
  }

  // spikes sitting on their platforms
  for (const s of spikes) {
    drawSpikes(ctx, s.x - cameraX, s.y - cameraY, s.width, s.height);
  }

  // enemies patrolling their platforms
  for (const en of enemies) {
    if (!en.alive) continue;
    drawEnemy(ctx, en.x - cameraX, en.y - cameraY, en.width, en.height, tick);
  }

  // cooling chips drawn as Frost Chips, faded once grabbed
  for (const c of chips) {
    drawFrostChip(ctx, c.x - cameraX, c.y - cameraY, c.width, c.height, c.collected);
  }

  // player, visor + core shift from yellow to red as heat climbs
  const moving = Math.abs(player.velocityX) > 0.5;
  const heatRatio = player.heat / MAX_HEAT;
  drawTrail(ctx, player.x - cameraX, player.y - cameraY, player.width, player.height, player.velocityX);
  drawEmber(ctx, player.x - cameraX, player.y - cameraY, player.width, player.height, heatRatio, moving, tick);

  // heat meter HUD, drawn in raw screen coords so the camera never moves it
  const barX = 20;
  const barY = 20;
  const barW = 200;
  const barH = 18;

  // dark backing so the bar reads against the world
  ctx.fillStyle = "#16161c";
  ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);

  // fill is a countdown to overheating, color heats up as it climbs
  let barColor = "#ffb347"; // safe
  if (heatRatio > 0.85) {
    barColor = "#ff3b1f"; // about to overheat
  } else if (heatRatio > 0.6) {
    barColor = "#ff6b35"; // getting dangerous
  }
  ctx.fillStyle = barColor;
  ctx.fillRect(barX, barY, barW * heatRatio, barH);

  // score counter, top right
  ctx.fillStyle = "#eafcff";
  ctx.font = "bold 22px monospace";
  ctx.textAlign = "right";
  ctx.fillText(score, canvas.width - 20, 34);
  ctx.textAlign = "left";
}

// blink text on and off, used for the "press ..." prompts
function blink() {
  return Math.floor(Date.now() / 500) % 2 === 0;
}

function drawTitleScreen() {
  ctx.fillStyle = "rgba(10, 6, 10, 0.55)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.textAlign = "center";
  ctx.fillStyle = "#ff8c42";
  ctx.font = "bold 56px monospace";
  ctx.fillText("MOMENTUM", canvas.width / 2, 150);

  ctx.fillStyle = "#e0d0c0";
  ctx.font = "16px monospace";
  ctx.fillText("keep moving, grab the chips, don't overheat", canvas.width / 2, 190);

  ctx.fillStyle = "#b0a0a0";
  ctx.font = "14px monospace";
  ctx.fillText("A / D  move        W  jump", canvas.width / 2, 260);

  if (highScore > 0) {
    ctx.fillStyle = "#ffd27a";
    ctx.font = "16px monospace";
    ctx.fillText("best  " + highScore, canvas.width / 2, 295);
  }

  if (blink()) {
    ctx.fillStyle = "#ffd27a";
    ctx.font = "bold 18px monospace";
    ctx.fillText("press ENTER to start", canvas.width / 2, 330);
  }
  ctx.textAlign = "left";
}

function drawGameOverScreen() {
  ctx.fillStyle = "rgba(10, 6, 10, 0.6)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.textAlign = "center";
  ctx.fillStyle = "#ff3b1f";
  ctx.font = "bold 48px monospace";
  ctx.fillText("GAME OVER", canvas.width / 2, 180);

  ctx.fillStyle = "#eafcff";
  ctx.font = "bold 26px monospace";
  ctx.fillText("score  " + score, canvas.width / 2, 222);

  ctx.fillStyle = "#ffd27a";
  ctx.font = "16px monospace";
  ctx.fillText("best  " + highScore, canvas.width / 2, 252);

  if (blink()) {
    ctx.fillStyle = "#e0d0c0";
    ctx.font = "16px monospace";
    ctx.fillText("press ENTER to run again", canvas.width / 2, 295);
  }
  ctx.textAlign = "left";
}

function drawPauseScreen() {
  ctx.fillStyle = "rgba(10, 6, 10, 0.5)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 40px monospace";
  ctx.fillText("PAUSED", canvas.width / 2, 200);

  ctx.fillStyle = "#b0a0a0";
  ctx.font = "14px monospace";
  ctx.fillText("press ESC to resume", canvas.width / 2, 240);
  ctx.textAlign = "left";
}

// read/write the saved high score, wrapped so it never crashes if storage is off
function loadHighScore() {
  try {
    return Number(localStorage.getItem("momentumHighScore")) || 0;
  } catch (e) {
    return 0;
  }
}

function saveHighScore(value) {
  try {
    localStorage.setItem("momentumHighScore", value);
  } catch (e) {
    // storage unavailable, just keep it in memory for this session
  }
}

// end the run, banking a new high score if we beat it
function endRun() {
  gameState = "gameover";
  playHurt();
  if (score > highScore) {
    highScore = score;
    saveHighScore(highScore);
  }
}

// wipe the world and the robot for a fresh run
function resetGame() {
  player.x = 60;
  player.y = 340;
  player.velocityX = 0;
  player.velocityY = 0;
  player.heat = 0;
  player.momentum = 0;
  lastGroundY = 340;

  platforms = [firstPlatform()];
  chips = [];
  spikes = [];
  enemies = [];
  platformsSinceChip = 0;
  chipEvery = CHIP_EVERY;
  spikeCooldown = 4;
  enemyCooldown = 4;
  enemiesStomped = 0;
  cameraX = 0;
  cameraY = player.y + player.height / 2 - canvas.height / 2;
  tick = 0;
  furthestX = 0;
  chipsGrabbed = 0;
  score = 0;
  generateWorld();
}

// everything that gets drawn each frame, depends on what screen we're on
function render() {
  // wipe last frame
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // cave background behind everything
  drawBackground(ctx, canvas.width, canvas.height, cameraX);

  if (gameState === "title") {
    drawTitleScreen();
    return;
  }

  drawWorld();

  if (gameState === "paused") drawPauseScreen();
  if (gameState === "gameover") drawGameOverScreen();
}

// the heartbeat
function loop() {
  update();
  render();
  requestAnimationFrame(loop);
}

// build a starting world so there's something to show before the first run
resetGame();
loop();
