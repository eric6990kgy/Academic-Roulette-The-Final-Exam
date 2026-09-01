
// Advanced Web Audio API Synthesizer & Sequencer

const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
let bgmGain: GainNode | null = null;
let currentBgmType: 'none' | 'menu' | 'game' = 'none';

// Sequencer State
let isPlaying = false;
let nextNoteTime = 0.0;
let beatIndex = 0;
let timerID: number | null = null;
let activeOscillators: AudioNode[] = []; // For menu drone

type SoundType = 'shoot_live' | 'shoot_blank' | 'reload' | 'item' | 'win' | 'loss' | 'bgm_menu' | 'bgm_game' | 'bgm_stop';

// --- Synthesis Helpers ---

// Kick Drum (Punchy)
const playKick = (time: number) => {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(bgmGain || audioCtx.destination);

  osc.frequency.setValueAtTime(150, time);
  osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);

  gain.gain.setValueAtTime(0.8, time);
  gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);

  osc.start(time);
  osc.stop(time + 0.5);
};

// Hi-Hat (Crisp Noise)
const playHat = (time: number, open: boolean = false) => {
  const bufferSize = audioCtx.sampleRate * (open ? 0.3 : 0.05);
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;

  const filter = audioCtx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 7000;

  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(open ? 0.2 : 0.1, time);
  gain.gain.exponentialRampToValueAtTime(0.01, time + (open ? 0.2 : 0.05));

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(bgmGain || audioCtx.destination);

  noise.start(time);
};

// Clap / Snare
const playClap = (time: number) => {
  const bufferSize = audioCtx.sampleRate * 0.2;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);

  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;

  const filter = audioCtx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1200;
  filter.Q.value = 1;

  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.3, time);
  gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(bgmGain || audioCtx.destination);
  noise.start(time);
};

// Bass (Rolling Sawtooth)
const playBass = (time: number, freq: number) => {
  const osc = audioCtx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(freq, time);

  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(100, time);
  filter.frequency.exponentialRampToValueAtTime(600, time + 0.05);
  filter.frequency.exponentialRampToValueAtTime(100, time + 0.2);

  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.4, time);
  gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(bgmGain || audioCtx.destination);

  osc.start(time);
  osc.stop(time + 0.3);
};

// --- Scheduler ---
const BPM = 128;
const SECONDS_PER_BEAT = 60.0 / BPM;
const SCHEDULE_AHEAD_TIME = 0.1;

const scheduleNote = (beatNumber: number, time: number) => {
  // 4/4 House/Techno Pattern
  
  // Kick: Every beat (0, 1, 2, 3)
  playKick(time);

  // Bass: Off-beat (and between)
  playBass(time + SECONDS_PER_BEAT * 0.5, 55); // A1
  
  // Clap: Beats 2 and 4 (index 1 and 3)
  if (beatNumber % 4 === 1 || beatNumber % 4 === 3) {
    playClap(time);
  }

  // Hi-Hat: Every 8th note, emphasized on off-beat
  playHat(time + SECONDS_PER_BEAT * 0.5, true); // Open hat on offbeat
  playHat(time, false); // Closed hat on beat
};

const scheduler = () => {
  if (!isPlaying) return;

  while (nextNoteTime < audioCtx.currentTime + SCHEDULE_AHEAD_TIME) {
    scheduleNote(beatIndex, nextNoteTime);
    nextNoteTime += SECONDS_PER_BEAT;
    beatIndex = (beatIndex + 1) % 16; // 4 bars loop
  }
  timerID = window.setTimeout(scheduler, 25);
};

// --- Main Export ---

