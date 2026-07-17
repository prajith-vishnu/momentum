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
  if (!ctx || freq <= 0) return;
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

// --- background music: a low driving bassline and a sparse high lead, looped ---

let musicTimer = null;
let musicStep = 0;

const bassSeq = [55.0, 55.0, 65.41, 55.0, 73.42, 55.0, 65.41, 49.0];
const leadSeq = [0, 440.0, 0, 523.25, 0, 659.25, 0, 523.25];

export function startMusic() {
  if (!ctx || musicTimer) return;
  musicStep = 0;
  musicTimer = setInterval(() => {
    tone(bassSeq[musicStep % bassSeq.length], 0.2, "triangle", 0.09);
    tone(leadSeq[musicStep % leadSeq.length], 0.14, "square", 0.04);
    musicStep += 1;
  }, 200);
}

export function stopMusic() {
  if (musicTimer) {
    clearInterval(musicTimer);
    musicTimer = null;
  }
}
