// the heat system, Momentum's core twist.
// the robot heats up on its own, and the faster its momentum the faster it cooks.

export const MAX_HEAT = 100;

const HEAT_BASE = 0.1;   // heat per frame with no momentum
const HEAT_EXTRA = 0.22; // extra heat per frame at full momentum

export function updateHeat(player, momentumRatio) {
  // heat only ever climbs, until a chip resets it. faster momentum, faster heat.
  player.heat += HEAT_BASE + momentumRatio * HEAT_EXTRA;
  player.heat = Math.min(MAX_HEAT, player.heat);
}
