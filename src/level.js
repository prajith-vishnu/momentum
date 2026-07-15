// the level layout, each platform is just a solid rectangle
export const platforms = [
  { x: 0, y: 410, width: 250, height: 40 },    // starting ground on the left
  { x: 330, y: 320, width: 140, height: 20 },  // middle step
  { x: 560, y: 240, width: 160, height: 20 },  // higher ledge
  { x: 800, y: 320, width: 160, height: 20 },  // drop back down
  { x: 1040, y: 380, width: 200, height: 40 }, // long low stretch
  { x: 1320, y: 300, width: 180, height: 20 }, // final ledge with the goal
];

// where the level ends, sits on top of the last platform
export const goal = { x: 1400, y: 250, width: 40, height: 50 };
