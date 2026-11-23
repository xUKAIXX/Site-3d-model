// A small original underwater beat. No audio starts until the visitor opts in.
export function soundtrack() {
  let context, master, compressor, hiss;
  let timer = 0, next = 0, step = 0;
  const interval = 60 / 81 / 4;

  function tone(type, frequency, time, duration, level, dest = compressor) {
    const osc = context.createOscillator();
    const envelope = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, time);
    envelope.gain.setValueAtTime(.0001, time);
    envelope.gain.exponentialRampToValueAtTime(level, time + Math.min(.034, duration * .16));
    envelope.gain.exponentialRampToValueAtTime(.0001, time + duration);
    osc.connect(envelope).connect(dest);
    osc.start(time);
    osc.stop(time + duration + .01);
    return osc;
  }

  function noise(time, duration, level, frequency, type = 'highpass') {
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const envelope = context.createGain();
    source.buffer = hiss;
    filter.type = type;
    filter.frequency.value = frequency;
    envelope.gain.setValueAtTime(level, time);
    envelope.gain.exponentialRampToValueAtTime(.0001, time + duration);
    source.connect(filter).connect(envelope).connect(compressor);
    source.start(time);
    source.stop(time + duration + .01);
  }

  function tick() {
    while (next < context.currentTime + .14) {
      const beat = step % 16, measure = (step >> 4) % 4;
      if ([0,6,11,14].includes(beat)) {
        const bass = [50, 44.54, 47.19, 37.47][measure];
        const kick = tone('sine', bass * 2.72, next, beat === 0 ? .66 : .37, beat === 0 ? .64 : .43);
        kick.frequency.exponentialRampToValueAtTime(bass, next + .075);
      }
      if (beat === 8) {
        noise(next,.18,.14,1460,'bandpass');
        const snare = tone('triangle', 176, next, .13, .058);
        snare.frequency.exponentialRampToValueAtTime(110, next + .11);
      }
      if (beat % 2 === 0 || [7,13,15].includes(beat)) noise(next,.069,beat % 4 === 0 ? .066 : .035,6600);
      if (beat === 0 || beat === 9) {
        const chords = [[196,233.08,293.66],[174.61,220,261.63],[185,233.08,277.18],[164.81,220,261.63]];
        for (const [i,hz] of chords[measure].entries()) {
          const filter = context.createBiquadFilter();
          filter.type = 'lowpass'; filter.frequency.value = 590 + i * 101;
          filter.connect(compressor);
          const synth = tone('triangle',hz * (beat === 9 ? 2 : 1), next + i * .062, 1.05 - i*.13, beat === 0 ? .048 : .026, filter);
          synth.addEventListener('ended', () => filter.disconnect(), { once: true });
        }
      }
      next += interval;
      step++;
    }
  }

  async function start() {
    if (!context) {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) throw new Error('Web Audio is not available');
      context = new Audio();
      compressor = context.createDynamicsCompressor();
      master = context.createGain();
      master.gain.value = 0;
      compressor.connect(master).connect(context.destination);
      hiss = context.createBuffer(1, Math.floor(context.sampleRate * .25), context.sampleRate);
      const samples = hiss.getChannelData(0);
      for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
    }
    await context.resume();
    if (timer) return;
    next = context.currentTime + .04;
    step = 0;
    master.gain.setTargetAtTime(.28, context.currentTime, .08);
    tick();
    timer = window.setInterval(tick, 55);
  }

  function stop() {
    clearInterval(timer);
    timer = 0;
    master?.gain.setTargetAtTime(.0001, context.currentTime, .04);
  }

  return { start, stop };
}
