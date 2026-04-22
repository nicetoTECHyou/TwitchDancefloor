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

  // Audio controls
  const audioSource = document.getElementById('audio-source');
  const btnConnect = document.getElementById('btn-connect-audio');
  const fileInput = document.getElementById('audio-file-input');

  btnConnect.addEventListener('click', () => {
    const src = audioSource.value;
    if (src === 'mic') AudioAnalyzer.connectMic();
    else if (src === 'desktop') AudioAnalyzer.connectDesktop();
    else if (src === 'file') fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files[0]) AudioAnalyzer.connectFile(e.target.files[0]);
  });

  // Main render loop
  let lastAudioSend = 0;

  function render() {
    const t = (performance.now() - startTime) / 1000;
    const audio = AudioAnalyzer.getData();

    // Clear canvas fully transparent - no background, no vignette
    // This allows the OBS video/content behind the overlay to show through
    ctx.clearRect(0, 0, W, H);

    // Render all effects on transparent canvas
    EffectsRenderer.render(ctx, effects, audio, t);

    // Render dancers (sides only, never center)
    const dancerEffect = effects.find(e => e.id === 'dancers');
    if (dancerEffect) {
      DancersRenderer.render(ctx, dancerEffect, audio, t);
    }

    // Send audio data to server periodically
    if (Date.now() - lastAudioSend > 50) {
      lastAudioSend = Date.now();
      OverlaySocket.emit('audio-data', { bass: audio.bass, mid: audio.mid, high: audio.high, volume: audio.volume });
    }

    requestAnimationFrame(render);
  }

  render();
})();
