import { player } from "./player.js";
import { platforms, goal } from "./level.js";
import { updateHeat } from "./heat.js";

// grab the canvas + its 2d drawing context
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const MOVE_SPEED = 4;
const GRAVITY = 0.5;
const JUMP_FORCE = -11; // negative because up is negative Y on a canvas

// how far the view has scrolled right to follow the player
let cameraX = 0;
let hasWon = false;

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

  // fill so we can see it's actually drawing
  ctx.fillStyle = "#3a2a2a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // draw the platforms, stone color from the design doc
  ctx.fillStyle = "#3a3a42";
  for (const p of platforms) {
    ctx.fillRect(p.x - cameraX, p.y, p.width, p.height);
  }

  // draw the goal, glowing ore color so it reads as special
  ctx.fillStyle = "#ffd27a";
  ctx.fillRect(goal.x - cameraX, goal.y, goal.width, goal.height);

  // draw the player
  ctx.fillStyle = "#e0653a";
  ctx.fillRect(player.x - cameraX, player.y, player.width, player.height);
}

// the heartbeat
function loop() {
  update();
  render();
  requestAnimationFrame(loop);
}

loop();
