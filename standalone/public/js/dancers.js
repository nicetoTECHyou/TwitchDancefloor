// ═══════════════════════════════════════════════════════════════
// TwitchDancefloor - Dancing Silhouettes (SIDES ONLY!)
// ⚠️ NEVER draw dancers in the center area!
// ═══════════════════════════════════════════════════════════════

const DancersRenderer = (() => {
  const W = 1920, H = 1080;
  // CRITICAL: Center safe zone is 400-1520px - NO dancers there!
  const LEFT_ZONE = { minX: 40, maxX: 300 };
  const RIGHT_ZONE = { minX: 1620, maxX: 1880 };

  const dancers = [
    { side: 'left', x: 120, baseY: H - 60, phase: 0, scale: 1.0, style: 'groove' },
    { side: 'left', x: 240, baseY: H - 60, phase: 1.2, scale: 0.9, style: 'bounce' },
    { side: 'right', x: 1700, baseY: H - 60, phase: 0.8, scale: 1.0, style: 'groove' },
    { side: 'right', x: 1830, baseY: H - 60, phase: 2.0, scale: 0.85, style: 'bounce' },
  ];

  function drawDancer(ctx, dancer, audio, t, effect) {
    const intensity = effect.intensity;
    const speed = effect.speed;
    const color = effect.color;
    const beat = audio.beat;
    const bass = audio.bass;
    const mid = audio.mid;

    const phase = dancer.phase;
    const s = dancer.scale;
    const time = t * speed;

    // Dance animations
    const bounce = Math.abs(Math.sin(time * 2.5 + phase)) * 30 * s * (0.5 + bass);
    const sway = Math.sin(time * 1.8 + phase) * 15 * s * (0.3 + mid);
    const headBob = Math.sin(time * 3 + phase) * 5 * s;
    const armSwing = Math.sin(time * 2 + phase) * 40 * s * (0.4 + mid);
    const armSwing2 = Math.sin(time * 2 + phase + Math.PI) * 35 * s * (0.4 + mid);
    const hipSway = Math.sin(time * 2 + phase) * 10 * s * bass;
    const kneeBend = Math.abs(Math.sin(time * 2.5 + phase)) * 12 * s;

    const x = dancer.x + sway;
    const y = dancer.baseY - bounce;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    // Draw silhouette with glow
    ctx.strokeStyle = color;
    ctx.lineWidth = 3 * s;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = color;
    ctx.shadowBlur = 12 + bass * 15;

    const headR = 14 * s;
    const bodyH = 70 * s;
    const armLen = 45 * s;
    const legLen = 55 * s;

    // Head
    const headX = x + headBob;
    const headY = y - bodyH - legLen - headR;

    // Body top (neck)
    const neckX = headX;
    const neckY = headY + headR;
    // Body bottom (hip)
    const hipX = x + hipSway;
    const hipY = y - legLen + kneeBend * 0.5;

    ctx.beginPath();

    // Head circle
    ctx.moveTo(headX + headR, headY);
    ctx.arc(headX, headY, headR, 0, Math.PI * 2);

    // Neck to hip (spine)
    ctx.moveTo(neckX, neckY);
    ctx.quadraticCurveTo(x + hipSway * 0.5, neckY + bodyH * 0.5, hipX, hipY);

    // Left arm
    const shoulderX = neckX;
    const shoulderY = neckY + 10 * s;
    ctx.moveTo(shoulderX, shoulderY);
    const lArmEndX = shoulderX - armLen * Math.sin(armSwing * Math.PI / 180);
    const lArmEndY = shoulderY + armLen * Math.abs(Math.cos(armSwing * Math.PI / 180));
    ctx.quadraticCurveTo(shoulderX - armLen * 0.5, shoulderY + 15 * s, lArmEndX, lArmEndY);

    // Right arm
    const rArmEndX = shoulderX + armLen * Math.sin(armSwing2 * Math.PI / 180);
    const rArmEndY = shoulderY + armLen * Math.abs(Math.cos(armSwing2 * Math.PI / 180));
    ctx.moveTo(shoulderX, shoulderY);
    ctx.quadraticCurveTo(shoulderX + armLen * 0.5, shoulderY + 15 * s, rArmEndX, rArmEndY);

    // Left leg
    const lKneeX = hipX - 15 * s + Math.sin(time * 2.5 + phase) * 8 * s;
    const lKneeY = hipY + legLen * 0.5 + kneeBend;
    const lFootX = hipX - 20 * s + Math.sin(time * 1.5 + phase) * 5 * s;
    const lFootY = dancer.baseY;
    ctx.moveTo(hipX, hipY);
    ctx.quadraticCurveTo(lKneeX, lKneeY, lFootX, lFootY);

    // Right leg
    const rKneeX = hipX + 15 * s + Math.sin(time * 2.5 + phase + 1) * 8 * s;
    const rKneeY = hipY + legLen * 0.5 + kneeBend;
    const rFootX = hipX + 20 * s + Math.sin(time * 1.5 + phase + 1) * 5 * s;
    const rFootY = dancer.baseY;
    ctx.moveTo(hipX, hipY);
    ctx.quadraticCurveTo(rKneeX, rKneeY, rFootX, rFootY);

    ctx.stroke();

    // Glow fill for silhouette body
    ctx.globalAlpha = 0.15 * intensity + bass * 0.1;
    ctx.beginPath();
    ctx.moveTo(headX, headY - headR);
    ctx.arc(headX, headY, headR, 0, Math.PI * 2);
    ctx.fill();

    // Beat flash effect on dancer
    if (beat) {
      ctx.globalAlpha = 0.4 * intensity;
      ctx.beginPath();
      ctx.arc(x, y - bodyH * 0.5, 40 * s, 0, Math.PI * 2);
      const beatGrad = ctx.createRadialGradient(x, y - bodyH * 0.5, 0, x, y - bodyH * 0.5, 40 * s);
      beatGrad.addColorStop(0, color);
      beatGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = beatGrad;
      ctx.fill();
    }

    ctx.restore();
  }

  function render(ctx, effect, audio, t) {
    if (!effect.enabled) return;
    for (const dancer of dancers) {
      drawDancer(ctx, dancer, audio, t, effect);
    }
  }

  return { render };
})();
