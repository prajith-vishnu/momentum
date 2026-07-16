import { player } from "./player.js";
import { platforms, goal } from "./level.js";
import { updateHeat, MAX_HEAT } from "./heat.js";
import { drawEmber, drawTrail, drawBackground, stoneTile, oreTile } from "./sprites.js";

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
});

window.addEventListener("keyup", (e) => {
  if (e.code === "ArrowLeft" || e.code === "KeyA") keys.left = false;
  if (e.code === "ArrowRight" || e.code === "KeyD") keys.right = false;
  if (e.code === "ArrowUp" || e.code === "KeyW" || e.code === "Space") keys.up = false;
});

// everything that changes each frame (movement, physics...)
function update() {
  tick += 1;

  // assume we're in the air until a platform says otherwise this frame
  let isGrounded = false;

  // horizontal movement from input, but only when not locked out by overheat
  if (!player.isOverheated) {
    if (keys.left) {
      player.velocityX = -MOVE_SPEED;
    } else if (keys.right) {
      player.velocityX = MOVE_SPEED;
    } else {
      player.velocityX = 0;
    }
  } else {
    player.velocityX = 0; // overheated, no control
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

  // jump, only when standing on something and not locked out by overheat
  if (keys.up && isGrounded && !player.isOverheated) {
    player.velocityY = JUMP_FORCE;
  }

  // build or bleed off heat based on how fast we're moving
  updateHeat(player);
  // console.log(player.heat); // temp, check heat rises moving and falls when still

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
    console.log("You win!");
  }
}

// everything that gets drawn each frame
function render() {
  // wipe last frame
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // cave background behind everything
  drawBackground(ctx, canvas.width, canvas.height, cameraX);

  // draw the platforms with the stone tile
  for (const p of platforms) {
    fillTiled(stoneTile, p.x - cameraX, p.y, p.width, p.height);
  }

  // draw the goal with the glowing ore tile so it reads as special
  fillTiled(oreTile, goal.x - cameraX, goal.y, goal.width, goal.height);

  // motion trail behind Ember, then Ember on top with his run animation
  const moving = Math.abs(player.velocityX) > 0.5;
  drawTrail(ctx, player.x - cameraX, player.y, player.width, player.height, player.velocityX);
  drawEmber(ctx, player.x - cameraX, player.y, player.width, player.height, player.isOverheated, moving, tick);

  // heat meter HUD, drawn last in raw screen coords so the camera never moves it
  const barX = 20;
  const barY = 20;
  const barW = 200;
  const barH = 18;

  // dark backing so the bar reads against the world
  ctx.fillStyle = "#16161c";
  ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);

  // fill scales with how hot we are, color heats up as it fills
  const heatRatio = player.heat / MAX_HEAT;
  let barColor = "#ffb347"; // safe
  if (player.isOverheated) {
    barColor = "#ff3b1f"; // overheated
  } else if (heatRatio > 0.7) {
    barColor = "#ff6b35"; // getting dangerous
  }
  ctx.fillStyle = barColor;
  ctx.fillRect(barX, barY, barW * heatRatio, barH);
}

// the heartbeat
function loop() {
  update();
  render();
  requestAnimationFrame(loop);
}

loop();
