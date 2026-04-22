// ═══════════════════════════════════════════════════════════════
// TwitchDancefloor - Procedural Skeletal Dance Animation v5
// Real dance movements: Hip Hop, Techno, Pop, Club
// NO sprites - pure mathematical animation, smooth at any FPS
// SIDES ONLY - NEVER in the center area!
// ═══════════════════════════════════════════════════════════════

const DancersRenderer = (() => {
  const W = 1920, H = 1080;

  // Positions: LEFT side and RIGHT side only
  const LEFT_X  = [120, 270, 400];
  const RIGHT_X = [1520, 1650, 1800];

  // ── Dance Style Definitions ──
  // Each style defines a getPose(t, bass, bp) function
  // Returns: bounce, sway, lean, headBob, lArm, lElbow, rArm, rElbow, lLeg, lKnee, rLeg, rKnee
  const STYLES = {

    hiphop: {
      name: 'Hip Hop',
      speed: 2.0,
      getPose(t, bass, bp) {
        // Bouncy, arm waves, body rolls, side-to-side groove
        const groove = Math.sin(t * 1.75);
        return {
          bounce: Math.abs(Math.sin(t * 3.5)) * (15 + bp * 28),
          sway: groove * (14 + bp * 14),
          lean: groove * (0.07 + bp * 0.07),
          headBob: Math.sin(t * 7) * (0.12 + bp * 0.12),
          // Arms: alternating waves and punches
          lArm: Math.max(0, Math.sin(t * 3.5)) * (0.9 + bp * 0.5),
          lElbow: 0.7 + Math.sin(t * 3.5 + 1.0) * 0.5 + bp * 0.15,
          rArm: Math.max(0, Math.sin(t * 3.5 + Math.PI * 0.55)) * (0.9 + bp * 0.5),
          rElbow: 0.7 + Math.sin(t * 3.5 + Math.PI * 0.55 + 1.0) * 0.5 + bp * 0.15,
          // Legs: bouncy steps
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
        // Stiff pumping, mechanical, rhythmic head bob
        const pump = Math.sin(t * 3);
        return {
          bounce: Math.abs(Math.sin(t * 6)) * (10 + bp * 22),
          sway: Math.sin(t * 2) * (6 + bp * 10),
          lean: Math.sin(t * 2) * (0.04 + bp * 0.03),
          headBob: Math.sin(t * 6) * (0.18 + bp * 0.14),
          // Arms pump up and down
          lArm: 0.4 + Math.max(0, pump) * (1.1 + bp * 0.6),
          lElbow: 0.2 + Math.max(0, pump) * 0.3 + bp * 0.1,
          rArm: 0.4 + Math.max(0, -pump) * (1.1 + bp * 0.6),
          rElbow: 0.2 + Math.max(0, -pump) * 0.3 + bp * 0.1,
          // Legs: minimal, just weight shift
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
        // Smooth flowing, graceful arm arcs, gentle sway
        const flow = Math.sin(t * 1.25);
        return {
          bounce: Math.abs(Math.sin(t * 2.5)) * (10 + bp * 20),
          sway: flow * (16 + bp * 12),
          lean: flow * (0.1 + bp * 0.05),
          headBob: Math.sin(t * 2.5) * (0.08 + bp * 0.08),
          // Arms: smooth arcs
          lArm: 0.3 + Math.sin(t * 1.25) * (0.8 + bp * 0.3),
          lElbow: 0.5 + Math.sin(t * 2.5 + 0.5) * 0.35 + bp * 0.1,
          rArm: 0.3 + Math.sin(t * 1.25 + Math.PI * 0.6) * (0.8 + bp * 0.3),
          rElbow: 0.5 + Math.sin(t * 2.5 + Math.PI * 0.6 + 0.5) * 0.35 + bp * 0.1,
          // Legs: gentle weight shift
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
        // Generic club dancing - mix of groove and bounce
        const groove = Math.sin(t * 1.5);
        return {
          bounce: Math.abs(Math.sin(t * 3)) * (12 + bp * 24),
          sway: groove * (13 + bp * 11),
          lean: groove * (0.08 + bp * 0.06),
          headBob: Math.sin(t * 3) * (0.1 + bp * 0.1),
          // Arms: casual up and sway
          lArm: 0.2 + Math.max(0, groove) * (0.6 + bp * 0.3),
          lElbow: 0.6 + Math.sin(t * 3 + 0.7) * 0.35 + bp * 0.1,
          rArm: 0.2 + Math.max(0, -groove) * (0.6 + bp * 0.3),
          rElbow: 0.6 + Math.sin(t * 3 + Math.PI + 0.7) * 0.35 + bp * 0.1,
          // Legs: rhythmic bounce
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

  // ── Skeleton Dimensions (in local units, scaled by dancer.scale) ──
  const BONE = {
    torso: 55,     // hip to neck
    neck: 18,      // neck to head center
    headR: 13,     // head radius
    upperArm: 28,  // shoulder to elbow
    forearm: 25,   // elbow to hand
    handR: 5,      // hand circle radius
    thigh: 35,     // hip to knee
    shin: 32,      // knee to foot
    shoulderW: 18, // half shoulder width (for visual)
    hipW: 14,      // half hip width (for visual)
  };

  // ── Forward Kinematics: Calculate joint positions from pose ──
  function calculateJoints(hipX, hipY, pose, scale, flip) {
    const s = scale;

    // Torso (hip to neck) - goes upward
    const torsoAngle = -Math.PI / 2 + pose.lean;
    const neckX = hipX + Math.cos(torsoAngle) * BONE.torso * s;
    const neckY = hipY + Math.sin(torsoAngle) * BONE.torso * s;

    // Head
    const headAngle = torsoAngle + pose.headBob;
    const headX = neckX + Math.cos(headAngle) * BONE.neck * s;
    const headY = neckY + Math.sin(headAngle) * BONE.neck * s;

    // Shoulder positions (slightly left and right of neck)
    const perpAngle = torsoAngle + Math.PI / 2; // perpendicular to torso
    const lShoulderX = neckX + Math.cos(perpAngle) * BONE.shoulderW * s * (flip ? -1 : 1);
    const lShoulderY = neckY + Math.sin(perpAngle) * BONE.shoulderW * s * (flip ? -1 : 1);
    const rShoulderX = neckX - Math.cos(perpAngle) * BONE.shoulderW * s * (flip ? -1 : 1);
    const rShoulderY = neckY - Math.sin(perpAngle) * BONE.shoulderW * s * (flip ? -1 : 1);

    // Left arm
    const lArmDir = flip ? -1 : 1;
    const lUpperArmAngle = Math.PI / 2 - pose.lArm * lArmDir;
    const lElbowX = lShoulderX + Math.cos(lUpperArmAngle) * BONE.upperArm * s;
    const lElbowY = lShoulderY + Math.sin(lUpperArmAngle) * BONE.upperArm * s;
    const lForearmAngle = lUpperArmAngle - pose.lElbow * lArmDir;
    const lHandX = lElbowX + Math.cos(lForearmAngle) * BONE.forearm * s;
    const lHandY = lElbowY + Math.sin(lForearmAngle) * BONE.forearm * s;

    // Right arm
    const rArmDir = flip ? 1 : -1;
    const rUpperArmAngle = Math.PI / 2 - pose.rArm * rArmDir;
    const rElbowX = rShoulderX + Math.cos(rUpperArmAngle) * BONE.upperArm * s;
    const rElbowY = rShoulderY + Math.sin(rUpperArmAngle) * BONE.upperArm * s;
    const rForearmAngle = rUpperArmAngle - pose.rElbow * rArmDir;
    const rHandX = rElbowX + Math.cos(rForearmAngle) * BONE.forearm * s;
    const rHandY = rElbowY + Math.sin(rForearmAngle) * BONE.forearm * s;

    // Hip joint positions
    const lHipX = hipX + Math.cos(perpAngle) * BONE.hipW * s * (flip ? -1 : 1);
    const lHipY = hipY + Math.sin(perpAngle) * BONE.hipW * s * (flip ? -1 : 1);
    const rHipX = hipX - Math.cos(perpAngle) * BONE.hipW * s * (flip ? -1 : 1);
    const rHipY = hipY - Math.sin(perpAngle) * BONE.hipW * s * (flip ? -1 : 1);

    // Left leg
    const lLegDir = flip ? -1 : 1;
    const lThighAngle = Math.PI / 2 + pose.lLeg * lLegDir;
    const lKneeX = lHipX + Math.cos(lThighAngle) * BONE.thigh * s;
    const lKneeY = lHipY + Math.sin(lThighAngle) * BONE.thigh * s;
    const lShinAngle = lThighAngle + pose.lKnee;
    const lFootX = lKneeX + Math.cos(lShinAngle) * BONE.shin * s;
    const lFootY = lKneeY + Math.sin(lShinAngle) * BONE.shin * s;

    // Right leg
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

  // ── Draw a single dancer ──
  function drawDancer(ctx, j, color, intensity, bp, scale) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    const s = scale;
    const alpha = (0.55 + intensity * 0.35) * (0.75 + bp * 0.25);
    const glowBase = 12 + bp * 25;

    // ── PASS 1: Wide glow (atmosphere) ──
    ctx.globalAlpha = alpha * 0.3;
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = color;
    ctx.shadowBlur = glowBase + 20;

    // Torso glow
    ctx.lineWidth = 22 * s;
    ctx.beginPath();
    ctx.moveTo(j.hip.x, j.hip.y);
    ctx.lineTo(j.neck.x, j.neck.y);
    ctx.stroke();

    // Head glow
    ctx.beginPath();
    ctx.arc(j.head.x, j.head.y, BONE.headR * s + 6, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    // Limb glow
    ctx.lineWidth = 16 * s;
    drawLimb(ctx, j.lShoulder, j.lElbow, j.lHand);
    drawLimb(ctx, j.rShoulder, j.rElbow, j.rHand);
    drawLimb(ctx, j.lHip, j.lKnee, j.lFoot);
    drawLimb(ctx, j.rHip, j.rKnee, j.rFoot);

    // ── PASS 2: Solid body ──
    ctx.globalAlpha = alpha;
    ctx.shadowBlur = glowBase;

    // Draw torso shape (trapezoid from shoulders to hips)
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(j.lShoulder.x, j.lShoulder.y);
    ctx.lineTo(j.rShoulder.x, j.rShoulder.y);
    ctx.lineTo(j.rHip.x, j.rHip.y);
    ctx.lineTo(j.lHip.x, j.lHip.y);
    ctx.closePath();
    ctx.globalAlpha = alpha * 0.7;
    ctx.fill();

    // Head
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(j.head.x, j.head.y, BONE.headR * s, 0, Math.PI * 2);
    ctx.fill();

    // Neck
    ctx.lineWidth = 8 * s;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(j.neck.x, j.neck.y);
    ctx.lineTo(j.head.x, j.head.y);
    ctx.stroke();

    // Arms (thick, tapered)
    ctx.lineWidth = 9 * s;
    drawLimb(ctx, j.lShoulder, j.lElbow, j.lHand);
    drawLimb(ctx, j.rShoulder, j.rElbow, j.rHand);

    // Legs (thick, tapered)
    ctx.lineWidth = 10 * s;
    drawLimb(ctx, j.lHip, j.lKnee, j.lFoot);
    drawLimb(ctx, j.rHip, j.rKnee, j.rFoot);

    // Hands
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(j.lHand.x, j.lHand.y, BONE.handR * s, 0, Math.PI * 2);
    ctx.arc(j.rHand.x, j.rHand.y, BONE.handR * s, 0, Math.PI * 2);
    ctx.fill();

    // ── PASS 3: Bright core highlights ──
    ctx.globalAlpha = alpha * 0.6;
    ctx.strokeStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 4;

    ctx.lineWidth = 2 * s;
    drawLimb(ctx, j.lShoulder, j.lElbow, j.lHand);
    drawLimb(ctx, j.rShoulder, j.rElbow, j.rHand);
    drawLimb(ctx, j.lHip, j.lKnee, j.lFoot);
    drawLimb(ctx, j.rHip, j.rKnee, j.rFoot);

    // Core spine line
    ctx.beginPath();
    ctx.moveTo(j.hip.x, j.hip.y);
    ctx.lineTo(j.neck.x, j.neck.y);
    ctx.stroke();

    // Head highlight
    ctx.beginPath();
    ctx.arc(j.head.x, j.head.y, BONE.headR * s * 0.5, 0, Math.PI * 2);
    ctx.globalAlpha = alpha * 0.3;
    ctx.fill();

    // ── Beat flash at feet ──
    if (bp > 0.3) {
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = bp * 0.5 * intensity;
      const flashR = 60 * s;
      const grad = ctx.createRadialGradient(j.hip.x, j.hip.y + 5, 0, j.hip.x, j.hip.y + 5, flashR);
      grad.addColorStop(0, color);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(j.hip.x, j.hip.y + 5, flashR, flashR * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // Helper: draw a two-segment limb (shoulder→elbow→hand or hip→knee→foot)
  function drawLimb(ctx, joint1, joint2, joint3) {
    ctx.beginPath();
    ctx.moveTo(joint1.x, joint1.y);
    ctx.lineTo(joint2.x, joint2.y);
    ctx.lineTo(joint3.x, joint3.y);
    ctx.stroke();
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

      // Time with phase offset and style speed
      const dt = t * style.speed + dancer.phase;

      // Get animated pose
      const pose = style.getPose(dt, bass, bp);

      // Base position
      const xPositions = dancer.side === 'left' ? LEFT_X : RIGHT_X;
      const baseX = xPositions[dancer.slot] || xPositions[0];
      const baseY = H - 20; // feet on ground

      // Apply bounce and sway to hip position
      const hipX = baseX + pose.sway;
      const hipY = baseY - pose.bounce - 30; // 30 = base offset from ground

      // Calculate all joint positions
      const flip = dancer.side === 'right';
      const joints = calculateJoints(hipX, hipY, pose, dancer.scale, flip);

      // Draw the dancer
      drawDancer(ctx, joints, dancer.color, intensity, bp, dancer.scale);
    }
  }

  return { render };
})();
