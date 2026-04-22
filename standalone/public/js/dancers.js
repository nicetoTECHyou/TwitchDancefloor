// ═══════════════════════════════════════════════════════════════
// TwitchDancefloor - Procedural Skeletal Dance Animation v6
// PERFORMANCE OPTIMIZED: NO shadowBlur (was causing freeze!)
// Manual glow via layered strokes instead - 10x faster
// SIDES ONLY - NEVER in the center area!
// ═══════════════════════════════════════════════════════════════

const DancersRenderer = (() => {
  const W = 1920, H = 1080;

  // Positions: LEFT side and RIGHT side only
  const LEFT_X  = [120, 270, 400];
  const RIGHT_X = [1520, 1650, 1800];

  // ── Dance Style Definitions ──
  const STYLES = {

    hiphop: {
      name: 'Hip Hop',
      speed: 2.0,
      getPose(t, bass, bp) {
        const groove = Math.sin(t * 1.75);
        return {
          bounce: Math.abs(Math.sin(t * 3.5)) * (15 + bp * 28),
          sway: groove * (14 + bp * 14),
          lean: groove * (0.07 + bp * 0.07),
          headBob: Math.sin(t * 7) * (0.12 + bp * 0.12),
          lArm: Math.max(0, Math.sin(t * 3.5)) * (0.9 + bp * 0.5),
          lElbow: 0.7 + Math.sin(t * 3.5 + 1.0) * 0.5 + bp * 0.15,
          rArm: Math.max(0, Math.sin(t * 3.5 + Math.PI * 0.55)) * (0.9 + bp * 0.5),
          rElbow: 0.7 + Math.sin(t * 3.5 + Math.PI * 0.55 + 1.0) * 0.5 + bp * 0.15,
          lLeg: Math.sin(t * 3.5) * (0.14 + bp * 0.1),
          lKnee: Math.max(0, Math.sin(t * 3.5)) * (0.28 + bp * 0.14),
          rLeg: Math.sin(t * 3.5 + Math.PI) * (0.14 + bp * 0.1),
          rKnee: Math.max(0, Math.sin(t * 3.5 + Math.PI)) * (0.28 + bp * 0.14),
        };
      }
    },

    techno: {
      name: 'Techno',
      speed: 3.0,
      getPose(t, bass, bp) {
        const pump = Math.sin(t * 3);
        return {
          bounce: Math.abs(Math.sin(t * 6)) * (10 + bp * 22),
          sway: Math.sin(t * 2) * (6 + bp * 10),
          lean: Math.sin(t * 2) * (0.04 + bp * 0.03),
          headBob: Math.sin(t * 6) * (0.18 + bp * 0.14),
          lArm: 0.4 + Math.max(0, pump) * (1.1 + bp * 0.6),
          lElbow: 0.2 + Math.max(0, pump) * 0.3 + bp * 0.1,
          rArm: 0.4 + Math.max(0, -pump) * (1.1 + bp * 0.6),
          rElbow: 0.2 + Math.max(0, -pump) * 0.3 + bp * 0.1,
          lLeg: Math.sin(t * 3) * (0.08 + bp * 0.06),
          lKnee: Math.max(0, Math.sin(t * 3)) * 0.15 + bp * 0.08,
          rLeg: Math.sin(t * 3 + Math.PI) * (0.08 + bp * 0.06),
          rKnee: Math.max(0, Math.sin(t * 3 + Math.PI)) * 0.15 + bp * 0.08,
        };
      }
    },

    pop: {
      name: 'Pop',
      speed: 1.6,
      getPose(t, bass, bp) {
        const flow = Math.sin(t * 1.25);
        return {
          bounce: Math.abs(Math.sin(t * 2.5)) * (10 + bp * 20),
          sway: flow * (16 + bp * 12),
          lean: flow * (0.1 + bp * 0.05),
          headBob: Math.sin(t * 2.5) * (0.08 + bp * 0.08),
          lArm: 0.3 + Math.sin(t * 1.25) * (0.8 + bp * 0.3),
          lElbow: 0.5 + Math.sin(t * 2.5 + 0.5) * 0.35 + bp * 0.1,
          rArm: 0.3 + Math.sin(t * 1.25 + Math.PI * 0.6) * (0.8 + bp * 0.3),
          rElbow: 0.5 + Math.sin(t * 2.5 + Math.PI * 0.6 + 0.5) * 0.35 + bp * 0.1,
          lLeg: Math.sin(t * 2.5) * (0.1 + bp * 0.06),
          lKnee: Math.max(0, Math.sin(t * 2.5)) * (0.22 + bp * 0.1),
          rLeg: Math.sin(t * 2.5 + Math.PI) * (0.1 + bp * 0.06),
          rKnee: Math.max(0, Math.sin(t * 2.5 + Math.PI)) * (0.22 + bp * 0.1),
        };
      }
    },

    club: {
      name: 'Club',
      speed: 2.2,
      getPose(t, bass, bp) {
        const groove = Math.sin(t * 1.5);
        return {
          bounce: Math.abs(Math.sin(t * 3)) * (12 + bp * 24),
          sway: groove * (13 + bp * 11),
          lean: groove * (0.08 + bp * 0.06),
          headBob: Math.sin(t * 3) * (0.1 + bp * 0.1),
          lArm: 0.2 + Math.max(0, groove) * (0.6 + bp * 0.3),
          lElbow: 0.6 + Math.sin(t * 3 + 0.7) * 0.35 + bp * 0.1,
          rArm: 0.2 + Math.max(0, -groove) * (0.6 + bp * 0.3),
          rElbow: 0.6 + Math.sin(t * 3 + Math.PI + 0.7) * 0.35 + bp * 0.1,
          lLeg: Math.sin(t * 3) * (0.11 + bp * 0.07),
          lKnee: Math.max(0, Math.sin(t * 3)) * (0.22 + bp * 0.1),
          rLeg: Math.sin(t * 3 + Math.PI) * (0.11 + bp * 0.07),
          rKnee: Math.max(0, Math.sin(t * 3 + Math.PI)) * (0.22 + bp * 0.1),
        };
      }
    },
  };

  // ── Dancer Configurations ──
  const dancers = [
    { name: 'Hip Hop Dude',  style: 'hiphop', side: 'left',  slot: 0, scale: 2.2, phase: 0,    color: '#00ff88' },
    { name: 'Techno Girl',   style: 'techno', side: 'left',  slot: 1, scale: 2.0, phase: 1.2,  color: '#ff0088' },
    { name: 'Pop Star',      style: 'pop',    side: 'left',  slot: 2, scale: 1.9, phase: 2.5,  color: '#ffcc00' },
    { name: 'Club Dancer',   style: 'club',   side: 'right', slot: 0, scale: 2.1, phase: 0.8,  color: '#00aaff' },
    { name: 'Hip Hop Girl',  style: 'hiphop', side: 'right', slot: 1, scale: 2.0, phase: 1.8,  color: '#ff4488' },
    { name: 'Techno Dude',   style: 'techno', side: 'right', slot: 2, scale: 2.2, phase: 3.0,  color: '#aa44ff' },
  ];

  // ── Skeleton Dimensions ──
  const BONE = {
    torso: 55, neck: 18, headR: 13,
    upperArm: 28, forearm: 25, handR: 5,
    thigh: 35, shin: 32,
    shoulderW: 18, hipW: 14,
  };

  // ── Pre-computed color cache (avoid hex parsing every frame) ──
  const colorCache = {};
  function getRgb(hex) {
    if (colorCache[hex]) return colorCache[hex];
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    colorCache[hex] = { r, g, b };
    return colorCache[hex];
  }

  // ── Forward Kinematics ──
  function calculateJoints(hipX, hipY, pose, scale, flip) {
    const s = scale;
    const torsoAngle = -Math.PI / 2 + pose.lean;
    const neckX = hipX + Math.cos(torsoAngle) * BONE.torso * s;
    const neckY = hipY + Math.sin(torsoAngle) * BONE.torso * s;

    const headAngle = torsoAngle + pose.headBob;
    const headX = neckX + Math.cos(headAngle) * BONE.neck * s;
    const headY = neckY + Math.sin(headAngle) * BONE.neck * s;

    const perpAngle = torsoAngle + Math.PI / 2;
    const lShoulderX = neckX + Math.cos(perpAngle) * BONE.shoulderW * s * (flip ? -1 : 1);
    const lShoulderY = neckY + Math.sin(perpAngle) * BONE.shoulderW * s * (flip ? -1 : 1);
    const rShoulderX = neckX - Math.cos(perpAngle) * BONE.shoulderW * s * (flip ? -1 : 1);
    const rShoulderY = neckY - Math.sin(perpAngle) * BONE.shoulderW * s * (flip ? -1 : 1);

    const lArmDir = flip ? -1 : 1;
    const lUpperArmAngle = Math.PI / 2 - pose.lArm * lArmDir;
    const lElbowX = lShoulderX + Math.cos(lUpperArmAngle) * BONE.upperArm * s;
    const lElbowY = lShoulderY + Math.sin(lUpperArmAngle) * BONE.upperArm * s;
    const lForearmAngle = lUpperArmAngle - pose.lElbow * lArmDir;
    const lHandX = lElbowX + Math.cos(lForearmAngle) * BONE.forearm * s;
    const lHandY = lElbowY + Math.sin(lForearmAngle) * BONE.forearm * s;

    const rArmDir = flip ? 1 : -1;
    const rUpperArmAngle = Math.PI / 2 - pose.rArm * rArmDir;
    const rElbowX = rShoulderX + Math.cos(rUpperArmAngle) * BONE.upperArm * s;
    const rElbowY = rShoulderY + Math.sin(rUpperArmAngle) * BONE.upperArm * s;
    const rForearmAngle = rUpperArmAngle - pose.rElbow * rArmDir;
    const rHandX = rElbowX + Math.cos(rForearmAngle) * BONE.forearm * s;
    const rHandY = rElbowY + Math.sin(rForearmAngle) * BONE.forearm * s;

    const lHipX = hipX + Math.cos(perpAngle) * BONE.hipW * s * (flip ? -1 : 1);
    const lHipY = hipY + Math.sin(perpAngle) * BONE.hipW * s * (flip ? -1 : 1);
    const rHipX = hipX - Math.cos(perpAngle) * BONE.hipW * s * (flip ? -1 : 1);
    const rHipY = hipY - Math.sin(perpAngle) * BONE.hipW * s * (flip ? -1 : 1);

    const lLegDir = flip ? -1 : 1;
    const lThighAngle = Math.PI / 2 + pose.lLeg * lLegDir;
    const lKneeX = lHipX + Math.cos(lThighAngle) * BONE.thigh * s;
    const lKneeY = lHipY + Math.sin(lThighAngle) * BONE.thigh * s;
    const lShinAngle = lThighAngle + pose.lKnee;
    const lFootX = lKneeX + Math.cos(lShinAngle) * BONE.shin * s;
    const lFootY = lKneeY + Math.sin(lShinAngle) * BONE.shin * s;

    const rLegDir = flip ? 1 : -1;
    const rThighAngle = Math.PI / 2 + pose.rLeg * rLegDir;
    const rKneeX = rHipX + Math.cos(rThighAngle) * BONE.thigh * s;
    const rKneeY = rHipY + Math.sin(rThighAngle) * BONE.thigh * s;
    const rShinAngle = rThighAngle + pose.rKnee;
    const rFootX = rKneeX + Math.cos(rShinAngle) * BONE.shin * s;
    const rFootY = rKneeY + Math.sin(rShinAngle) * BONE.shin * s;

    return {
      hip: { x: hipX, y: hipY },
      neck: { x: neckX, y: neckY },
      head: { x: headX, y: headY },
      lShoulder: { x: lShoulderX, y: lShoulderY },
      rShoulder: { x: rShoulderX, y: rShoulderY },
      lElbow: { x: lElbowX, y: lElbowY },
      lHand: { x: lHandX, y: lHandY },
      rElbow: { x: rElbowX, y: rElbowY },
      rHand: { x: rHandX, y: rHandY },
      lHip: { x: lHipX, y: lHipY },
      rHip: { x: rHipX, y: rHipY },
      lKnee: { x: lKneeX, y: lKneeY },
      lFoot: { x: lFootX, y: lFootY },
      rKnee: { x: rKneeX, y: rKneeY },
      rFoot: { x: rFootX, y: rFootY },
    };
  }

  // ── FAST limb drawing (single path, no shadowBlur) ──
  function drawLimb(ctx, j1, j2, j3) {
    ctx.beginPath();
    ctx.moveTo(j1.x, j1.y);
    ctx.lineTo(j2.x, j2.y);
    ctx.lineTo(j3.x, j3.y);
    ctx.stroke();
  }

  // ── Draw a single dancer - PERFORMANCE OPTIMIZED ──
  // NO shadowBlur anywhere! Uses layered strokes for glow effect instead.
  // This is ~10x faster than the shadowBlur approach.
  function drawDancer(ctx, j, color, intensity, bp, scale) {
    const rgb = getRgb(color);
    const alpha = (0.55 + intensity * 0.35) * (0.75 + bp * 0.25);
    const s = scale;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // ── PASS 1: Soft glow layer (thick, low alpha = manual glow) ──
    // This replaces shadowBlur with a much cheaper technique
    const glowAlpha = alpha * 0.2;
    ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${glowAlpha})`;
    ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${glowAlpha})`;

    // Torso glow
    ctx.lineWidth = 28 * s;
    ctx.beginPath();
    ctx.moveTo(j.hip.x, j.hip.y);
    ctx.lineTo(j.neck.x, j.neck.y);
    ctx.stroke();

    // Head glow
    ctx.beginPath();
    ctx.arc(j.head.x, j.head.y, BONE.headR * s + 8, 0, Math.PI * 2);
    ctx.fill();

    // Limb glow
    ctx.lineWidth = 22 * s;
    drawLimb(ctx, j.lShoulder, j.lElbow, j.lHand);
    drawLimb(ctx, j.rShoulder, j.rElbow, j.rHand);
    drawLimb(ctx, j.lHip, j.lKnee, j.lFoot);
    drawLimb(ctx, j.rHip, j.rKnee, j.rFoot);

    // ── PASS 2: Medium glow layer ──
    const midAlpha = alpha * 0.35;
    ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${midAlpha})`;
    ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${midAlpha})`;

    // Torso
    ctx.lineWidth = 14 * s;
    ctx.beginPath();
    ctx.moveTo(j.hip.x, j.hip.y);
    ctx.lineTo(j.neck.x, j.neck.y);
    ctx.stroke();

    // Head
    ctx.beginPath();
    ctx.arc(j.head.x, j.head.y, BONE.headR * s + 3, 0, Math.PI * 2);
    ctx.fill();

    // Limbs
    ctx.lineWidth = 12 * s;
    drawLimb(ctx, j.lShoulder, j.lElbow, j.lHand);
    drawLimb(ctx, j.rShoulder, j.rElbow, j.rHand);
    drawLimb(ctx, j.lHip, j.lKnee, j.lFoot);
    drawLimb(ctx, j.rHip, j.rKnee, j.rFoot);

    // ── PASS 3: Solid body ──
    const bodyAlpha = alpha * 0.85;
    ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${bodyAlpha})`;
    ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${bodyAlpha})`;

    // Torso shape (filled trapezoid)
    ctx.beginPath();
    ctx.moveTo(j.lShoulder.x, j.lShoulder.y);
    ctx.lineTo(j.rShoulder.x, j.rShoulder.y);
    ctx.lineTo(j.rHip.x, j.rHip.y);
    ctx.lineTo(j.lHip.x, j.lHip.y);
    ctx.closePath();
    ctx.globalAlpha = bodyAlpha * 0.7;
    ctx.fill();
    ctx.globalAlpha = 1;

    // Head
    ctx.beginPath();
    ctx.arc(j.head.x, j.head.y, BONE.headR * s, 0, Math.PI * 2);
    ctx.fill();

    // Neck
    ctx.lineWidth = 8 * s;
    ctx.beginPath();
    ctx.moveTo(j.neck.x, j.neck.y);
    ctx.lineTo(j.head.x, j.head.y);
    ctx.stroke();

    // Arms
    ctx.lineWidth = 9 * s;
    drawLimb(ctx, j.lShoulder, j.lElbow, j.lHand);
    drawLimb(ctx, j.rShoulder, j.rElbow, j.rHand);

    // Legs
    ctx.lineWidth = 10 * s;
    drawLimb(ctx, j.lHip, j.lKnee, j.lFoot);
    drawLimb(ctx, j.rHip, j.rKnee, j.rFoot);

    // Hands
    ctx.beginPath();
    ctx.arc(j.lHand.x, j.lHand.y, BONE.handR * s, 0, Math.PI * 2);
    ctx.arc(j.rHand.x, j.rHand.y, BONE.handR * s, 0, Math.PI * 2);
    ctx.fill();

    // ── PASS 4: Bright white core highlights (thin, no shadow) ──
    const coreAlpha = alpha * 0.5;
    ctx.strokeStyle = `rgba(255,255,255,${coreAlpha})`;
    ctx.lineWidth = 2 * s;

    drawLimb(ctx, j.lShoulder, j.lElbow, j.lHand);
    drawLimb(ctx, j.rShoulder, j.rElbow, j.rHand);
    drawLimb(ctx, j.lHip, j.lKnee, j.lFoot);
    drawLimb(ctx, j.rHip, j.rKnee, j.rFoot);

    // Spine
    ctx.beginPath();
    ctx.moveTo(j.hip.x, j.hip.y);
    ctx.lineTo(j.neck.x, j.neck.y);
    ctx.stroke();

    // Head highlight
    ctx.fillStyle = `rgba(255,255,255,${coreAlpha * 0.4})`;
    ctx.beginPath();
    ctx.arc(j.head.x, j.head.y, BONE.headR * s * 0.45, 0, Math.PI * 2);
    ctx.fill();

    // ── Beat flash at feet ──
    if (bp > 0.3) {
      ctx.globalAlpha = bp * 0.4 * intensity;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(j.hip.x, j.hip.y + 8, 50 * s, 10 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  // ── Main Render ──
  function render(ctx, effect, audio, t) {
    if (!effect.enabled) return;

    const intensity = effect.intensity;
    const bass = audio.bass || 0;
    const bp = audio.beatPulse || 0;

    for (const dancer of dancers) {
      const style = STYLES[dancer.style];
      if (!style) continue;

      const dt = t * style.speed + dancer.phase;
      const pose = style.getPose(dt, bass, bp);

      const xPositions = dancer.side === 'left' ? LEFT_X : RIGHT_X;
      const baseX = xPositions[dancer.slot] || xPositions[0];
      const baseY = H - 20;

      const hipX = baseX + pose.sway;
      const hipY = baseY - pose.bounce - 30;

      const flip = dancer.side === 'right';
      const joints = calculateJoints(hipX, hipY, pose, dancer.scale, flip);

      drawDancer(ctx, joints, dancer.color, intensity, bp, dancer.scale);
    }
  }

  return { render };
})();
