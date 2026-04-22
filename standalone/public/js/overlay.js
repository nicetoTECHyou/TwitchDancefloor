// ═══════════════════════════════════════════════════════════════
// TwitchDancefloor - Overlay Main Loop
// ═══════════════════════════════════════════════════════════════
(function () {
  const canvas = document.getElementById('overlay');
  const ctx = canvas.getContext('2d');
  const W = 1920, H = 1080;
  let bgImage = null;
  let effects = [];
  let startTime = performance.now();
  let connected = false;

  // Load background image
  const img = new Image();
  img.onload = () => { bgImage = img; };
  img.src = '/assets/background.png';

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

    // Clear
    ctx.clearRect(0, 0, W, H);

    // Background
    if (bgImage) {
      ctx.drawImage(bgImage, 0, 0, W, H);
    } else {
      ctx.fillStyle = '#0a0a12';
      ctx.fillRect(0, 0, W, H);
    }

    // Subtle vignette always
    const vigGrad = ctx.createRadialGradient(W / 2, H / 2, W * 0.3, W / 2, H / 2, W * 0.7);
    vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
    vigGrad.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, W, H);

    // Render effects
    EffectsRenderer.render(ctx, effects, audio, t);

    // Render dancers
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
