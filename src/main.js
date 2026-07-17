import { player } from "./player.js";
import { firstPlatform, nextPlatform, BIOMES, BIOME_LENGTH } from "./level.js";
import { updateHeat, MAX_HEAT } from "./heat.js";
import { drawEmber, drawTrail, drawBackground, drawFrostChip, drawSpikes, drawEnemy, drawFlyer, drawShard, stoneTile } from "./sprites.js";
import { initAudio, startMusic, setMusicHeat, toggleMute, playJump, playChip, playStomp, playHurt } from "./sound.js";

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
const CHIP_BASE = 1100; // base distance between chips, divided by difficulty
const FALL_LIMIT = 320; // fall this far below your last footing and it's over

// the endless world, rebuilt on each run
let platforms = [];
let chips = [];
let spikes = [];
let enemies = [];
let shards = [];
let particles = [];
let lastChipX = 0; // x of the most recent chip, so we can space the next one
let shardCooldown = 3; // platforms between bonus shards
let spikeCooldown = 4; // platforms to keep clear before the next spike patch
let enemyCooldown = 4; // same idea for enemies

// run state
let cameraX = 0;
let cameraY = 0;
let shake = 0; // current screen-shake strength, decays every frame
let biomeIndex = 0; // which biome we're in, from how far we've travelled
let biomeAnnounce = 0; // frames left to show the biome name popup
let muted = false; // sound on/off, toggled with M
let lastGroundY = 0; // top of the last platform we stood on, for the fall check
let tick = 0; // frame counter, used to time the run animation
let furthestX = 0; // how far right we've reached, drives the score
let chipsGrabbed = 0;
let enemiesStomped = 0;
let shardsGrabbed = 0;
let score = 0;
let highScore = loadHighScore(); // best run, kept in the browser between sessions
let deathCause = ""; // what killed us this run, shown on the game over screen
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

  // screen transitions, space to start/restart and esc to pause
  if (e.code === "Space") {
    if (gameState === "title" || gameState === "gameover") {
      resetGame();
      gameState = "playing";
      startMusic(); // loops from the first run onward
    }
  }
  if (e.code === "Escape") {
    if (gameState === "playing") gameState = "paused";
    else if (gameState === "paused") gameState = "playing";
  }
  if (e.code === "KeyM") muted = toggleMute();
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
    if (spikeCooldown > 0) spikeCooldown -= 1;
    if (enemyCooldown > 0) enemyCooldown -= 1;
    if (shardCooldown > 0) shardCooldown -= 1;

    // bonus ember shards, more likely up on the high, risky platforms
    if (shardCooldown === 0) {
      const highUp = p.y < 260; // near the top floor
      if (Math.random() < (highUp ? 0.5 : 0.12)) {
        shards.push({ x: p.x + p.width / 2 - 9, y: p.y - 34, width: 18, height: 18, collected: false });
        shardCooldown = 4;
      }
    }

    // cooling chips are spaced by distance, and get closer together the deeper
    // (and hotter) the run gets, so there's always one in reach if you keep moving
    let hasChip = false;
    const difficulty = Math.min(0.5 + p.x / 7000, 2.5);
    const chipGap = CHIP_BASE / difficulty;
    if (p.x - lastChipX >= chipGap) {
      chips.push({
        x: p.x + p.width / 2 - 10,
        y: p.y - 40,
        width: 20,
        height: 40,
        collected: false,
      });
      lastChipX = p.x;
      hasChip = true;
    }

    // one hazard per platform at most, a spike patch or an enemy.
    // never on a chip platform, and spaced out by their cooldowns.
    if (!hasChip && p.width >= 180) {
      const roll = Math.random();
      if (spikeCooldown === 0 && roll < 0.28) {
        const sw = 48;
        spikes.push({ x: p.x + p.width / 2 - sw / 2, y: p.y - 20, width: sw, height: 20 });
        spikeCooldown = 2;
        enemyCooldown = Math.max(enemyCooldown, 1);
      } else if (enemyCooldown === 0 && roll < 0.56) {
        if (Math.random() < 0.5) {
          // ground beast, patrols the platform
          enemies.push({
            type: "walker",
            x: p.x + 20,
            y: p.y - 28,
            width: 30,
            height: 28,
            vx: 1,
            minX: p.x,
            maxX: p.x + p.width,
            alive: true,
          });
        } else {
          // fire-bat, swoops up and down over the platform
          const baseY = p.y - 45;
          enemies.push({
            type: "flyer",
            x: p.x + p.width / 2 - 17,
            y: baseY,
            baseY: baseY,
            amp: 22,
            bob: Math.random() * Math.PI * 2,
            width: 34,
            height: 24,
            vx: 0.6,
            minX: p.x,
            maxX: p.x + p.width,
            alive: true,
          });
        }
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
  while (shards.length > 0 && shards[0].x + shards[0].width < left) {
    shards.shift();
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
      // kick up dust on a hard landing
      if (player.velocityY > 4) {
        spawnParticles(player.x + player.width / 2, player.y + player.height, 6, "#6a6a72", { spread: 2, up: 0.4, life: 16, size: 2, gravity: 0.2 });
      }
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

  // heat climbs every frame, faster with momentum, and the whole run ramps up
  // the further you get. starts very gentle, tightens the deeper you go.
  const difficulty = Math.min(0.5 + furthestX / 7000, 2.5);
  updateHeat(player, momentumRatio, difficulty);

  // embers rise off the robot as it gets hot, and the music speeds up with it
  const heatRatio = player.heat / MAX_HEAT;
  setMusicHeat(heatRatio);
  if (heatRatio > 0.4 && tick % 3 === 0) {
    spawnParticles(player.x + player.width / 2, player.y + player.height / 2, 1, "#ff8c3a", { spread: 1, up: 1.3, life: 22, size: 2, gravity: -0.03 });
  }

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
      spawnParticles(c.x + c.width / 2, c.y + c.height / 2, 12, "#5fd4e0", { spread: 3, up: 1, life: 26, size: 3, gravity: 0.1 });
    }
  }

  // grab bonus ember shards for points
  for (const s of shards) {
    if (s.collected) continue;
    const hit =
      player.x < s.x + s.width &&
      player.x + player.width > s.x &&
      player.y < s.y + s.height &&
      player.y + player.height > s.y;
    if (hit) {
      s.collected = true;
      shardsGrabbed += 1;
      playChip();
      spawnParticles(s.x + s.width / 2, s.y + s.height / 2, 10, "#ffd27a", { spread: 3, up: 1, life: 24, size: 3, gravity: 0.1 });
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
      endRun("spike");
      return;
    }
  }

  // enemies patrol their platform. stomp them from above, die on side contact.
  for (const en of enemies) {
    if (!en.alive) continue;

    if (en.type === "flyer") {
      // drift side to side and bob up and down into the player's path
      en.x += en.vx;
      if (en.x < en.minX || en.x + en.width > en.maxX) en.vx *= -1;
      en.bob += 0.06;
      en.y = en.baseY + Math.sin(en.bob) * en.amp;
    } else {
      en.x += en.vx;
      if (en.x < en.minX || en.x + en.width > en.maxX) {
        en.vx *= -1;
        en.x = Math.max(en.minX, Math.min(en.maxX - en.width, en.x));
      }
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
      addShake(4);
      spawnParticles(en.x + en.width / 2, en.y + en.height / 2, 10, "#ff8c3a", { spread: 4, life: 22, size: 3, gravity: 0.2 });
    } else {
      endRun("enemy");
      return;
    }
  }

  // overheating or falling off ends the run, each with its own cause
  if (player.heat >= MAX_HEAT) {
    endRun("overheat");
    return;
  }
  if (player.y > lastGroundY + FALL_LIMIT) {
    endRun("fall");
    return;
  }

  // camera follows the player, snapping horizontally and easing vertically
  cameraX = player.x + player.width / 2 - canvas.width / 2;
  if (cameraX < 0) cameraX = 0;
  const targetCamY = player.y + player.height / 2 - canvas.height / 2;
  cameraY += (targetCamY - cameraY) * 0.1;

  // score climbs with distance, plus bonuses for chips, stomps, and shards
  if (player.x > furthestX) furthestX = player.x;
  score = Math.floor(furthestX / 10) + chipsGrabbed * 100 + enemiesStomped * 150 + shardsGrabbed * 250;

  // biome from how far we've travelled, announce each new one
  const bi = Math.floor(furthestX / BIOME_LENGTH) % BIOMES.length;
  if (bi !== biomeIndex) {
    biomeIndex = bi;
    biomeAnnounce = 130;
  }
  if (biomeAnnounce > 0) biomeAnnounce -= 1;

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

  // enemies, ground beasts and swooping fire-bats
  for (const en of enemies) {
    if (!en.alive) continue;
    if (en.type === "flyer") {
      drawFlyer(ctx, en.x - cameraX, en.y - cameraY, en.width, en.height, tick);
    } else {
      drawEnemy(ctx, en.x - cameraX, en.y - cameraY, en.width, en.height, tick);
    }
  }

  // cooling chips drawn as Frost Chips, faded once grabbed
  for (const c of chips) {
    drawFrostChip(ctx, c.x - cameraX, c.y - cameraY, c.width, c.height, c.collected);
  }

  // bonus ember shards
  for (const s of shards) {
    if (s.collected) continue;
    drawShard(ctx, s.x - cameraX, s.y - cameraY, s.width, s.height);
  }

  // particles behind the player
  for (const pt of particles) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    ctx.fillStyle = pt.color;
    ctx.fillRect(pt.x - cameraX, pt.y - cameraY, pt.size, pt.size);
  }
  ctx.globalAlpha = 1;

  // player, visor + core shift from yellow to red as heat climbs
  const moving = Math.abs(player.velocityX) > 0.5;
  const heatRatio = player.heat / MAX_HEAT;
  drawTrail(ctx, player.x - cameraX, player.y - cameraY, player.width, player.height, player.velocityX);
  drawEmber(ctx, player.x - cameraX, player.y - cameraY, player.width, player.height, heatRatio, moving, tick);

  // warm light the robot throws off, growing and reddening with heat
  const lx = player.x - cameraX + player.width / 2;
  const ly = player.y - cameraY + player.height / 2;
  const lightR = 90 + heatRatio * 70;
  const lg = Math.round(170 - heatRatio * 110);
  const lb = Math.round(80 - heatRatio * 50);
  const light = ctx.createRadialGradient(lx, ly, 0, lx, ly, lightR);
  light.addColorStop(0, "rgba(255, " + lg + ", " + lb + ", " + (0.12 + heatRatio * 0.18).toFixed(3) + ")");
  light.addColorStop(1, "rgba(255, " + lg + ", " + lb + ", 0)");
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

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

  // muted indicator under the score
  if (muted) {
    ctx.fillStyle = "#8a8a92";
    ctx.font = "12px monospace";
    ctx.fillText("MUTED", canvas.width - 20, 54);
  }
  ctx.textAlign = "left";
}

