// the heat system, Momentum's core twist.
// moving fast builds heat up, slowing down cools it back off.

export const MAX_HEAT = 100;

const HEAT_THRESHOLD = 2; // moving faster than this counts as "going fast"
const HEAT_GAIN = 0.4;    // added each frame while fast
const HEAT_LOSS = 0.5;    // drained each frame while slow or still

const OVERHEAT_RESET = 40;  // heat drains down to this before control comes back
const OVERHEAT_COOL = 0.7;  // how fast heat bleeds off during the lockout

export function updateHeat(player) {
  // while overheated, bleed heat down smoothly and stay locked out until it's cooled
  if (player.isOverheated) {
    player.heat -= OVERHEAT_COOL;
    if (player.heat <= OVERHEAT_RESET) {
      player.heat = OVERHEAT_RESET;
      player.isOverheated = false; // cooled down, back in control
    }
    return;
  }

  // only speed matters here, not direction
  const speed = Math.abs(player.velocityX);

  if (speed > HEAT_THRESHOLD) {
    player.heat += HEAT_GAIN;
  } else {
    player.heat -= HEAT_LOSS;
  }

  // keep heat pinned inside 0..MAX_HEAT
  player.heat = Math.max(0, Math.min(MAX_HEAT, player.heat));

  // tipped over the top, lose control until it cools back down
  if (player.heat >= MAX_HEAT) {
    player.isOverheated = true;
  }
}
