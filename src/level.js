// biomes the run cycles through, each with its own palette, so a long run
// reads like a descent deeper into the forge.
export const BIOME_LENGTH = 3500; // distance before the next biome

export const BIOMES = [
  {
    name: "COOL CAVERN",
    skyTop: "#0d0e16", skyMid: "#151420", skyBottom: "#201d2a",
    glowColor: "120, 110, 180", glowAlpha: 0.12,
    rockFar: "#1a1622", rockNear: "#0d0a12",
  },
  {
    name: "MAGMA CORE",
    skyTop: "#1a0808", skyMid: "#4a0f0c", skyBottom: "#8a2410",
    glowColor: "255, 90, 30", glowAlpha: 0.28,
    rockFar: "#3a0e10", rockNear: "#1a0608",
  },
  {
    name: "ASH FIELDS",
    skyTop: "#14110e", skyMid: "#221d17", skyBottom: "#33291f",
    glowColor: "180, 140, 90", glowAlpha: 0.13,
    rockFar: "#241d16", rockNear: "#12100b",
  },
  {
    name: "EMBER DEPTHS",
    skyTop: "#12060a", skyMid: "#2e0a12", skyBottom: "#52101a",
    glowColor: "255, 60, 40", glowAlpha: 0.2,
    rockFar: "#2a0a12", rockNear: "#12060a",
  },
];

// endless level built from sections: forward stretches, climbs up to a higher
// floor, and drops down to a lower one, picked at random so runs never repeat.

const GAP_MIN = 80;
const GAP_MAX = 120;
const WIDTH_MIN = 220;
const WIDTH_MAX = 420;
const FLOOR_Y = 410; // lowest a platform sits, the ground floor
const CEIL_Y = 120;  // highest a platform sits, the top floor

let mode = "forward";
let modeLeft = 0;
let baseY = FLOOR_Y; // the height the current section is building around

// the wide platform the robot starts on, also resets the generator for a new run
export function firstPlatform() {
  baseY = FLOOR_Y;
  mode = "forward";
  modeLeft = 4;
  return { x: 0, y: FLOOR_Y, width: 320, height: 40 };
}

function pickMode() {
  const canUp = baseY > CEIL_Y + 60;
  const canDown = baseY < FLOOR_Y - 60;

  // forward is listed twice so it stays the most common section
  const options = ["forward", "forward"];
  if (canUp) options.push("up");
  if (canDown) options.push("down");

  mode = options[Math.floor(Math.random() * options.length)];
  modeLeft = mode === "forward"
    ? 3 + Math.floor(Math.random() * 4)  // 3 to 6 flat platforms
    : 3 + Math.floor(Math.random() * 3); // 3 to 5 climbing or dropping platforms
}

// build the next platform just right of (and up or down from) the previous one
export function nextPlatform(prev) {
  if (modeLeft <= 0) pickMode();
  modeLeft -= 1;

  let gap;
  let width;
  if (mode === "up") {
    gap = 50 + Math.random() * 30;      // tighter gaps while climbing
    baseY -= 60 + Math.random() * 25;   // rise 60 to 85 per step
    width = 200 + Math.random() * 120;  // wide so top speed doesn't overshoot
  } else if (mode === "down") {
    gap = 70 + Math.random() * 40;
    baseY += 60 + Math.random() * 40;   // drop 60 to 100 per step
    width = 220 + Math.random() * 160;
  } else {
    gap = GAP_MIN + Math.random() * (GAP_MAX - GAP_MIN);
    baseY += (Math.random() * 2 - 1) * 18; // gentle jitter on flat runs
    width = WIDTH_MIN + Math.random() * (WIDTH_MAX - WIDTH_MIN);
  }

  baseY = Math.max(CEIL_Y, Math.min(FLOOR_Y, baseY));

  const x = prev.x + prev.width + gap;
  return { x, y: baseY, width, height: 20 };
}