// kick the screen shake, keeping the strongest hit if one's already going
function addShake(amount) {
  if (amount > shake) shake = amount;
}

// spray some particles out from a point
function spawnParticles(x, y, count, color, opts) {
  opts = opts || {};
  const spread = opts.spread || 3;
  const life = opts.life || 24;
  const size = opts.size || 3;
  const up = opts.up || 0;
  const gravity = opts.gravity != null ? opts.gravity : 0.15;
  for (let i = 0; i < count; i++) {
    particles.push({
      x: x,
      y: y,
      vx: (Math.random() * 2 - 1) * spread,
      vy: (Math.random() * 2 - 1) * spread - up,
      life: life,
      maxLife: life,
      size: size,
      color: color,
      gravity: gravity,
    });
  }
}

// move and age every particle, dropping the dead ones. runs even on the
// game-over screen so death bursts still animate.
function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const pt = particles[i];
    pt.vy += pt.gravity;
    pt.x += pt.vx;
    pt.y += pt.vy;
    pt.life -= 1;
    if (pt.life <= 0) particles.splice(i, 1);
  }
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
  ctx.fillText("A / D  move     W  jump     M  mute", canvas.width / 2, 260);

  if (highScore > 0) {
    ctx.fillStyle = "#ffd27a";
    ctx.font = "16px monospace";
    ctx.fillText("best  " + highScore, canvas.width / 2, 295);
  }

  if (blink()) {
    ctx.fillStyle = "#ffd27a";
    ctx.font = "bold 18px monospace";
    ctx.fillText("press SPACE to start", canvas.width / 2, 330);
  }
  ctx.textAlign = "left";
}

