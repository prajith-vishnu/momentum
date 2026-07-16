// Ember, drawn straight from pixel data so no image files are needed.
// legend: . clear  O outline  H helmet  V visor  B body  A accent  C core  L legs  S boot
// the top half (head + torso) never changes, only the legs swap for the run cycle.
const emberTop = [
  "..OOOOOO..",
  ".OHHHHHHO.",
  ".OHVVVVHO.",
  ".OHVVVVHO.",
  ".OHHHHHHO.",
  "..OOOOOO..",
  ".OBBAABBO.",
  "OBBBCCBBBO",
  "OBBBCCBBBO",
  ".OBBBBBBO.",
];

// standing still, both feet planted together
const idleLegs = [
  ".OBB..BBO.",
  ".OLL..LLO.",
  ".OLL..LLO.",
  ".OLL..LLO.",
  ".OSS..SSO.",
  "..OO..OO..",
];

// run frame with the left foot striding forward
const runLegsA = [
  ".OBB..BBO.",
  ".OLL..LLO.",
  ".OLL..LLO.",
  ".OLL..LLO.",
  ".SS...SSO.",
  ".OO...OO..",
];

// run frame with the right foot striding forward
const runLegsB = [
  ".OBB..BBO.",
  ".OLL..LLO.",
  ".OLL..LLO.",
  ".OLL..LLO.",
  ".OSS...SS.",
  "..OO...OO.",
];

// base body colors. the visor + core glow is filled in from heat (see heatColor).
const baseColors = {
  O: "#16161c", // outline
  H: "#2c2c38", // helmet
  B: "#23232c", // suit
  A: "#ff6b35", // chest stripe
  L: "#1b1b22", // legs
  S: "#ff6b35", // boots
};

// glow color for the visor + core: light yellow when cool, dark red when hot
const heatStops = [
  [0.0, 255, 232, 150], // light yellow
  [0.5, 255, 128, 48],  // orange
  [1.0, 150, 24, 12],   // dark red
];

function heatColor(ratio) {
  let a = heatStops[0];
  let b = heatStops[heatStops.length - 1];
  for (let i = 0; i < heatStops.length - 1; i++) {
    if (ratio >= heatStops[i][0] && ratio <= heatStops[i + 1][0]) {
      a = heatStops[i];
      b = heatStops[i + 1];
      break;
    }
  }
  const f = (ratio - a[0]) / (b[0] - a[0] || 1);
  const r = Math.round(a[1] + (b[1] - a[1]) * f);
  const g = Math.round(a[2] + (b[2] - a[2]) * f);
  const bl = Math.round(a[3] + (b[3] - a[3]) * f);
  return "rgb(" + r + ", " + g + ", " + bl + ")";
}

export function drawEmber(ctx, x, y, w, h, heat, moving, tick) {
  // pick legs, and add a little up/down bob while running
  let legs = idleLegs;
  let bob = 0;
  if (moving) {
    const step = Math.floor(tick / 6) % 2; // swap frame every 6 ticks
    legs = step === 0 ? runLegsA : runLegsB;
    bob = step === 0 ? 0 : -2;
  }
  y += bob;

  const grid = emberTop.concat(legs);
  const rows = grid.length;
  const cols = grid[0].length;
  const blockW = w / cols;
  const blockH = h / rows;

  let glow = heatColor(heat);
  // flash bright red as a warning once heat is near the limit
  if (heat > 0.75 && Math.floor(Date.now() / 150) % 2 === 0) {
    glow = "#ff2a10";
  }

  // danger halo grows and reddens as heat climbs
  if (heat > 0.05) {
    ctx.save();
    ctx.globalAlpha = 0.18 * heat;
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2, w, h, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // visor + core glow with the heat color, the rest stays its base color
  const colors = { ...baseColors, V: glow, C: glow };
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const key = grid[row][col];
      if (key === ".") continue;

      ctx.fillStyle = colors[key];
      // ceil + 1 so the blocks tile together with no gaps at fractional sizes
      ctx.fillRect(x + col * blockW, y + row * blockH, Math.ceil(blockW) + 1, Math.ceil(blockH) + 1);
    }
  }
}

