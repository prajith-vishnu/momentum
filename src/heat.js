// the heat system, Momentum's core twist.
// heats up on its own, faster with momentum, and the whole thing ramps up
// the deeper into a run you get (easy to start, harder over time).

export const MAX_HEAT = 100;

const HEAT_BASE = 0.08;  // heat per frame with no momentum
const HEAT_EXTRA = 0.14; // extra per frame at full momentum

export function updateHeat(player, momentumRatio, difficulty) {
  // heat only ever climbs until a chip resets it
  player.heat += (HEAT_BASE + momentumRatio * HEAT_EXTRA) * difficulty;
  player.heat = Math.min(MAX_HEAT, player.heat);
}
