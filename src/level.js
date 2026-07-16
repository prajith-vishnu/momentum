// endless level. platforms are generated on the fly as the robot runs right.

const GAP_MIN = 80;
const GAP_MAX = 120;
const STEP = 55; // most a platform's height can change from the one before it
const MIN_Y = 250;
const MAX_Y = 410;
const WIDTH_MIN = 130;
const WIDTH_MAX = 240;

// the wide platform the robot starts on
export function firstPlatform() {
  return { x: 0, y: 410, width: 320, height: 40 };
}

// build the next platform just right of the previous one, always within jump range
export function nextPlatform(prev) {
  const gap = GAP_MIN + Math.random() * (GAP_MAX - GAP_MIN);
  const x = prev.x + prev.width + gap;

  let y = prev.y + (Math.random() * 2 - 1) * STEP;
  y = Math.max(MIN_Y, Math.min(MAX_Y, y));

  const width = WIDTH_MIN + Math.random() * (WIDTH_MAX - WIDTH_MIN);
  return { x, y, width, height: 20 };
}
