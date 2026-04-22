// ═══════════════════════════════════════════════════════════════
// TwitchDancefloor - Overlay Main Loop v2
// TRANSPARENT background, audio command from admin
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

  // Audio commands from admin panel
  OverlaySocket.on('audio-command', (data) => {
    if (data.source === 'mic') AudioAnalyzer.connectMic();
    else if (data.source === 'desktop') AudioAnalyzer.connectDesktop();
    if (data.sensitivity !== undefined) AudioAnalyzer.setSensitivity(data.sensitivity);
  });

  // ── Audio Controls (on overlay page too, for direct control) ──
  const audioSource = document.getElementById('audio-source');
  const btnConnect = document.getElementById('btn-connect-audio');
  const fileInput = document.getElementById('audio-file-input');
  const beatDot = document.getElementById('beat-dot');
  const sensSlider = document.getElementById('sensitivity');

  if (btnConnect) {
    btnConnect.addEventListener('click', () => {
      const src = audioSource ? audioSource.value : 'none';
      if (src === 'mic') AudioAnalyzer.connectMic();
      else if (src === 'desktop') AudioAnalyzer.connectDesktop();
      else if (src === 'file') fileInput.click();
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      if (e.target.files[0]) AudioAnalyzer.connectFile(e.target.files[0]);
    });
  }

  if (sensSlider) {
    sensSlider.addEventListener('input', (e) => {
      AudioAnalyzer.setSensitivity(parseFloat(e.target.value));
    });
  }

  // ── Main Render Loop ──
  let lastAudioSend = 0;

  function render() {
    const t = (performance.now() - startTime) / 1000;
    const audio = AudioAnalyzer.getData();

    // Update beat indicator
    if (beatDot) beatDot.classList.toggle('active', audio.beat);

    // Clear canvas - fully transparent for OBS
    ctx.clearRect(0, 0, W, H);

    // Render all effects
    EffectsRenderer.render(ctx, effects, audio, t);

    // Render dancers (sides only!)
    const dancerEffect = effects.find(e => e.id === 'dancers');
    if (dancerEffect) {
      DancersRenderer.render(ctx, dancerEffect, audio, t);
    }

    // Send audio data to server for admin meters
    if (Date.now() - lastAudioSend > 40) { // 25fps for admin updates
      lastAudioSend = Date.now();
      OverlaySocket.emit('audio-data', {
        bass: audio.bass, mid: audio.mid, high: audio.high,
        volume: audio.volume, beat: audio.beat, bpm: audio.bpm
      });
    }

    requestAnimationFrame(render);
  }

  render();
})();