function drawGameOverScreen() {
  ctx.fillStyle = "rgba(10, 6, 10, 0.6)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.textAlign = "center";
  ctx.fillStyle = "#ff3b1f";
  ctx.font = "bold 48px monospace";
  ctx.fillText(deathCause === "overheat" ? "OVERHEATED" : "GAME OVER", canvas.width / 2, 180);

  ctx.fillStyle = "#eafcff";
  ctx.font = "bold 26px monospace";
  ctx.fillText("score  " + score, canvas.width / 2, 222);

  ctx.fillStyle = "#ffd27a";
  ctx.font = "16px monospace";
  ctx.fillText("best  " + highScore, canvas.width / 2, 252);

  if (blink()) {
    ctx.fillStyle = "#e0d0c0";
    ctx.font = "16px monospace";
    ctx.fillText("press SPACE to run again", canvas.width / 2, 295);
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
function endRun(cause) {
  gameState = "gameover";
  deathCause = cause;
  setMusicHeat(0); // ease the tempo back down on the game-over screen
  playHurt();
  addShake(9);
  spawnParticles(player.x + player.width / 2, player.y + player.height / 2, 26, "#ff3b1f", { spread: 5, life: 32, size: 3, gravity: 0.15 });
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
  shards = [];
  particles = [];
  lastChipX = 0;
  shardCooldown = 3;
  spikeCooldown = 4;
  enemyCooldown = 4;
  enemiesStomped = 0;
  shardsGrabbed = 0;
  deathCause = "";
  cameraX = 0;
  cameraY = player.y + player.height / 2 - canvas.height / 2;
  biomeIndex = 0;
  biomeAnnounce = 0;
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

  updateParticles();

  // cave background behind everything, steady so it doesn't tear at the edges
  drawBackground(ctx, canvas.width, canvas.height, cameraX, BIOMES[biomeIndex]);

  if (gameState === "title") {
    drawTitleScreen();
    return;
  }

  // shake only the world, then decay it
  ctx.save();
  if (shake > 0) {
    const dx = (Math.random() * 2 - 1) * shake;
    const dy = (Math.random() * 2 - 1) * shake;
    ctx.translate(dx, dy);
    shake *= 0.85;
    if (shake < 0.3) shake = 0;
  }
  drawWorld();
  ctx.restore();

  // biome name popup, fades out over its last stretch
  if (biomeAnnounce > 0) {
    ctx.globalAlpha = Math.min(1, biomeAnnounce / 40);
    ctx.fillStyle = "#ffd27a";
    ctx.font = "bold 30px monospace";
    ctx.textAlign = "center";
    ctx.fillText(BIOMES[biomeIndex].name, canvas.width / 2, 90);
    ctx.textAlign = "left";
    ctx.globalAlpha = 1;
  }

  // overlays sit still on top so their text stays readable
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
