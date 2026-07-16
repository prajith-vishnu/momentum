// all sound is synthesized with the Web Audio API, no audio files needed.

let ctx = null;

// browsers block audio until a user gesture, so kick this off on the first key press
export function initAudio() {
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      ctx = null;
    }
  }
  if (ctx && ctx.state === "suspended") ctx.resume();
}

// one tone with a quick volume fade, optionally sliding in pitch
function tone(freq, duration, type, peak, freqEnd) {
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, now + duration);

  gain.gain.setValueAtTime(peak, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration);
}

// quick rising blip
export function playJump() {
  tone(320, 0.14, "square", 0.14, 640);
}

// bright two-note chime for grabbing a chip
export function playChip() {
  tone(880, 0.1, "triangle", 0.2);
  setTimeout(() => tone(1320, 0.18, "triangle", 0.18), 60);
}

// low downward thud for stomping an enemy
export function playStomp() {
  tone(200, 0.14, "square", 0.25, 70);
}

// harsh descending buzz on death
export function playHurt() {
  tone(300, 0.45, "sawtooth", 0.22, 55);
}
