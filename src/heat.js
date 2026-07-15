// the heat system, Momentum's core twist.
// moving fast builds heat up, slowing down cools it back off.

export const MAX_HEAT = 100;

const HEAT_THRESHOLD = 2; // moving faster than this counts as "going fast"
const HEAT_GAIN = 0.8;    // added each frame while fast
const HEAT_LOSS = 0.5;    // drained each frame while slow or still

const OVERHEAT_DURATION = 90; // frames the player stays locked out (~1.5s)
const OVERHEAT_RESET = 40;    // heat drops to this once the lockout ends

export function updateHeat(player) {
  // while overheated we just run the lockout timer, no heat changes
  if (player.isOverheated) {
    player.overheatTimer += 1;
    if (player.overheatTimer >= OVERHEAT_DURATION) {
      player.isOverheated = false;
      player.overheatTimer = 0;
      player.heat = OVERHEAT_RESET; // cooled partway down, back in control
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

  // tipped over the top, lose control for a bit
  if (player.heat >= MAX_HEAT) {
    player.isOverheated = true;
    player.overheatTimer = 0;
  }
}
