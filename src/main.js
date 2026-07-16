import { player } from "./player.js";
import { platforms, goal, checkpoints } from "./level.js";
import { updateHeat, MAX_HEAT } from "./heat.js";
import { drawEmber, drawTrail, drawBackground, drawFrostChip, stoneTile, oreTile } from "./sprites.js";

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

const MOVE_SPEED = 4;
const GRAVITY = 0.5;
const JUMP_FORCE = -11; // negative because up is negative Y on a canvas

// how far the view has scrolled right to follow the player
let cameraX = 0;
let hasWon = false;
let tick = 0; // frame counter, used to time the run animation

// where the robot pops back to, the last checkpoint reached or the level start
let respawnX = 60;
let respawnY = 100;
let gameState = "title"; // "title", "playing", "paused", "win"

// track which keys are held down right now (movement gets added next)
const keys = {
  left: false,
  right: false,
  up: false,
};

window.addEventListener("keydown", (e) => {
  if (e.code === "ArrowLeft" || e.code === "KeyA") keys.left = true;
  if (e.code === "ArrowRight" || e.code === "KeyD") keys.right = true;
  if (e.code === "ArrowUp" || e.code === "KeyW" || e.code === "Space") keys.up = true;
  // console.log(e.code); // temp, check listeners fire

  // screen transitions, enter for menus and esc to pause
  if (e.code === "Enter") {
    if (gameState === "title") gameState = "playing";
    else if (gameState === "win") {
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

// everything that changes each frame (movement, physics...)
function update() {
  // only the actual game runs physics, the screens just sit there
  if (gameState !== "playing") return;

  tick += 1;

  // assume we're in the air until a platform says otherwise this frame
  let isGrounded = false;

  // horizontal movement from input
  if (keys.left) {
    player.velocityX = -MOVE_SPEED;
  } else if (keys.right) {
    player.velocityX = MOVE_SPEED;
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
    }
  }

  // jump, only when standing on something
  if (keys.up && isGrounded) {
    player.velocityY = JUMP_FORCE;
  }

  // heat climbs on its own every frame now
  updateHeat(player);

  // touch a cooling checkpoint to reset heat and move the respawn point
  for (const c of checkpoints) {
    const hit =
      player.x < c.x + c.width &&
      player.x + player.width > c.x &&
      player.y < c.y + c.height &&
      player.y + player.height > c.y;

    if (hit && !c.activated) {
      c.activated = true;
      player.heat = 0;
      respawnX = c.x;
      respawnY = c.y;
    }
  }

  // overheated, snap back to the last checkpoint
  if (player.heat >= MAX_HEAT) {
    respawn();
  }

  // keep the player roughly centered, but don't scroll past the left edge
  cameraX = player.x + player.width / 2 - canvas.width / 2;
  if (cameraX < 0) cameraX = 0;

  // reached the goal? same overlap check we use for platforms
  const atGoal =
    player.x < goal.x + goal.width &&
    player.x + player.width > goal.x &&
    player.y < goal.y + goal.height &&
    player.y + player.height > goal.y;

  if (atGoal && !hasWon) {
    hasWon = true;
    gameState = "win";
  }
}

// draw the actual game world (platforms, goal, player, HUD)
function drawWorld() {
  // draw the platforms with the stone tile
  for (const p of platforms) {
    fillTiled(stoneTile, p.x - cameraX, p.y, p.width, p.height);
  }

  // cooling checkpoints drawn as Frost Chips, faded once used
  for (const c of checkpoints) {
    drawFrostChip(ctx, c.x - cameraX, c.y, c.width, c.height, c.activated);
  }

  // draw the goal with the glowing ore tile so it reads as special
  fillTiled(oreTile, goal.x - cameraX, goal.y, goal.width, goal.height);

  // player, glows hotter as heat climbs toward the limit
  const moving = Math.abs(player.velocityX) > 0.5;
  const hot = player.heat / MAX_HEAT > 0.6;
  drawTrail(ctx, player.x - cameraX, player.y, player.width, player.height, player.velocityX);
  drawEmber(ctx, player.x - cameraX, player.y, player.width, player.height, hot, moving, tick);

  // heat meter HUD, drawn last in raw screen coords so the camera never moves it
  const barX = 20;
  const barY = 20;
  const barW = 200;
  const barH = 18;

  // dark backing so the bar reads against the world
  ctx.fillStyle = "#16161c";
  ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);

  // fill is a countdown to forced respawn, color heats up as it climbs
  const heatRatio = player.heat / MAX_HEAT;
  let barColor = "#ffb347"; // safe
  if (heatRatio > 0.85) {
    barColor = "#ff3b1f"; // about to overheat
  } else if (heatRatio > 0.6) {
    barColor = "#ff6b35"; // getting dangerous
  }
  ctx.fillStyle = barColor;
  ctx.fillRect(barX, barY, barW * heatRatio, barH);
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
  ctx.fillText("go fast, but don't overheat", canvas.width / 2, 190);

  ctx.fillStyle = "#b0a0a0";
  ctx.font = "14px monospace";
  ctx.fillText("A / D  move        W  jump", canvas.width / 2, 265);

  if (blink()) {
    ctx.fillStyle = "#ffd27a";
    ctx.font = "bold 18px monospace";
    ctx.fillText("press ENTER to start", canvas.width / 2, 330);
  }
  ctx.textAlign = "left";
}

function drawWinScreen() {
  ctx.fillStyle = "rgba(10, 6, 10, 0.6)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.textAlign = "center";
  ctx.fillStyle = "#ffd27a";
  ctx.font = "bold 48px monospace";
  ctx.fillText("YOU ESCAPED", canvas.width / 2, 200);

  if (blink()) {
    ctx.fillStyle = "#e0d0c0";
    ctx.font = "16px monospace";
    ctx.fillText("press ENTER to play again", canvas.width / 2, 250);
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

// pop the robot back to its last checkpoint after overheating
function respawn() {
  player.x = respawnX;
  player.y = respawnY;
  player.velocityY = 0;
  player.heat = 0;
}

// put everything back to the start for a fresh run
function resetGame() {
  player.x = 60;
  player.y = 100;
  player.velocityX = 0;
  player.velocityY = 0;
  player.heat = 0;
  respawnX = 60;
  respawnY = 100;
  for (const c of checkpoints) c.activated = false;
  cameraX = 0;
  hasWon = false;
  tick = 0;
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
  if (gameState === "win") drawWinScreen();
}

// the heartbeat
function loop() {
  update();
  render();
  requestAnimationFrame(loop);
}

loop();
