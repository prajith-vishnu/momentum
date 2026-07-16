// the heat system, Momentum's core twist.
// the robot heats up on its own over time. checkpoints are the only thing that cool it.

export const MAX_HEAT = 100;

const HEAT_RATE = 0.2; // heat added every frame, no matter what the player does

export function updateHeat(player) {
  // heat only ever climbs now, until a checkpoint or a respawn resets it
  player.heat += HEAT_RATE;
  player.heat = Math.min(MAX_HEAT, player.heat);
}
