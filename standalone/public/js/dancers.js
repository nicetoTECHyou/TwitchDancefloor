// ═══════════════════════════════════════════════════════════════
// TwitchDancefloor - Sprite-based Dancing Party People
// ⚠️ SIDES ONLY - NEVER in the center area!
// ═══════════════════════════════════════════════════════════════

const DancersRenderer = (() => {
  const W = 1920, H = 1080;
  // CRITICAL: Center zone 400-1520 is the safe zone - NO dancers there!
  const LEFT_X  = [60, 170, 280];
  const RIGHT_X = [1640, 1750, 1860];

  // Sprite configuration - each dancer has 3 frames
  const spriteConfigs = [
    { name: 'Dude 1', frames: ['dancer1_frame1.png','dancer1_frame2.png','dancer1_frame3.png'], side: 'left', slot: 0, scale: 0.35, phaseOffset: 0 },
    { name: 'Girl 1', frames: ['dancer2_frame1.png','dancer2_frame2.png','dancer2_frame3.png'], side: 'left', slot: 1, scale: 0.30, phaseOffset: 1.2 },
    { name: 'DJ',     frames: ['dancer3_frame1.png','dancer3_frame2.png','dancer3_frame3.png'], side: 'left', slot: 2, scale: 0.28, phaseOffset: 2.5 },
    { name: 'Raver 1',frames: ['dancer4_frame1.png','dancer4_frame2.png','dancer4_frame3.png'], side: 'right', slot: 0, scale: 0.32, phaseOffset: 0.8 },
    { name: 'Dude 2', frames: ['dancer1_frame2.png','dancer1_frame3.png','dancer1_frame1.png'], side: 'right', slot: 1, scale: 0.33, phaseOffset: 1.8 },
    { name: 'Girl 2', frames: ['dancer2_frame2.png','dancer2_frame3.png','dancer2_frame1.png'], side: 'right', slot: 2, scale: 0.29, phaseOffset: 3.0 },
  ];

  // Loaded sprite images
  const spriteImages = {}; // { filename: Image }
  let loaded = false;
  let loadCount = 0;
  const totalSprites = new Set(spriteConfigs.flatMap(s => s.frames)).size;

  // Preload all sprites
  function preload() {
    const allFiles = new Set(spriteConfigs.flatMap(s => s.frames));
    for (const file of allFiles) {
      const img = new Image();
      img.onload = () => {
        loadCount++;
        if (loadCount >= totalSprites) loaded = true;
      };
      img.onerror = () => {
        console.warn('[Dancers] Failed to load sprite:', file);
        loadCount++;
        if (loadCount >= totalSprites) loaded = true;
      };
      img.src = '/assets/sprites/' + file;
      spriteImages[file] = img;
    }
  }

  preload();

  function render(ctx, effect, audio, t) {
    if (!effect.enabled || !loaded) return;

    const intensity = effect.intensity;
    const speed = effect.speed;
    const color = effect.color;
    const bass = audio.bass;
    const mid = audio.mid;
    const beat = audio.beat;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    for (const dancer of spriteConfigs) {
      const phase = t * speed * 2.0 + dancer.phaseOffset;

      // Which frame to show - cycle through 3 frames based on time and beat
      const frameSpeed = 2.5 + bass * 3; // faster with more bass
      const frameIdx = Math.floor((t * frameSpeed + dancer.phaseOffset) % dancer.frames.length);
      const spriteFile = dancer.frames[frameIdx];
      const img = spriteImages[spriteFile];

      if (!img || !img.complete || img.naturalWidth === 0) continue;

      // Position
      const xPositions = dancer.side === 'left' ? LEFT_X : RIGHT_X;
      const baseX = xPositions[dancer.slot] || xPositions[0];
      const baseY = H - 20;

      // Dance movement
      const bounce = Math.abs(Math.sin(phase)) * 25 * (0.4 + bass * 0.8);
      const sway = Math.sin(phase * 0.7) * 12 * (0.3 + mid * 0.5);
      const squash = 1.0 + Math.abs(Math.sin(phase)) * 0.05 * bass; // slight squash/stretch

      const drawX = baseX + sway;
      const drawY = baseY - bounce;
      const scale = dancer.scale * (1 + bass * 0.1);

      // Sprite dimensions
      const spriteW = img.naturalWidth * scale;
      const spriteH = img.naturalHeight * scale;

      // Draw silhouette with glow
      ctx.save();

      // Glow effect behind the dancer
      ctx.shadowColor = color;
      ctx.shadowBlur = 15 + bass * 25;

      // Draw the silhouette - use source-atop to colorize
      // First draw the image
      ctx.globalAlpha = 0.15 + intensity * 0.3;
      ctx.drawImage(img, drawX - spriteW / 2, drawY - spriteH, spriteW * squash, spriteH / squash);

      // Colorized overlay on top
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.4 + bass * 0.3;
      ctx.fillRect(drawX - spriteW, drawY - spriteH - 10, spriteW * 2, spriteH + 20);

      ctx.restore();

      // Beat flash ring at feet
      if (beat) {
        ctx.save();
        ctx.globalAlpha = 0.5 * intensity;
        ctx.beginPath();
        ctx.ellipse(drawX, baseY, 40 * scale, 8, 0, 0, Math.PI * 2);
        const flashGrad = ctx.createRadialGradient(drawX, baseY, 0, drawX, baseY, 40 * scale);
        flashGrad.addColorStop(0, color);
        flashGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = flashGrad;
        ctx.fill();
        ctx.restore();
      }
    }

    ctx.restore();
  }

  return { render };
})();
