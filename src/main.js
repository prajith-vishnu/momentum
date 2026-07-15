import { player } from "./player.js";
import { platforms } from "./level.js";
import { updateHeat } from "./heat.js";

// grab the canvas + its 2d drawing context
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const MOVE_SPEED = 4;
const GRAVITY = 0.5;
const JUMP_FORCE = -11; // negative because up is negative Y on a canvas

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

  // horizontal movement straight from input
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

  // jump, only when we're actually standing on something
  if (keys.up && isGrounded) {
    player.velocityY = JUMP_FORCE;
  }

  // build or bleed off heat based on how fast we're moving
  updateHeat(player);
  // console.log(player.heat); // temp, check heat rises moving and falls when still
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
    ctx.fillRect(p.x, p.y, p.width, p.height);
  }

  // draw the player
  ctx.fillStyle = "#e0653a";
  ctx.fillRect(player.x, player.y, player.width, player.height);
}

// the heartbeat
function loop() {
  update();
  render();
  requestAnimationFrame(loop);
}

loop();
