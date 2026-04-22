// ═══════════════════════════════════════════════════════════════
// TwitchDancefloor - Audio Analyzer (Improved)
// Reliable beat detection + frequency analysis
// ═══════════════════════════════════════════════════════════════

const AudioAnalyzer = (() => {
  let audioCtx = null;
  let analyser = null;
  let source = null;
  let dataArray = null;
  let timeDomainArray = null;
  let sensitivity = 1.8;

  // Beat detection state
  let bassHistory = new Float32Array(60); // ~1 second of bass values
  let bassHistoryIdx = 0;
  let bassHistoryFilled = false;
  let lastBeatTime = 0;
  let beatCooldown = 180; // ms between beats
  let prevBass = 0;
  let beatDecay = 0;

  // Smoothed values
  let smoothBass = 0, smoothMid = 0, smoothHigh = 0, smoothVol = 0;

  function init() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.75;
    dataArray = new Uint8Array(analyser.frequencyBinCount);
    timeDomainArray = new Uint8Array(analyser.frequencyBinCount);
  }

  function disconnectSource() {
    if (source) {
      try { source.disconnect(); } catch (e) {}
      source = null;
    }
  }

  async function connectMic() {
    try {
      init();
      if (audioCtx.state === 'suspended') await audioCtx.resume();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      disconnectSource();
      source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      console.log('[Audio] Microphone connected');
      return true;
    } catch (e) { console.error('[Audio] Mic error:', e.message); return false; }
  }

  async function connectDesktop() {
    try {
      init();
      if (audioCtx.state === 'suspended') await audioCtx.resume();
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: { width: 1, height: 1 }, audio: true });
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        console.warn('[Audio] No audio track in desktop capture - user may have unchecked "Share audio"');
        return false;
      }
      disconnectSource();
      source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      console.log('[Audio] Desktop audio connected');
      return true;
    } catch (e) { console.error('[Audio] Desktop error:', e.message); return false; }
  }

  function connectFile(file) {
    try {
      init();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const url = URL.createObjectURL(file);
      const audio = new Audio(url);
      audio.crossOrigin = 'anonymous';
      audio.loop = true;
      audio.volume = 1.0;
      const sourceNode = audioCtx.createMediaElementSource(audio);
      disconnectSource();
      source = sourceNode;
      source.connect(analyser);
      analyser.connect(audioCtx.destination);
      audio.play();
      console.log('[Audio] File playback started:', file.name);
      return true;
    } catch (e) { console.error('[Audio] File error:', e.message); return false; }
  }

  function getData() {
    if (!analyser || !dataArray) {
      return { bass: 0, mid: 0, high: 0, volume: 0, beat: false, frequencies: new Uint8Array(0) };
    }

    analyser.getByteFrequencyData(dataArray);
    analyser.getByteTimeDomainData(timeDomainArray);

    const len = dataArray.length;
    const sampleRate = audioCtx.sampleRate;
    const binHz = sampleRate / analyser.fftSize;

    // ── Frequency bands ──
    const bassEnd = Math.min(Math.floor(250 / binHz), len);
    const midEnd = Math.min(Math.floor(4000 / binHz), len);

    let bassSum = 0, midSum = 0, highSum = 0, totalSum = 0;
    for (let i = 0; i < len; i++) {
      const val = dataArray[i] / 255;
      totalSum += val;
      if (i < bassEnd) bassSum += val;
      else if (i < midEnd) midSum += val;
      else highSum += val;
    }

    const rawBass = (bassSum / Math.max(bassEnd, 1)) * sensitivity;
    const rawMid = (midSum / Math.max(midEnd - bassEnd, 1)) * sensitivity;
    const rawHigh = (highSum / Math.max(len - midEnd, 1)) * sensitivity;
    const rawVol = (totalSum / len) * sensitivity;

    // Smooth
    smoothBass = smoothBass * 0.7 + rawBass * 0.3;
    smoothMid = smoothMid * 0.7 + rawMid * 0.3;
    smoothHigh = smoothHigh * 0.7 + rawHigh * 0.3;
    smoothVol = smoothVol * 0.7 + rawVol * 0.3;

    // ── Beat detection ──
    // Track running average of bass
    bassHistory[bassHistoryIdx] = smoothBass;
    bassHistoryIdx = (bassHistoryIdx + 1) % bassHistory.length;
    if (bassHistoryIdx === 0) bassHistoryFilled = true;

    const historyLen = bassHistoryFilled ? bassHistory.length : bassHistoryIdx;
    let bassAvg = 0;
    for (let i = 0; i < historyLen; i++) bassAvg += bassHistory[i];
    bassAvg /= Math.max(historyLen, 1);

    // Beat = current bass significantly above average + rising + cooldown elapsed
    const now = performance.now();
    const isBeat = (
      smoothBass > bassAvg * 1.35 &&
      smoothBass > 0.25 &&
      smoothBass > prevBass * 0.95 && // bass is rising or sustained
      now - lastBeatTime > beatCooldown
    );

    if (isBeat) {
      lastBeatTime = now;
      beatDecay = 1.0;
    }

    beatDecay *= 0.92;
    prevBass = smoothBass;

    return {
      bass: Math.min(smoothBass, 1),
      mid: Math.min(smoothMid, 1),
      high: Math.min(smoothHigh, 1),
      volume: Math.min(smoothVol, 1),
      beat: isBeat,
      beatPulse: beatDecay, // decaying pulse for visual effects
      frequencies: dataArray,
    };
  }

  function isConnected() {
    return analyser !== null;
  }

  return {
    connectMic, connectDesktop, connectFile, getData,
    setSensitivity: (s) => { sensitivity = s; },
    isConnected,
  };
})();
