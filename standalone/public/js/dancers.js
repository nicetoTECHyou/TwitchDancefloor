// ═══════════════════════════════════════════════════════════════
// TwitchDancefloor - Sprite-based Dancing Party People v2
// Draws silhouettes with color tinting, NO white boxes
// ⚠️ SIDES ONLY - NEVER in the center area!
// ═══════════════════════════════════════════════════════════════

const DancersRenderer = (() => {
  const W = 1920, H = 1080;
  // CRITICAL: Center zone 400-1520 is the safe zone - NO dancers there!
  const LEFT_X  = [80, 200, 310];
  const RIGHT_X = [1610, 1730, 1850];

  const spriteConfigs = [
    { name: 'Dude 1', frames: ['dancer1_frame1.png','dancer1_frame2.png','dancer1_frame3.png'], side: 'left', slot: 0, scale: 0.32, phaseOffset: 0 },
    { name: 'Girl 1', frames: ['dancer2_frame1.png','dancer2_frame2.png','dancer2_frame3.png'], side: 'left', slot: 1, scale: 0.28, phaseOffset: 1.2 },
    { name: 'DJ',     frames: ['dancer3_frame1.png','dancer3_frame2.png','dancer3_frame3.png'], side: 'left', slot: 2, scale: 0.26, phaseOffset: 2.5 },
    { name: 'Raver',  frames: ['dancer4_frame1.png','dancer4_frame2.png','dancer4_frame3.png'], side: 'right', slot: 0, scale: 0.30, phaseOffset: 0.8 },
    { name: 'Dude 2', frames: ['dancer1_frame2.png','dancer1_frame3.png','dancer1_frame1.png'], side: 'right', slot: 1, scale: 0.31, phaseOffset: 1.8 },
    { name: 'Girl 2', frames: ['dancer2_frame2.png','dancer2_frame3.png','dancer2_frame1.png'], side: 'right', slot: 2, scale: 0.27, phaseOffset: 3.0 },
  ];

  // Pre-loaded sprite images
  const spriteImages = {};
  // Offscreen canvases for silhouette extraction (black=body, transparent=bg)
  const silhouetteCanvases = {};
  let loaded = false;
  let loadCount = 0;
  const allFiles = new Set(spriteConfigs.flatMap(s => s.frames));
  const totalSprites = allFiles.size;

  // Preload and extract silhouettes
  function preload() {
    for (const file of allFiles) {
      const img = new Image();
      img.onload = () => {
        // Create offscreen canvas and extract silhouette
        const oc = document.createElement('canvas');
        oc.width = img.naturalWidth;
        oc.height = img.naturalHeight;
        const octx = oc.getContext('2d');
        octx.drawImage(img, 0, 0);
        
        // Get pixel data and create silhouette
        const imageData = octx.getImageData(0, 0, oc.width, oc.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
          const brightness = (r + g + b) / 3;
          // If pixel is dark (silhouette body) -> make fully opaque
          // If pixel is light (background) -> make transparent
          if (brightness > 180) {
            data[i+3] = 0; // transparent background
          } else {
            // Make body white (will be colorized later)
            data[i] = 255;
            data[i+1] = 255;
            data[i+2] = 255;
            data[i+3] = 255;
          }
        }
        octx.putImageData(imageData, 0, 0);
        silhouetteCanvases[file] = oc;
        
        loadCount++;
        if (loadCount >= totalSprites) loaded = true;
      };
      img.onerror = () => {
        console.warn('[Dancers] Failed to load:', file);
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
    const bp = audio.beatPulse || 0;

    for (const dancer of spriteConfigs) {
      const phase = t * speed * 2.0 + dancer.phaseOffset;

      // Frame cycling - faster with more bass
      const frameSpeed = 3.0 + bass * 4 + bp * 2;
      const frameIdx = Math.floor((t * frameSpeed + dancer.phaseOffset * 2) % dancer.frames.length);
      const spriteFile = dancer.frames[frameIdx];
      const silhouette = silhouetteCanvases[spriteFile];

      if (!silhouette) continue;

      // Position
      const xPositions = dancer.side === 'left' ? LEFT_X : RIGHT_X;
      const baseX = xPositions[dancer.slot] || xPositions[0];
      const baseY = H - 10;

      // Dance movement
      const bounce = Math.abs(Math.sin(phase)) * 20 * (0.4 + bass * 0.8);
      const sway = Math.sin(phase * 0.7) * 15 * (0.3 + mid * 0.5);
      const squash = 1.0 + Math.abs(Math.sin(phase)) * 0.03 * bass;

      const drawX = baseX + sway;
      const drawY = baseY - bounce;
      const scale = dancer.scale * (1 + bass * 0.08);

      const spriteW = silhouette.width * scale;
      const spriteH = silhouette.height * scale;

      ctx.save();

      // 1. Draw the white silhouette
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = (0.5 + intensity * 0.4) * (0.7 + bp * 0.3);
      
      // Flip for right side dancers
      if (dancer.side === 'right') {
        ctx.translate(drawX, drawY);
        ctx.scale(-squash, 1 / squash);
        ctx.drawImage(silhouette, -spriteW / 2, -spriteH, spriteW, spriteH);
      } else {
        ctx.drawImage(silhouette, drawX - spriteW / 2, drawY - spriteH, spriteW * squash, spriteH / squash);
      }

      // 2. Colorize: draw colored version with multiply
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = 0.9;
      
      // Use effect color for tinting
      if (dancer.side === 'right') {
        ctx.fillStyle = color;
        ctx.fillRect(drawX - spriteW, drawY - spriteH - 10, spriteW * 2, spriteH + 20);
      } else {
        ctx.fillStyle = color;
        ctx.fillRect(drawX - spriteW / 2 - 10, drawY - spriteH - 10, spriteW + 20, spriteH + 20);
      }

      // 3. Add glow effect around silhouette
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = 0.15 + bp * 0.25;
      ctx.shadowColor = color;
      ctx.shadowBlur = 20 + bp * 30;
      
      if (dancer.side === 'right') {
        ctx.drawImage(silhouette, drawX - spriteW / 2 - 2, drawY - spriteH - 2, spriteW + 4, spriteH + 4);
      } else {
        ctx.drawImage(silhouette, drawX - spriteW / 2 - 2, drawY - spriteH - 2, spriteW + 4, spriteH + 4);
      }

      // 4. Beat flash at feet
      if (beat || bp > 0.3) {
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = bp * 0.6 * intensity;
        ctx.beginPath();
        ctx.ellipse(drawX, baseY, 50 * scale, 10, 0, 0, Math.PI * 2);
        const flashGrad = ctx.createRadialGradient(drawX, baseY, 0, drawX, baseY, 50 * scale);
        flashGrad.addColorStop(0, color);
        flashGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = flashGrad;
        ctx.shadowColor = color;
        ctx.shadowBlur = 25;
        ctx.fill();
      }

      ctx.restore();
    }
  }

  return { render };
})();
