// the heat system, Momentum's core twist.
// moving fast builds heat up, slowing down cools it back off.

export const MAX_HEAT = 100;

const HEAT_THRESHOLD = 2; // moving faster than this counts as "going fast"
const HEAT_GAIN = 0.8;    // added each frame while fast
const HEAT_LOSS = 0.5;    // drained each frame while slow or still

export function updateHeat(player) {
  // only speed matters here, not direction
  const speed = Math.abs(player.velocityX);

  if (speed > HEAT_THRESHOLD) {
    player.heat += HEAT_GAIN;
  } else {
    player.heat -= HEAT_LOSS;
  }

  // keep heat pinned inside 0..MAX_HEAT
  player.heat = Math.max(0, Math.min(MAX_HEAT, player.heat));
}