// --- Frost Chip, the icy cooling pickup, the only blue thing in the game ---
// legend: . clear  O outline  F base fill  H highlight/core
const frostGrid = [
  "...OO...",
  "..OFFO..",
  ".OFHHFO.",
  "OFHHHHFO",
  "OFFHHFFO",
  ".OFFFFO.",
  "..OFFO..",
  "...OO...",
  "...OO...",
];

const frostColors = {
  O: "#0d1b2e", // cold navy outline
  F: "#3ec9f0", // icy blue body
  H: "#eafcff", // pale cyan core
};

export function drawFrostChip(ctx, boxX, boxY, boxW, boxH, used) {
  const cols = 8;
  const rows = frostGrid.length;
  const gemW = boxW;
  const gemH = (gemW * rows) / cols;
  const blockW = gemW / cols;
  const blockH = gemH / rows;

  const base = used ? 0.28 : 1; // spent chips fade out
  const bob = used ? 0 : Math.sin(Date.now() / 400 + boxX) * 2; // gentle idle float
  const x = boxX;
  const y = boxY + (boxH - gemH) / 2 + bob;

  // faint cold glow behind it
  ctx.save();
  ctx.globalAlpha = 0.14 * base;
  ctx.fillStyle = "#3ec9f0";
  ctx.beginPath();
  ctx.ellipse(x + gemW / 2, y + gemH / 2, gemW, gemH * 0.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // the gem itself
  ctx.save();
  ctx.globalAlpha = base;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const key = frostGrid[row][col];
      if (key === ".") continue;
      ctx.fillStyle = frostColors[key];
      ctx.fillRect(x + col * blockW, y + row * blockH, Math.ceil(blockW) + 1, Math.ceil(blockH) + 1);
    }
  }
  ctx.restore();

  // sparkle dots near the top-left facet, only on a fresh chip
  if (!used) {
    const twinkle = 0.5 + 0.5 * Math.sin(Date.now() / 250 + boxX);
    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.globalAlpha = twinkle;
    ctx.fillRect(x + blockW * 1.3, y + blockH * 1.1, 2, 2);
    ctx.globalAlpha = twinkle * 0.6;
    ctx.fillRect(x - 1, y + blockH * 0.7, 2, 2);
    ctx.restore();
  }
}

// --- spikes: bright metal teeth so they read clearly against the dark stone ---
export function drawSpikes(ctx, x, y, w, h) {
  const spikeW = 12;
  for (let sx = x; sx + spikeW <= x + w + 0.5; sx += spikeW) {
    const tipX = sx + spikeW / 2;
    // light metal tooth, bright enough to stand out
    ctx.fillStyle = "#9a9aa6";
    ctx.beginPath();
    ctx.moveTo(sx, y + h);
    ctx.lineTo(tipX, y);
    ctx.lineTo(sx + spikeW, y + h);
    ctx.closePath();
    ctx.fill();
    // darker right face for a bit of shape
    ctx.fillStyle = "#565662";
    ctx.beginPath();
    ctx.moveTo(tipX, y);
    ctx.lineTo(sx + spikeW, y + h);
    ctx.lineTo(tipX, y + h);
    ctx.closePath();
    ctx.fill();
    // glowing hot point
    ctx.fillStyle = "#ffcf6a";
    ctx.fillRect(tipX - 1, y, 3, 5);
  }
}

// --- forge beast, the enemy: dark horned body, glowing red eyes and mouth ---
const enemyGrid = [
  "..O....O..", // horns
  ".OO....OO.",
  ".OOOOOOOO.", // head
  "OOEEOOEEOO", // eyes
  "OOOOOOOOOO",
  "OHHOOOOHHO", // hot cracks on the sides
  ".OMMMMMMO.", // burning mouth
  ".O.O..O.O.", // legs
];

const enemyColors = {
  O: "#1c1420", // near-black body
  E: "#ff3b1f", // red glowing eyes
  H: "#ff6b35", // hot cracks
  M: "#ff8c2a", // burning mouth
};

