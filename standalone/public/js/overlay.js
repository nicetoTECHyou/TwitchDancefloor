// ═══════════════════════════════════════════════════════════════
// TwitchDancefloor - Overlay Main Loop
// TRANSPARENT background for OBS layering
// ═══════════════════════════════════════════════════════════════
(function () {
  const canvas = document.getElementById('overlay');
  const ctx = canvas.getContext('2d');
  const W = 1920, H = 1080;
  let effects = [];
  let startTime = performance.now();
  let connected = false;

  // Connect WebSocket
  OverlaySocket.connect();

  OverlaySocket.on('connected', (state) => {
    connected = state;
    document.getElementById('status-dot').classList.toggle('connected', state);
  });

  OverlaySocket.on('effects-state', (data) => { effects = data; });
  OverlaySocket.on('effect-update', (data) => {
    const idx = effects.findIndex(e => e.id === data.id);
    if (idx !== -1) effects[idx] = data;
    else effects.push(data);
  });

  // ── Audio Controls ──
  const audioSource = document.getElementById('audio-source');
  const btnConnect = document.getElementById('btn-connect-audio');
  const fileInput = document.getElementById('audio-file-input');
  const beatDot = document.getElementById('beat-dot');
  const sensSlider = document.getElementById('sensitivity');

  btnConnect.addEventListener('click', () => {
    const src = audioSource.value;
    if (src === 'mic') AudioAnalyzer.connectMic();
    else if (src === 'desktop') AudioAnalyzer.connectDesktop();
    else if (src === 'file') fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files[0]) AudioAnalyzer.connectFile(e.target.files[0]);
  });

  sensSlider.addEventListener('input', (e) => {
    AudioAnalyzer.setSensitivity(parseFloat(e.target.value));
  });

  // ── Main Render Loop ──
  let lastAudioSend = 0;

  function render() {
    const t = (performance.now() - startTime) / 1000;
    const audio = AudioAnalyzer.getData();

    // Update beat indicator
    if (beatDot) beatDot.classList.toggle('active', audio.beat);

    // Clear canvas - fully transparent for OBS
    ctx.clearRect(0, 0, W, H);

    // Render all effects on transparent canvas
    EffectsRenderer.render(ctx, effects, audio, t);

    // Render dancers (sides only!)
    const dancerEffect = effects.find(e => e.id === 'dancers');
    if (dancerEffect) {
      DancersRenderer.render(ctx, dancerEffect, audio, t);
    }

    // Send audio data to server for admin meters
    if (Date.now() - lastAudioSend > 50) {
      lastAudioSend = Date.now();
      OverlaySocket.emit('audio-data', {
        bass: audio.bass, mid: audio.mid, high: audio.high,
        volume: audio.volume, beat: audio.beat
      });
    }

    requestAnimationFrame(render);
  }

  render();
})();
