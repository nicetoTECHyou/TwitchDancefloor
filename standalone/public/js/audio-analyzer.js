// ═══════════════════════════════════════════════════════════════
// TwitchDancefloor - Audio Analyzer v4
// Device enumeration + BPM-aware beat detection + 64-band EQ
// Designed to run in ADMIN page, sends data to overlay via server
// ═══════════════════════════════════════════════════════════════

const AudioAnalyzer = (() => {
  let audioCtx = null;
  let analyser = null;
  let source = null;
  let currentStream = null;
  let dataArray = null;
  let timeDomainArray = null;
  let sensitivity = 2.0;
  let currentSourceName = 'Keine';

  // Beat detection with BPM tracking
  let bassHistory = new Float32Array(80);
  let bassHistoryIdx = 0;
  let bassHistoryFilled = false;
  let lastBeatTime = 0;
  let beatDecay = 0;
  let prevBass = 0;
  let prevPrevBass = 0;

  // BPM estimation
  let beatTimes = [];
  let estimatedBPM = 120;
  let beatInterval = 500;

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
    analyser.smoothingTimeConstant = 0.7;
    dataArray = new Uint8Array(analyser.frequencyBinCount);
    timeDomainArray = new Uint8Array(analyser.frequencyBinCount);
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
      // Request temporary permission to get device labels
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
          // Request higher quality
          sampleRate: 48000,
          channelCount: 2
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      disconnectSource();
      currentStream = stream;
      source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      // Do NOT connect to destination - no feedback!
      currentSourceName = deviceName || 'Audio-Gerät';
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
      currentStream = stream;
      source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      currentSourceName = 'Mikrofon';
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
        // Stop video track since we have no audio
        stream.getVideoTracks().forEach(t => t.stop());
        console.warn('[Audio] No audio in desktop capture - did you check "Share audio"?');
        currentSourceName = 'Fehler: Kein Desktop-Audio';
        return false;
      }
      // Stop video track - we only need audio
      stream.getVideoTracks().forEach(t => t.stop());

      disconnectSource();
      currentStream = stream;
      source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      currentSourceName = 'Desktop Audio';
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
      source = sourceNode;
      source.connect(analyser);
      analyser.connect(audioCtx.destination); // Play file audio
      audio.play();
      currentSourceName = 'Datei: ' + file.name;
      console.log('[Audio] File playback started:', file.name);
      return true;
    } catch (e) { console.error('[Audio] File error:', e.message); return false; }
  }

  // ── Disconnect everything ──
  function disconnect() {
    disconnectSource();
    currentSourceName = 'Keine';
    console.log('[Audio] Disconnected');
  }

  // ── Get current source name ──
  function getSourceName() { return currentSourceName; }

  // ── Main analysis function ──
  function getData() {
    if (!analyser || !dataArray) {
      return {
        bass: 0, mid: 0, high: 0, volume: 0,
        beat: false, beatPulse: 0, bpm: 120,
        eqBands: new Array(EQ_BANDS).fill(0),
        sourceName: currentSourceName
      };
    }

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

    // ── 64-band Equalizer ──
    for (let i = 0; i < EQ_BANDS; i++) {
      // Use logarithmic frequency mapping for better visual representation
      const t = i / EQ_BANDS;
      // Map to frequency range 40Hz - 16kHz (logarithmic)
      const freq = 40 * Math.pow(400, t); // 40Hz to ~16000Hz
      const freqIdx = Math.min(Math.floor(freq / binHz), len - 1);
      const raw = (dataArray[freqIdx] || 0) / 255;
      eqSmooth[i] += (raw - eqSmooth[i]) * 0.35;
      eqBands[i] = eqSmooth[i];
    }

    // ── Beat Detection with BPM awareness ──
    bassHistory[bassHistoryIdx] = smoothBass;
    bassHistoryIdx = (bassHistoryIdx + 1) % bassHistory.length;
    if (bassHistoryIdx === 0) bassHistoryFilled = true;

    const historyLen = bassHistoryFilled ? bassHistory.length : bassHistoryIdx;
    let bassAvg = 0;
    for (let i = 0; i < historyLen; i++) bassAvg += bassHistory[i];
    bassAvg /= Math.max(historyLen, 1);

    const now = performance.now();
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

      beatTimes.push(now);
      if (beatTimes.length > 16) beatTimes.shift();

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
          if (newBPM >= 60 && newBPM <= 200) {
            estimatedBPM = estimatedBPM * 0.7 + newBPM * 0.3;
            beatInterval = 60000 / estimatedBPM;
          }
        }
      }
    }

    beatDecay *= 0.88;
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
      eqBands: Array.from(eqBands),
      sourceName: currentSourceName
    };
  }

  function isConnected() { return analyser !== null && source !== null; }

  return {
    connectMic, connectDesktop, connectFile, connectDevice,
    disconnect, getDeviceList, getData, getSourceName,
    setSensitivity: (s) => { sensitivity = s; },
    isConnected,
    EQ_BANDS
  };
})();
