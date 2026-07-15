// Ember, drawn straight from pixel data so no image files are needed.
// legend: . clear  O outline  H helmet  V visor  B body  A accent  C core  L legs  S boot
const emberGrid = [
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
  ".OBB..BBO.",
  ".OLL..LLO.",
  ".OLL..LLO.",
  ".OLL..LLO.",
  ".OSS..SSO.",
  "..OO..OO..",
];

// colors pulled from the design doc. only the visor and core change when overheated.
const baseColors = {
  O: "#16161c", // outline
  H: "#2c2c38", // helmet
  B: "#23232c", // suit
  A: "#ff6b35", // chest stripe
  L: "#1b1b22", // legs
  S: "#ff6b35", // boots
};

const normalColors = { ...baseColors, V: "#ffb347", C: "#ffd27a" };
const overheatColors = { ...baseColors, V: "#ff3b1f", C: "#ffe08a" };

export function drawEmber(ctx, x, y, w, h, overheated) {
  const rows = emberGrid.length;
  const cols = emberGrid[0].length;
  const blockW = w / cols;
  const blockH = h / rows;

  // soft danger halo behind Ember while overheated
  if (overheated) {
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = "#ff6b35";
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2, w, h, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const colors = overheated ? overheatColors : normalColors;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const key = emberGrid[row][col];
      if (key === ".") continue;

      ctx.fillStyle = colors[key];
      // ceil + 1 so the blocks tile together with no gaps at fractional sizes
      ctx.fillRect(x + col * blockW, y + row * blockH, Math.ceil(blockW) + 1, Math.ceil(blockH) + 1);
    }
  }
}
