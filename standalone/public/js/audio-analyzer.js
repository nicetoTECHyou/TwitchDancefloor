// ═══════════════════════════════════════════════════════════════
// TwitchDancefloor - Audio Analyzer v7
// FIXED: Internal analysis loop at exactly 30fps
// getData() is now a PURE READ - no side effects!
// Previous bug: getData() called from 2 places (25fps + 60fps)
// = combined ~85fps = broken beat detection + wrong BPM
// ═══════════════════════════════════════════════════════════════

const AudioAnalyzer = (() => {
  let audioCtx = null;
  let analyser = null;
  let source = null;
  let currentStream = null;
  let dataArray = null;
  let sensitivity = 1.0;  // Lowered default - was 1.2, still too hot
  let currentSourceName = 'Keine';

  // ── Analysis loop (internal, fixed 30fps) ──
  let analysisTimer = null;
  const ANALYSIS_FPS = 30;
  const ANALYSIS_INTERVAL = Math.round(1000 / ANALYSIS_FPS);

  // Cached result - getData() just returns this, NO side effects
  let cachedData = {
    bass: 0, mid: 0, high: 0, volume: 0,
    beat: false, beatPulse: 0, bpm: 120,
    eqBands: new Array(64).fill(0),
    sourceName: 'Keine'
  };

  // ── Beat detection state ──
  const BASS_HISTORY_SIZE = 43; // ~1.43 seconds at 30fps
  let bassHistory = new Float32Array(BASS_HISTORY_SIZE);
  let bassHistoryIdx = 0;
  let bassHistoryFilled = false;
  let lastBeatTime = 0;
  let beatDecay = 0;
  let prevBass = 0;

  // BPM estimation
  let beatTimes = [];
  let estimatedBPM = 120;

  // Smoothed values
  let smoothBass = 0, smoothMid = 0, smoothHigh = 0, smoothVol = 0;

  // 64-band equalizer
  const EQ_BANDS = 64;
  const eqSmooth = new Float32Array(EQ_BANDS);
  const eqBands = new Float32Array(EQ_BANDS);

  // ── Initialization ──
  function init() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 4096;
    analyser.smoothingTimeConstant = 0.75;  // Slightly more smoothing for stability
    dataArray = new Uint8Array(analyser.frequencyBinCount);
  }

  // ── Start internal analysis loop ──
  function startAnalysis() {
    if (analysisTimer) return; // Already running
    console.log('[Audio] Starting analysis at', ANALYSIS_FPS, 'fps');
    analysisTimer = setInterval(analyze, ANALYSIS_INTERVAL);
  }

  // ── Stop internal analysis loop ──
  function stopAnalysis() {
    if (analysisTimer) {
      clearInterval(analysisTimer);
      analysisTimer = null;
    }
    // Reset beat detection state
    beatDecay = 0;
    prevBass = 0;
    smoothBass = 0; smoothMid = 0; smoothHigh = 0; smoothVol = 0;
    bassHistory = new Float32Array(BASS_HISTORY_SIZE);
    bassHistoryIdx = 0;
    bassHistoryFilled = false;
    beatTimes = [];
    lastBeatTime = 0;
    eqSmooth.fill(0);
    eqBands.fill(0);
    cachedData = {
      bass: 0, mid: 0, high: 0, volume: 0,
      beat: false, beatPulse: 0, bpm: 120,
      eqBands: new Array(64).fill(0),
      sourceName: currentSourceName
    };
    console.log('[Audio] Analysis stopped');
  }

  // ── Source management ──
  function disconnectSource() {
    if (source) {
      try { source.disconnect(); } catch (e) {}
      source = null;
    }
    if (currentStream) {
      currentStream.getTracks().forEach(t => t.stop());
      currentStream = null;
    }
  }

  // ── Enumerate all audio input devices ──
  async function getDeviceList() {
    try {
      const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      tempStream.getTracks().forEach(t => t.stop());
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices
        .filter(d => d.kind === 'audioinput')
        .map(d => ({
          id: d.deviceId,
          name: d.label || `Audio-Gerät (${d.deviceId.slice(0, 8)}...)`,
          kind: d.kind
        }));
      console.log('[Audio] Found', audioInputs.length, 'audio input devices');
      return audioInputs;
    } catch (e) {
      console.error('[Audio] Enumerate error:', e.message);
      return [];
    }
  }

  // ── Connect to specific device by ID ──
  async function connectDevice(deviceId, deviceName) {
    try {
      init();
      if (audioCtx.state === 'suspended') await audioCtx.resume();
      const constraints = {
        audio: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 48000,
          channelCount: 2
        }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      disconnectSource();
      stopAnalysis();
      currentStream = stream;
      source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      currentSourceName = deviceName || 'Audio-Gerät';
      startAnalysis();
      console.log('[Audio] Device connected:', currentSourceName);
      return true;
    } catch (e) {
      console.error('[Audio] Device connect error:', e.message);
      return false;
    }
  }

  // ── Connect microphone (default) ──
  async function connectMic() {
    try {
      init();
      if (audioCtx.state === 'suspended') await audioCtx.resume();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
      });
      disconnectSource();
      stopAnalysis();
      currentStream = stream;
      source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      currentSourceName = 'Mikrofon';
      startAnalysis();
      console.log('[Audio] Microphone connected');
      return true;
    } catch (e) { console.error('[Audio] Mic error:', e.message); return false; }
  }

  // ── Connect desktop audio (screen share) ──
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
        stream.getVideoTracks().forEach(t => t.stop());
        console.warn('[Audio] No audio in desktop capture - did you check "Share audio"?');
        currentSourceName = 'Fehler: Kein Desktop-Audio';
        return false;
      }
      stream.getVideoTracks().forEach(t => t.stop());
      disconnectSource();
      stopAnalysis();
      currentStream = stream;
      source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      currentSourceName = 'Desktop Audio';
      startAnalysis();
      console.log('[Audio] Desktop audio connected:', audioTracks[0].label);
      return true;
    } catch (e) {
      console.error('[Audio] Desktop error:', e.message);
      currentSourceName = 'Fehler: ' + e.message;
      return false;
    }
  }

  // ── Connect audio file ──
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
      stopAnalysis();
      source = sourceNode;
      source.connect(analyser);
      analyser.connect(audioCtx.destination);
      audio.play();
      currentSourceName = 'Datei: ' + file.name;
      startAnalysis();
      console.log('[Audio] File playback started:', file.name);
      return true;
    } catch (e) { console.error('[Audio] File error:', e.message); return false; }
  }

  // ── Disconnect everything ──
  function disconnect() {
    stopAnalysis();
    disconnectSource();
    currentSourceName = 'Keine';
    console.log('[Audio] Disconnected');
  }

  // ── Get current source name ──
  function getSourceName() { return currentSourceName; }

  // ═══════════════════════════════════════════════════════════════
  // INTERNAL ANALYSIS - Runs at exactly 30fps, updates cachedData
  // This is the ONLY place where audio state is modified
  // ═══════════════════════════════════════════════════════════════
  function analyze() {
    if (!analyser || !dataArray) return;

    analyser.getByteFrequencyData(dataArray);

    const len = dataArray.length;
    const sampleRate = audioCtx.sampleRate;
    const binHz = sampleRate / analyser.fftSize;

    // ── Frequency bands ──
    const bassEnd = Math.min(Math.floor(200 / binHz), len);
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

    // Moderate weighting
    const rawBass = (bassSum / Math.max(bassEnd, 1)) * sensitivity * 1.0;
    const rawMid = (midSum / Math.max(midEnd - bassEnd, 1)) * sensitivity * 0.8;
    const rawHigh = (highSum / Math.max(highEnd - midEnd, 1)) * sensitivity * 0.7;
    const rawVol = (totalSum / len) * sensitivity * 0.8;

    // Smoothing - tuned for 30fps analysis rate
    smoothBass = smoothBass * 0.6 + rawBass * 0.4;
    smoothMid = smoothMid * 0.65 + rawMid * 0.35;
    smoothHigh = smoothHigh * 0.65 + rawHigh * 0.35;
    smoothVol = smoothVol * 0.65 + rawVol * 0.35;

    // ── 64-band Equalizer ──
    for (let i = 0; i < EQ_BANDS; i++) {
      const t = i / EQ_BANDS;
      const freq = 40 * Math.pow(400, t);
      const freqIdx = Math.min(Math.floor(freq / binHz), len - 1);
      const raw = (dataArray[freqIdx] || 0) / 255;
      eqSmooth[i] += (raw - eqSmooth[i]) * 0.35;
      eqBands[i] = eqSmooth[i];
    }

    // ═══════════════════════════════════════════════════════════════
    // BEAT DETECTION - Now runs at exactly 30fps (was broken before!)
    // ═══════════════════════════════════════════════════════════════
    bassHistory[bassHistoryIdx] = smoothBass;
    bassHistoryIdx = (bassHistoryIdx + 1) % bassHistory.length;
    if (bassHistoryIdx === 0) bassHistoryFilled = true;

    // Calculate average bass from history
    const historyLen = bassHistoryFilled ? bassHistory.length : bassHistoryIdx;
    let bassAvg = 0;
    for (let i = 0; i < historyLen; i++) bassAvg += bassHistory[i];
    bassAvg /= Math.max(historyLen, 1);

    const now = performance.now();

    // Minimum beat interval based on BPM
    // At 128 BPM: interval = 469ms, minInterval = 469 * 0.65 = 305ms
    // This prevents detecting on half-beats (eighth notes)
    const beatInterval = 60000 / Math.max(estimatedBPM, 60);
    const minBeatInterval = Math.max(280, beatInterval * 0.65);

    // Beat detection conditions
    const isAboveAverage = smoothBass > bassAvg * 1.4;
    const isAboveMinimum = smoothBass > 0.3;
    const isRising = smoothBass > prevBass;
    const hasCooldownElapsed = (now - lastBeatTime) > minBeatInterval;

    const isBeat = isAboveAverage && isAboveMinimum && isRising && hasCooldownElapsed;

    if (isBeat) {
      lastBeatTime = now;
      beatDecay = 1.0;

      // BPM estimation
      beatTimes.push(now);
      if (beatTimes.length > 16) beatTimes.shift();

      if (beatTimes.length >= 4) {
        const recentBeats = beatTimes.slice(-10);
        let intervals = [];
        for (let i = 1; i < recentBeats.length; i++) {
          const interval = recentBeats[i] - recentBeats[i-1];
          // Only consider intervals that represent reasonable BPM (50-220)
          if (interval > 270 && interval < 1200) intervals.push(interval);
        }
        if (intervals.length >= 2) {
          // Use MEDIAN instead of average - more robust against outliers
          intervals.sort((a, b) => a - b);
          const medianInterval = intervals[Math.floor(intervals.length / 2)];
          const newBPM = Math.round(60000 / medianInterval);
          if (newBPM >= 50 && newBPM <= 220) {
            // Smooth BPM changes - don't jump wildly
            estimatedBPM = estimatedBPM * 0.75 + newBPM * 0.25;
          }
        }
      }
    }

    // Beat pulse decay - tuned for 30fps
    // At 30fps: after 100ms (3 frames), decay = 0.82^3 = 0.55 (still visible)
    // At 30fps: after 200ms (6 frames), decay = 0.82^6 = 0.30 (fading)
    // At 30fps: after 333ms (10 frames), decay = 0.82^10 = 0.14 (mostly gone)
    beatDecay *= 0.82;
    prevBass = smoothBass;

    // Update cached data
    cachedData = {
      bass: Math.min(smoothBass, 1),
      mid: Math.min(smoothMid, 1),
      high: Math.min(smoothHigh, 1),
      volume: Math.min(smoothVol, 1),
      beat: isBeat,
      beatPulse: beatDecay,
      bpm: Math.round(estimatedBPM),
      eqBands: Array.from(eqBands),
      sourceName: currentSourceName
    };
  }

  // ── PUBLIC: Get data - PURE READ, no side effects! ──
  function getData() { return cachedData; }

  function isConnected() { return analyser !== null && source !== null; }

  return {
    connectMic, connectDesktop, connectFile, connectDevice,
    disconnect, getDeviceList, getData, getSourceName,
    setSensitivity: (s) => { sensitivity = s; },
    isConnected, startAnalysis, stopAnalysis,
    EQ_BANDS
  };
})();
