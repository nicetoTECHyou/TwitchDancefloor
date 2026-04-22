// ═══════════════════════════════════════════════════════════════
// TwitchDancefloor - Audio Analyzer
// ═══════════════════════════════════════════════════════════════
const AudioAnalyzer = (() => {
  let audioCtx = null;
  let analyser = null;
  let source = null;
  let dataArray = null;
  let smoothing = 0.8;
  let bassAvg = 0, midAvg = 0, highAvg = 0, volAvg = 0;
  let prevBass = 0;
  let sensitivity = 1.5;

  function init() {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = smoothing;
    dataArray = new Uint8Array(analyser.frequencyBinCount);
  }

  async function connectMic() {
    try {
      if (!audioCtx) init();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (source) source.disconnect();
      source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      return true;
    } catch (e) { console.error('[Audio] Mic error:', e); return false; }
  }

  async function connectDesktop() {
    try {
      if (!audioCtx) init();
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      if (source) source.disconnect();
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) { console.warn('[Audio] No audio track in desktop capture'); return false; }
      source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      return true;
    } catch (e) { console.error('[Audio] Desktop error:', e); return false; }
  }

  function connectFile(file) {
    if (!audioCtx) init();
    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    audio.crossOrigin = 'anonymous';
    audio.loop = true;
    const sourceNode = audioCtx.createMediaElementSource(audio);
    if (source) source.disconnect();
    source = sourceNode;
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
    audio.play();
    return true;
  }

  function getData() {
    if (!analyser) return { bass: 0, mid: 0, high: 0, volume: 0, beat: false, frequencies: new Uint8Array(0) };

    analyser.getByteFrequencyData(dataArray);
    const len = dataArray.length;
    const sampleRate = audioCtx.sampleRate;
    const binSize = sampleRate / (analyser.fftSize);

    // Bass: 20-250Hz
    const bassEnd = Math.min(Math.floor(250 / binSize), len);
    let bassSum = 0;
    for (let i = 0; i < bassEnd; i++) bassSum += dataArray[i];
    const bass = (bassSum / (bassEnd || 1)) / 255 * sensitivity;

    // Mid: 250-4000Hz
    const midEnd = Math.min(Math.floor(4000 / binSize), len);
    let midSum = 0;
    for (let i = bassEnd; i < midEnd; i++) midSum += dataArray[i];
    const mid = (midSum / ((midEnd - bassEnd) || 1)) / 255 * sensitivity;

    // High: 4000Hz+
    let highSum = 0;
    for (let i = midEnd; i < len; i++) highSum += dataArray[i];
    const high = (highSum / ((len - midEnd) || 1)) / 255 * sensitivity;

    // Overall volume
    let volSum = 0;
    for (let i = 0; i < len; i++) volSum += dataArray[i];
    const volume = (volSum / len) / 255 * sensitivity;

    // Beat detection
    const beat = bass > bassAvg * 1.4 && bass > 0.3;

    // Smooth
    bassAvg = bassAvg * 0.92 + bass * 0.08;
    midAvg = midAvg * 0.92 + mid * 0.08;
    highAvg = highAvg * 0.92 + high * 0.08;
    volAvg = volAvg * 0.92 + volume * 0.08;
    prevBass = bass;

    return { bass: Math.min(bass, 1), mid: Math.min(mid, 1), high: Math.min(high, 1), volume: Math.min(volume, 1), beat, frequencies: dataArray };
  }

  return { connectMic, connectDesktop, connectFile, getData, setSensitivity: (s) => { sensitivity = s; } };
})();
