// ═══════════════════════════════════════════════════════════════
// TwitchDancefloor - Overlay Main Loop v6
// TRANSPARENT background, receives audio data from admin via server
// FRAME RATE LIMITED to 30fps - prevents GPU overload in OBS
// ═══════════════════════════════════════════════════════════════
(function () {
  const canvas = document.getElementById('overlay');
  const ctx = canvas.getContext('2d');
  const W = 1920, H = 1080;
  let effects = [];
  let startTime = performance.now();
  let connected = false;

  // Frame rate limiter - 30fps max (saves GPU, OBS doesn't need more)
  const TARGET_FPS = 30;
  const FRAME_INTERVAL = 1000 / TARGET_FPS;
  let lastFrameTime = 0;

  // Default audio data (when no admin is connected)
  let currentAudio = {
    bass: 0, mid: 0, high: 0, volume: 0,
    beat: false, beatPulse: 0, bpm: 120,
    eqBands: new Array(64).fill(0)
  };

  // ── Connect WebSocket ──
  OverlaySocket.connect();

  OverlaySocket.on('connected', (state) => {
    connected = state;
    const dot = document.getElementById('status-dot');
    if (dot) dot.classList.toggle('connected', state);
  });

  OverlaySocket.on('effects-state', (data) => { effects = data; });
  OverlaySocket.on('effect-update', (data) => {
    const idx = effects.findIndex(e => e.id === data.id);
    if (idx !== -1) effects[idx] = data;
    else effects.push(data);
  });

  // ── Receive audio data from admin (via server) ──
  OverlaySocket.on('audio-data', (data) => {
    currentAudio = data;
    if (!currentAudio.eqBands) currentAudio.eqBands = new Array(64).fill(0);
  });

  // ── Main Render Loop with FPS cap ──
  function render(timestamp) {
    requestAnimationFrame(render);

    // Throttle to target FPS
    const elapsed = timestamp - lastFrameTime;
    if (elapsed < FRAME_INTERVAL) return;
    lastFrameTime = timestamp - (elapsed % FRAME_INTERVAL);

    const t = (performance.now() - startTime) / 1000;

    // Apply local beatPulse decay between server updates
    if (!currentAudio.beat) {
      currentAudio.beatPulse *= 0.88;
    }

    // Clear canvas - fully transparent for OBS
    ctx.clearRect(0, 0, W, H);

    // Render all effects
    EffectsRenderer.render(ctx, effects, currentAudio, t);

    // Render dancers (sides only!)
    const dancerEffect = effects.find(e => e.id === 'dancers');
    if (dancerEffect) {
      DancersRenderer.render(ctx, dancerEffect, currentAudio, t);
    }
  }

  requestAnimationFrame(render);
})();
