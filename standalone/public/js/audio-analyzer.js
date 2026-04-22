// ═══════════════════════════════════════════════════════════════
// TwitchDancefloor - Audio Analyzer v3
// BPM-aware beat detection + reliable frequency analysis
// ═══════════════════════════════════════════════════════════════

const AudioAnalyzer = (() => {
  let audioCtx = null;
  let analyser = null;
  let source = null;
  let dataArray = null;
  let timeDomainArray = null;
  let sensitivity = 2.0;

  // Beat detection with BPM tracking
  let bassHistory = new Float32Array(80); // ~1.3 seconds of bass
  let bassHistoryIdx = 0;
  let bassHistoryFilled = false;
  let lastBeatTime = 0;
  let beatDecay = 0;
  let prevBass = 0;
  let prevPrevBass = 0;

  // BPM estimation
  let beatTimes = []; // timestamps of recent beats
  let estimatedBPM = 120;
  let beatInterval = 500; // ms between beats at estimated BPM

  // Smoothed values
  let smoothBass = 0, smoothMid = 0, smoothHigh = 0, smoothVol = 0;

  function init() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 4096; // Higher resolution for better frequency analysis
    analyser.smoothingTimeConstant = 0.7;
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
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
      });
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
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: 1, height: 1, frameRate: 1 },
        audio: true
      });
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        console.warn('[Audio] No audio in desktop capture - did you check "Share audio"?');
        return false;
      }
      disconnectSource();
      source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      console.log('[Audio] Desktop audio connected:', audioTracks[0].label);
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
      return { bass: 0, mid: 0, high: 0, volume: 0, beat: false, beatPulse: 0, bpm: 120, frequencies: new Uint8Array(0) };
    }

    analyser.getByteFrequencyData(dataArray);

    const len = dataArray.length;
    const sampleRate = audioCtx.sampleRate;
    const binHz = sampleRate / analyser.fftSize;

    // ── Frequency bands ──
    const bassEnd = Math.min(Math.floor(200 / binHz), len);    // Focus on sub-bass + bass
    const midEnd = Math.min(Math.floor(3000 / binHz), len);
    const highEnd = Math.min(Math.floor(12000 / binHz), len);

    let bassSum = 0, midSum = 0, highSum = 0, totalSum = 0;
    for (let i = 0; i < len; i++) {
      const val = dataArray[i] / 255;
      totalSum += val;
      if (i < bassEnd) bassSum += val;
      else if (i < midEnd) midSum += val;
      else if (i < highEnd) highSum += val;
    }

    // Weight bass more heavily for beat detection
    const rawBass = (bassSum / Math.max(bassEnd, 1)) * sensitivity * 1.3;
    const rawMid = (midSum / Math.max(midEnd - bassEnd, 1)) * sensitivity;
    const rawHigh = (highSum / Math.max(highEnd - midEnd, 1)) * sensitivity;
    const rawVol = (totalSum / len) * sensitivity;

    // Smooth with faster response for bass (for beat detection)
    smoothBass = smoothBass * 0.55 + rawBass * 0.45;
    smoothMid = smoothMid * 0.65 + rawMid * 0.35;
    smoothHigh = smoothHigh * 0.65 + rawHigh * 0.35;
    smoothVol = smoothVol * 0.65 + rawVol * 0.35;

    // ── Beat Detection with BPM awareness ──
    // Track running average
    bassHistory[bassHistoryIdx] = smoothBass;
    bassHistoryIdx = (bassHistoryIdx + 1) % bassHistory.length;
    if (bassHistoryIdx === 0) bassHistoryFilled = true;

    const historyLen = bassHistoryFilled ? bassHistory.length : bassHistoryIdx;
    let bassAvg = 0;
    for (let i = 0; i < historyLen; i++) bassAvg += bassHistory[i];
    bassAvg /= Math.max(historyLen, 1);

    // Beat detection: bass peak above threshold + rising
    const now = performance.now();
    
    // Use BPM to set minimum beat interval (don't detect beats faster than the music)
    const minBeatInterval = Math.max(150, (60000 / estimatedBPM) * 0.5);
    
    const isRising = smoothBass > prevBass;
    const isPeak = smoothBass > bassAvg * 1.3 && smoothBass > 0.2;
    const isAbovePrev = smoothBass >= prevPrevBass * 0.9;
    
    const isBeat = (
      isPeak &&
      (isRising || isAbovePrev) &&
      now - lastBeatTime > minBeatInterval
    );

    if (isBeat) {
      lastBeatTime = now;
      beatDecay = 1.0;
      
      // Track beat times for BPM estimation
      beatTimes.push(now);
      if (beatTimes.length > 16) beatTimes.shift();
      
      // Estimate BPM from recent beats
      if (beatTimes.length >= 4) {
        const recentBeats = beatTimes.slice(-8);
        let intervals = [];
        for (let i = 1; i < recentBeats.length; i++) {
          const interval = recentBeats[i] - recentBeats[i-1];
          if (interval > 200 && interval < 2000) intervals.push(interval);
        }
        if (intervals.length >= 2) {
          const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
          const newBPM = Math.round(60000 / avgInterval);
          // Sanity check BPM range
          if (newBPM >= 60 && newBPM <= 200) {
            estimatedBPM = estimatedBPM * 0.7 + newBPM * 0.3; // Smooth BPM changes
            beatInterval = 60000 / estimatedBPM;
          }
        }
      }
    }

    beatDecay *= 0.88; // Faster decay for punchy feel
    prevPrevBass = prevBass;
    prevBass = smoothBass;

    return {
      bass: Math.min(smoothBass, 1),
      mid: Math.min(smoothMid, 1),
      high: Math.min(smoothHigh, 1),
      volume: Math.min(smoothVol, 1),
      beat: isBeat,
      beatPulse: beatDecay,
      bpm: Math.round(estimatedBPM),
      frequencies: dataArray,
    };
  }

  function isConnected() { return analyser !== null; }

  return {
    connectMic, connectDesktop, connectFile, getData,
    setSensitivity: (s) => { sensitivity = s; },
    isConnected,
  };
})();
