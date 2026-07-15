import { player } from "./player.js";

// grab the canvas + its 2d drawing context
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const MOVE_SPEED = 4;
const GRAVITY = 0.5;
const FLOOR_Y = 420; // temp floor, real platforms come in step 5

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

  // temp floor, stop the player once its feet reach the line
  if (player.y + player.height > FLOOR_Y) {
    player.y = FLOOR_Y - player.height;
    player.velocityY = 0;
  }
}

// everything that gets drawn each frame
function render() {
  // wipe last frame
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // fill so we can see it's actually drawing
  ctx.fillStyle = "#3a2a2a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

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