export function drawEnemy(ctx, x, y, w, h, tick) {
  const rows = enemyGrid.length;
  const cols = enemyGrid[0].length;

  // small walking bob
  y += Math.floor(tick / 8) % 2 === 0 ? 0 : -1;
  const blockW = w / cols;
  const blockH = h / rows;

  // menacing red glow behind it
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = "#ff3b1f";
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h / 2, w * 0.7, h * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const key = enemyGrid[row][col];
      if (key === ".") continue;
      ctx.fillStyle = enemyColors[key];
      ctx.fillRect(x + col * blockW, y + row * blockH, Math.ceil(blockW) + 1, Math.ceil(blockH) + 1);
    }
  }
}

// --- environment tiles, each baked once from pixel data into a small reusable canvas ---

function makeTile(grid, colors, blockSize = 8) {
  const size = grid.length * blockSize;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext("2d");

  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      g.fillStyle = colors[grid[row][col]];
      g.fillRect(col * blockSize, row * blockSize, blockSize, blockSize);
    }
  }
  return canvas;
}

// stone platform, b base, m mortar, e single lit ember pixel
export const stoneTile = makeTile(
  ["bebb", "mbbm", "bbmb", "mbbb"],
  { b: "#3a3a42", m: "#232328", e: "#ff8c42" }
);

// --- cave background: dark rock with a warm forge glow, kept simple ---

// a row of jagged rock teeth along an edge (stalactites or stalagmites)
function caveEdge(ctx, width, edgeY, dir, color, spacing, maxLen, offset) {
  ctx.fillStyle = color;
  ctx.beginPath();
  const anchor = edgeY - dir * 8; // just off screen past the edge
  ctx.moveTo(-spacing, anchor);
  let i = 0;
  for (let x = -spacing; x - offset <= width + spacing; x += spacing) {
    const len = maxLen * (0.4 + 0.6 * Math.abs(Math.sin(i * 1.3)));
    const px = x - offset;
    ctx.lineTo(px, edgeY + dir * len); // tip of the tooth
    ctx.lineTo(px + spacing / 2, edgeY); // back to the edge
    i++;
  }
  ctx.lineTo(width + spacing, anchor);
  ctx.closePath();
  ctx.fill();
}

export function drawBackground(ctx, width, height, cameraX) {
  // deep cave, a little warmth pooling toward the bottom
  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, "#140b11");
  bg.addColorStop(0.6, "#1c1016");
  bg.addColorStop(1, "#2e161a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // soft forge glow rising from below
  const glow = ctx.createRadialGradient(width / 2, height, 0, width / 2, height, width * 0.6);
  glow.addColorStop(0, "rgba(255, 100, 50, 0.18)");
  glow.addColorStop(1, "rgba(255, 100, 50, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  // rock layers, the far one lighter and slower for a bit of depth
  const near = cameraX * 0.25;
  const far = cameraX * 0.12;
  caveEdge(ctx, width, 0, 1, "#1a0f15", 130, 55, far);      // far stalactites
  caveEdge(ctx, width, height, -1, "#1a0f15", 150, 60, far); // far stalagmites
  caveEdge(ctx, width, 0, 1, "#0e070b", 90, 45, near);       // near stalactites
  caveEdge(ctx, width, height, -1, "#0e070b", 100, 50, near); // near stalagmites
}

// --- motion trail, fading puffs streaming behind Ember while he moves ---

export function drawTrail(ctx, x, y, w, h, velocityX) {
  if (Math.abs(velocityX) < 1) return; // only while actually moving

  const dir = velocityX > 0 ? -1 : 1; // trail streams opposite to travel
  const cx = x + w / 2;
  const cy = y + h / 2;

  // each puff sits further back, smaller and fainter than the last
  const puffs = [
    { dist: 10, rx: 12, ry: 16, alpha: 0.45 },
    { dist: 20, rx: 9, ry: 13, alpha: 0.28 },
    { dist: 30, rx: 6, ry: 10, alpha: 0.14 },
  ];

  ctx.save();
  ctx.fillStyle = "#ff6b35";
  for (const p of puffs) {
    ctx.globalAlpha = p.alpha;
    ctx.beginPath();
    ctx.ellipse(cx + dir * p.dist, cy, p.rx, p.ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