export const playSound = (type: SoundType) => {
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  const stopBGM = () => {
    isPlaying = false;
    if (timerID !== null) {
      clearTimeout(timerID);
      timerID = null;
    }
    
    // Fade out current gain
    if (bgmGain) {
      const g = bgmGain;
      g.gain.cancelScheduledValues(audioCtx.currentTime);
      g.gain.setValueAtTime(g.gain.value, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
      setTimeout(() => g.disconnect(), 500);
      bgmGain = null;
    }

    // Stop active drones
    activeOscillators.forEach(n => {
      try { (n as any).stop(); } catch(e){}
      n.disconnect();
    });
    activeOscillators = [];
    currentBgmType = 'none';
  };

  switch (type) {
    case 'shoot_live': // DAMAGE - Heavy Impact
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      
      // Punchy Sine drop
      osc.frequency.setValueAtTime(200, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.2);
      
      // Add Noise for "Hit" texture
      const bSize = audioCtx.sampleRate * 0.2;
      const b = audioCtx.createBuffer(1, bSize, audioCtx.sampleRate);
      const d = b.getChannelData(0);
      for(let i=0;i<bSize;i++) d[i] = Math.random()*2-1;
      const n = audioCtx.createBufferSource();
      n.buffer = b;
      const ng = audioCtx.createGain();
      
      g.gain.setValueAtTime(0.8, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      ng.gain.setValueAtTime(0.6, audioCtx.currentTime);
      ng.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);

      osc.connect(g); g.connect(audioCtx.destination);
      n.connect(ng); ng.connect(audioCtx.destination);
      
      osc.start(); osc.stop(audioCtx.currentTime + 0.3);
      n.start();
      break;
    
    case 'shoot_blank': // SAFE - Light Paper/Ding
      const click = audioCtx.createOscillator();
      const cg = audioCtx.createGain();
      click.type = 'triangle';
      click.frequency.setValueAtTime(1200, audioCtx.currentTime);
      click.frequency.exponentialRampToValueAtTime(1800, audioCtx.currentTime + 0.1);
      
      cg.gain.setValueAtTime(0.1, audioCtx.currentTime);
      cg.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      
      click.connect(cg); cg.connect(audioCtx.destination);
      click.start(); click.stop(audioCtx.currentTime + 0.1);
      break;

    case 'reload':
      const nr = audioCtx.createBufferSource();
      const br = audioCtx.createBuffer(1, audioCtx.sampleRate*0.5, audioCtx.sampleRate);
      const dr = br.getChannelData(0);
      for(let i=0;i<dr.length;i++) dr[i] = Math.random()*2-1;
      nr.buffer = br;
      const ngr = audioCtx.createGain();
      ngr.gain.setValueAtTime(0.2, audioCtx.currentTime);
      ngr.gain.linearRampToValueAtTime(0, audioCtx.currentTime+0.5);
      nr.connect(ngr); ngr.connect(audioCtx.destination);
      nr.start();
      break;

    case 'item':
      const iOsc = audioCtx.createOscillator();
      const ig = audioCtx.createGain();
      iOsc.type = 'sine';
      iOsc.frequency.setValueAtTime(440, audioCtx.currentTime);
      iOsc.frequency.linearRampToValueAtTime(880, audioCtx.currentTime + 0.1);
      iOsc.frequency.linearRampToValueAtTime(1760, audioCtx.currentTime + 0.2);
      
      ig.gain.setValueAtTime(0.05, audioCtx.currentTime);
      ig.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.1);
      ig.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      
      iOsc.connect(ig); ig.connect(audioCtx.destination);
      iOsc.start(); iOsc.stop(audioCtx.currentTime + 0.3);
      break;

    case 'win':
      const wOsc = audioCtx.createOscillator();
      const wGain = audioCtx.createGain();
      wOsc.frequency.setValueAtTime(440, audioCtx.currentTime);
      wOsc.frequency.linearRampToValueAtTime(880, audioCtx.currentTime + 0.2);
      wGain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1);
      wOsc.connect(wGain); wGain.connect(audioCtx.destination);
      wOsc.start(); wOsc.stop(audioCtx.currentTime + 1);
      break;
    
    case 'loss':
       const lOsc = audioCtx.createOscillator();
       const lGain = audioCtx.createGain();
       lOsc.type = 'sawtooth';
       lOsc.frequency.setValueAtTime(100, audioCtx.currentTime);
       lOsc.frequency.linearRampToValueAtTime(50, audioCtx.currentTime + 1);
       lGain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1);
       lOsc.connect(lGain); lGain.connect(audioCtx.destination);
       lOsc.start(); lOsc.stop(audioCtx.currentTime + 1);
       break;

    case 'bgm_menu':
      if (currentBgmType === 'menu') return;
      stopBGM();
      currentBgmType = 'menu';
      bgmGain = audioCtx.createGain();
      bgmGain.gain.value = 0.15;
      bgmGain.connect(audioCtx.destination);

      // Dark Industrial Ambience
      const mOsc1 = audioCtx.createOscillator();
      mOsc1.type = 'sawtooth';
      mOsc1.frequency.value = 50;
      const mFilter = audioCtx.createBiquadFilter();
      mFilter.type = 'lowpass';
      mFilter.frequency.value = 150;
      
      // LFO for filter
      const lfo = audioCtx.createOscillator();
      lfo.frequency.value = 0.1;
      const lfoGain = audioCtx.createGain();
      lfoGain.gain.value = 50;
      lfo.connect(lfoGain);
      lfoGain.connect(mFilter.frequency);

      mOsc1.connect(mFilter);
      mFilter.connect(bgmGain);
      mOsc1.start();
      lfo.start();
      activeOscillators.push(mOsc1, lfo);
      break;

    case 'bgm_game':
      if (currentBgmType === 'game') return;
      stopBGM();
      currentBgmType = 'game';
      
      bgmGain = audioCtx.createGain();
      bgmGain.gain.value = 0.25; // Slightly lower BGM so SFX pops
      bgmGain.connect(audioCtx.destination);

      isPlaying = true;
      beatIndex = 0;
      nextNoteTime = audioCtx.currentTime + 0.1;
      scheduler();
      break;

    case 'bgm_stop':
      stopBGM();
      break;
  }
};