// the level layout, each platform is just a solid rectangle
export const platforms = [
  { x: 0, y: 410, width: 300, height: 40 },    // starting ground
  { x: 380, y: 350, width: 160, height: 20 },
  { x: 620, y: 290, width: 160, height: 20 },
  { x: 860, y: 350, width: 160, height: 20 },
  { x: 1100, y: 410, width: 200, height: 40 },  // checkpoint 1 sits here
  { x: 1380, y: 340, width: 160, height: 20 },
  { x: 1620, y: 280, width: 160, height: 20 },
  { x: 1860, y: 340, width: 160, height: 20 },
  { x: 2100, y: 400, width: 200, height: 40 },
  { x: 2380, y: 330, width: 160, height: 20 },
  { x: 2620, y: 280, width: 150, height: 20 },  // checkpoint 2 sits here
  { x: 2850, y: 350, width: 160, height: 20 },
  { x: 3090, y: 410, width: 200, height: 40 },
  { x: 3370, y: 340, width: 160, height: 20 },
  { x: 3610, y: 280, width: 160, height: 20 },
  { x: 3850, y: 350, width: 160, height: 20 },
  { x: 4090, y: 410, width: 220, height: 40 },  // checkpoint 3 sits here
  { x: 4390, y: 340, width: 160, height: 20 },
  { x: 4630, y: 280, width: 160, height: 20 },
  { x: 4870, y: 350, width: 160, height: 20 },
  { x: 5110, y: 410, width: 200, height: 40 },
  { x: 5390, y: 340, width: 160, height: 20 },
  { x: 5630, y: 280, width: 150, height: 20 },  // checkpoint 4 sits here
  { x: 5860, y: 350, width: 160, height: 20 },
  { x: 6100, y: 400, width: 200, height: 40 },
  { x: 6380, y: 330, width: 180, height: 20 },
  { x: 6640, y: 300, width: 260, height: 40 },  // final platform with the goal
];

// where the level ends, sits on top of the last platform
export const goal = { x: 6760, y: 250, width: 40, height: 50 };

// cooling checkpoints, spaced far apart so you just barely reach each in time.
// activated flips to true once used so it doesn't re-trigger every frame.
export const checkpoints = [
  { x: 1180, y: 370, width: 20, height: 40, activated: false },
  { x: 2680, y: 240, width: 20, height: 40, activated: false },
  { x: 4180, y: 370, width: 20, height: 40, activated: false },
  { x: 5690, y: 240, width: 20, height: 40, activated: false },
];
