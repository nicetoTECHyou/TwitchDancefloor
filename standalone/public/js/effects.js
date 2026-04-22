// ═══════════════════════════════════════════════════════════════
// TwitchDancefloor - Visual Effects Renderer v6
// PERFORMANCE OPTIMIZED: Minimal shadowBlur usage
// Uses layered strokes for glow instead of shadowBlur (10x faster)
// ═══════════════════════════════════════════════════════════════

const EffectsRenderer = (() => {
  const W = 1920, H = 1080;

  // ── Utility ──
  const rgbCache = {};
  function hexToRgb(hex) {
    if (rgbCache[hex]) return rgbCache[hex];
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    rgbCache[hex] = { r, g, b };
    return rgbCache[hex];
  }
  function rgba(hex, a) {
    const c = hexToRgb(hex);
    return `rgba(${c.r},${c.g},${c.b},${Math.max(0, Math.min(1, a))})`;
  }
  function hsl(h, s, l, a) { return `hsla(${h},${s}%,${l}%,${a})`; }

  // ── Particle pools ──
  const particlePool = [];
  const confettiPool = [];
  const pulseRings = [];

  // ═══════════════════ LASER ═══════════════════
  function renderLaser(ctx, effect, audio, t) {
    if (!effect.enabled) return;
    const intensity = effect.intensity;
    const speed = effect.speed;
    const color = effect.color;
    const bp = audio.beatPulse || 0;
    const count = Math.min(Math.floor(4 + audio.bass * 3 * intensity), 8);
    const sweepSpeed = 0.4 * speed + audio.mid * 1.2;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.lineCap = 'round';

    for (let i = 0; i < count; i++) {
      const phase = (i / count) * Math.PI * 2;
      const angle = Math.sin(t * sweepSpeed + phase) * 0.9;
      const originSide = i % 4;
      let ox, oy, dx, dy;

      if (originSide === 0) { ox = 0; oy = H; dx = Math.cos(angle - 0.3); dy = Math.sin(angle - 1.2); }
      else if (originSide === 1) { ox = W; oy = H; dx = Math.cos(angle + 0.3 + Math.PI); dy = Math.sin(angle - 1.2); }
      else if (originSide === 2) { ox = W * 0.15; oy = 0; dx = Math.cos(angle + 0.5); dy = Math.sin(angle + 0.8); }
      else { ox = W * 0.85; oy = 0; dx = Math.cos(angle - 0.5 + Math.PI); dy = Math.sin(angle + 0.8); }

      const len = 2500;
      const ex = ox + dx * len;
      const ey = oy + dy * len;

      // Layer 1: Wide soft glow (manual - no shadowBlur!)
      ctx.beginPath();
      ctx.moveTo(ox, oy); ctx.lineTo(ex, ey);
      ctx.strokeStyle = rgba(color, (0.08 + bp * 0.05) * intensity);
      ctx.lineWidth = 24 + audio.bass * 10 + bp * 8;
      ctx.stroke();

      // Layer 2: Medium glow
      ctx.beginPath();
      ctx.moveTo(ox, oy); ctx.lineTo(ex, ey);
      ctx.strokeStyle = rgba(color, (0.2 + bp * 0.1) * intensity);
      ctx.lineWidth = 8 + audio.bass * 4;
      ctx.stroke();

      // Layer 3: Core beam (bright, thin)
      ctx.beginPath();
      ctx.moveTo(ox, oy); ctx.lineTo(ex, ey);
      ctx.strokeStyle = rgba(color, (0.5 + bp * 0.2) * intensity);
      ctx.lineWidth = 3 + audio.bass * 1.5;
      ctx.stroke();

      // Layer 4: White hot center
      ctx.beginPath();
      ctx.moveTo(ox, oy); ctx.lineTo(ex, ey);
      ctx.strokeStyle = rgba('#ffffff', (0.6 + bp * 0.3) * intensity);
      ctx.lineWidth = 1 + audio.bass * 0.5;
      ctx.stroke();
    }
    ctx.restore();
  }

  // ═══════════════════ SPOTLIGHT ═══════════════════
  function renderSpotlight(ctx, effect, audio, t) {
    if (!effect.enabled) return;
    const intensity = effect.intensity;
    const speed = effect.speed;
    const color = effect.color;
    const bp = audio.beatPulse || 0;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    for (let i = 0; i < 4; i++) {
      const phase = (i / 4) * Math.PI * 2;
      const centerX = W * (0.2 + i * 0.2) + Math.sin(t * speed * 0.3 + phase) * 250;
      const topX = centerX + Math.sin(t * speed * 0.2 + phase * 1.5) * 120;
      const topY = -30;
      const spread = (250 + audio.bass * 350 * intensity + bp * 100);
      const alpha = (0.12 + bp * 0.08) * intensity + audio.mid * 0.15 * intensity;

      const grad = ctx.createRadialGradient(topX, topY, 10, centerX, H, spread);
      grad.addColorStop(0, rgba(color, alpha * 1.2));
      grad.addColorStop(0.4, rgba(color, alpha * 0.6));
      grad.addColorStop(1, rgba(color, 0));

      ctx.beginPath();
      ctx.moveTo(topX, topY);
      ctx.lineTo(centerX - spread, H);
      ctx.lineTo(centerX + spread, H);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // Floor pool
      const poolGrad = ctx.createRadialGradient(centerX, H - 20, 5, centerX, H - 20, spread * 0.7);
      poolGrad.addColorStop(0, rgba(color, alpha * 2));
      poolGrad.addColorStop(1, rgba(color, 0));
      ctx.beginPath();
      ctx.ellipse(centerX, H - 20, spread * 0.7, 60, 0, 0, Math.PI * 2);
      ctx.fillStyle = poolGrad;
      ctx.fill();
    }
    ctx.restore();
  }

  // ═══════════════════ FOG ═══════════════════
  function renderFog(ctx, effect, audio, t) {
    if (!effect.enabled) return;
    const intensity = effect.intensity;
    const speed = effect.speed;
    const color = effect.color;
    const bp = audio.beatPulse || 0;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    for (let i = 0; i < 12; i++) {
      const y = H * 0.35 + Math.sin(t * speed * 0.12 + i * 1.1) * H * 0.35;
      const x = ((t * speed * 30 + i * 220) % (W + 800)) - 400;
      const size = 400 + i * 70 + audio.volume * 300 * intensity + bp * 150;
      const alpha = (0.08 + audio.volume * 0.12 + bp * 0.06) * intensity;

      const grad = ctx.createRadialGradient(x, y, 0, x, y, size);
      grad.addColorStop(0, rgba(color, alpha * 2.5));
      grad.addColorStop(0.25, rgba(color, alpha * 1.5));
      grad.addColorStop(0.6, rgba(color, alpha * 0.6));
      grad.addColorStop(1, rgba(color, 0));

      ctx.beginPath();
      ctx.ellipse(x, y, size, size * 0.35, Math.sin(t * 0.05 + i) * 0.15, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    }
    ctx.restore();
  }

  // ═══════════════════ STROBE ═══════════════════
  function renderStrobe(ctx, effect, audio, t) {
    if (!effect.enabled) return;
    const intensity = effect.intensity;
    const speed = effect.speed;
    const color = effect.color;
    const bp = audio.beatPulse || 0;

    if (bp > 0.4) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = rgba(color, bp * 0.4 * intensity);
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    const freq = speed * 2;
    const autoFlash = Math.sin(t * freq * Math.PI * 2) > 0.92;
    if (autoFlash && bp < 0.2) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = rgba(color, 0.25 * intensity);
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  }

  // ═══════════════════ LIGHT BEAM ═══════════════════
  function renderLightbeam(ctx, effect, audio, t) {
    if (!effect.enabled) return;
    const intensity = effect.intensity;
    const speed = effect.speed;
    const color = effect.color;
    const bp = audio.beatPulse || 0;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    for (let i = 0; i < 6; i++) {
      const phase = i * Math.PI * 2 / 6;
      const topX = W * (0.08 + i * 0.17);
      const sway = Math.sin(t * speed * 0.35 + phase) * 180;
      const alpha = (0.1 + audio.bass * 0.15 + bp * 0.08) * intensity;
      const topW = 10;
      const botW = 150 + audio.bass * 200 * intensity + bp * 60;

      ctx.beginPath();
      ctx.moveTo(topX + sway - topW, 0);
      ctx.lineTo(topX + sway + topW, 0);
      ctx.lineTo(topX + sway * 2 + botW, H);
      ctx.lineTo(topX + sway * 2 - botW, H);
      ctx.closePath();

      const grad = ctx.createLinearGradient(topX + sway, 0, topX + sway * 2, H);
      grad.addColorStop(0, rgba(color, alpha * 1.5));
      grad.addColorStop(0.3, rgba(color, alpha));
      grad.addColorStop(0.7, rgba(color, alpha * 0.4));
      grad.addColorStop(1, rgba(color, 0));
      ctx.fillStyle = grad;
      ctx.fill();
    }
    ctx.restore();
  }

  // ═══════════════════ PARTICLES ═══════════════════
  function renderParticles(ctx, effect, audio, t) {
    if (!effect.enabled) return;
    const intensity = effect.intensity;
    const speed = effect.speed;
    const color = effect.color;
    const bp = audio.beatPulse || 0;
    const maxParticles = Math.floor(100 * intensity);

    const spawnRate = 2 + audio.volume * 6 * intensity;
    for (let i = 0; i < spawnRate && particlePool.length < maxParticles; i++) {
      particlePool.push({
        x: Math.random() * W, y: H + 10,
        vx: (Math.random() - 0.5) * 2.5 * speed,
        vy: -(1.5 + Math.random() * 3.5) * speed,
        size: 1.5 + Math.random() * 3.5,
        life: 1, decay: 0.004 + Math.random() * 0.005,
      });
    }

    if (audio.beat) {
      for (let i = 0; i < 20; i++) {
        if (particlePool.length < maxParticles + 40) {
          particlePool.push({
            x: W * 0.2 + Math.random() * W * 0.6, y: H * 0.3 + Math.random() * H * 0.5,
            vx: (Math.random() - 0.5) * 10, vy: -Math.random() * 6,
            size: 2 + Math.random() * 4, life: 1, decay: 0.008 + Math.random() * 0.009,
          });
        }
      }
    }

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    for (let i = particlePool.length - 1; i >= 0; i--) {
      const p = particlePool[i];
      p.x += p.vx; p.y += p.vy;
      p.vy -= 0.015; p.life -= p.decay;
      if (p.life <= 0 || p.y < -30) { particlePool.splice(i, 1); continue; }

      const glowSize = p.size * p.life * (1 + bp * 0.3);
      // Draw as simple circle - NO shadowBlur
      ctx.beginPath();
      ctx.arc(p.x, p.y, glowSize * 1.8, 0, Math.PI * 2);
      ctx.fillStyle = rgba(color, p.life * 0.15 * intensity);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(p.x, p.y, glowSize, 0, Math.PI * 2);
      ctx.fillStyle = rgba(color, p.life * (0.6 + bp * 0.2) * intensity);
      ctx.fill();

      // White core
      ctx.beginPath();
      ctx.arc(p.x, p.y, glowSize * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = rgba('#ffffff', p.life * 0.4 * intensity);
      ctx.fill();
    }
    ctx.restore();
  }

  // ═══════════════════ EQUALIZER ═══════════════════
  function renderEqualizer(ctx, effect, audio, t) {
    if (!effect.enabled) return;
    const intensity = effect.intensity;
    const color = effect.color;
    const barCount = 64;
    const totalBarW = W / barCount;
    const barW = totalBarW * 0.72;
    const gap = totalBarW * 0.28;
    const maxH = 300 * intensity;
    const bp = audio.beatPulse || 0;

    const bands = audio.eqBands;
    if (!bands || bands.length === 0) return;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    for (let i = 0; i < barCount; i++) {
      const raw = bands[i] || 0;
      const barH = Math.max(raw * maxH + 6 + bp * 20, 6);
      const x = i * totalBarW + gap / 2;
      const y = H - barH;

      const grad = ctx.createLinearGradient(x, H, x, y);
      grad.addColorStop(0, rgba(color, 0.9 * intensity));
      grad.addColorStop(0.4, rgba(color, 0.6 * intensity));
      grad.addColorStop(1, rgba(color, 0.15 * intensity));

      ctx.fillStyle = grad;
      const r = Math.min(barW / 2, 4);
      ctx.beginPath();
      ctx.moveTo(x, H);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.lineTo(x + barW - r, y);
      ctx.quadraticCurveTo(x + barW, y, x + barW, y + r);
      ctx.lineTo(x + barW, H);
      ctx.fill();

      // Top cap highlight
      ctx.fillStyle = rgba('#ffffff', (0.3 + bp * 0.3) * intensity);
      ctx.fillRect(x, y, barW, Math.min(3, barH));
    }
    ctx.restore();
  }

  // ═══════════════════ COLOR WASH ═══════════════════
  function renderColorwash(ctx, effect, audio, t) {
    if (!effect.enabled) return;
    const intensity = effect.intensity;
    const speed = effect.speed;
    const bp = audio.beatPulse || 0;
    const hue = (t * speed * 30) % 360;

    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, hsl(hue, 85, 50, (0.1 + bp * 0.08) * intensity));
    grad.addColorStop(0.5, hsl((hue + 120) % 360, 85, 50, (0.08 + audio.mid * 0.1) * intensity));
    grad.addColorStop(1, hsl((hue + 240) % 360, 85, 50, (0.1 + bp * 0.08) * intensity));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // ═══════════════════ MIRROR BALL ═══════════════════
  function renderMirrorball(ctx, effect, audio, t) {
    if (!effect.enabled) return;
    const intensity = effect.intensity;
    const speed = effect.speed;
    const color = effect.color;
    const bp = audio.beatPulse || 0;
    const cx = W / 2, cy = 60;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    // Ball itself
    const ballGrad = ctx.createRadialGradient(cx, cy, 3, cx, cy, 45);
    ballGrad.addColorStop(0, rgba('#ffffff', 0.7 * intensity));
    ballGrad.addColorStop(0.4, rgba('#dddddd', 0.4 * intensity));
    ballGrad.addColorStop(0.7, rgba('#999999', 0.2 * intensity));
    ballGrad.addColorStop(1, rgba('#444444', 0.05 * intensity));
    ctx.beginPath();
    ctx.arc(cx, cy, 40, 0, Math.PI * 2);
    ctx.fillStyle = ballGrad;
    ctx.fill();

    // Hanging wire
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, cy - 40);
    ctx.strokeStyle = rgba('#888888', 0.5 * intensity);
    ctx.lineWidth = 2;
    ctx.stroke();

    // Light dots - reduced rings for performance
    const rotSpeed = t * speed * 0.6;
    const rgb = hexToRgb(color);

    for (let ring = 0; ring < 5; ring++) {
      const dotsInRing = 6 + ring * 4;
      for (let i = 0; i < dotsInRing; i++) {
        const angle = (i / dotsInRing) * Math.PI * 2 + rotSpeed * (1 + ring * 0.15);
        const dist = 180 + ring * 200 + (audio.bass + bp * 0.3) * 250 * intensity;
        const dx = Math.cos(angle) * dist;
        const dy = Math.abs(Math.sin(angle)) * dist * 0.65 + 80 + ring * 35;
        const dotX = cx + dx;
        const dotY = cy + dy;

        if (dotY > H + 50 || dotX < -100 || dotX > W + 100) continue;

        const dotSize = 4 + audio.volume * 8 * intensity + bp * 4;
        const alpha = (0.35 + audio.volume * 0.4 + bp * 0.25) * intensity;

        // Outer glow (manual - no shadowBlur)
        ctx.beginPath();
        ctx.arc(dotX, dotY, dotSize * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha * 0.15})`;
        ctx.fill();

        // Core dot
        ctx.beginPath();
        ctx.arc(dotX, dotY, dotSize, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
        ctx.fill();

        // White center
        ctx.beginPath();
        ctx.arc(dotX, dotY, dotSize * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${alpha * 0.5})`;
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // ═══════════════════ PULSE RING ═══════════════════
  function renderPulsering(ctx, effect, audio, t) {
    if (!effect.enabled) return;
    const intensity = effect.intensity;
    const speed = effect.speed;
    const color = effect.color;
    const bp = audio.beatPulse || 0;

    if (audio.beat) {
      pulseRings.push({ r: 30, maxR: 1000, alpha: 0.9 * intensity, speed: 4 + speed * 5 });
    }

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    for (let i = pulseRings.length - 1; i >= 0; i--) {
      const ring = pulseRings[i];
      ring.r += ring.speed * (1 + audio.mid * 0.5);
      ring.alpha *= 0.95;

      if (ring.alpha < 0.01 || ring.r > ring.maxR) { pulseRings.splice(i, 1); continue; }

      // Double stroke for glow effect (no shadowBlur)
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, ring.r, 0, Math.PI * 2);
      ctx.strokeStyle = rgba(color, ring.alpha * 0.3);
      ctx.lineWidth = Math.max(1, 10 * ring.alpha * intensity);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(W / 2, H / 2, ring.r, 0, Math.PI * 2);
      ctx.strokeStyle = rgba(color, ring.alpha);
      ctx.lineWidth = Math.max(1, 3 * ring.alpha * intensity);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ═══════════════════ CONFETTI ═══════════════════
  function renderConfetti(ctx, effect, audio, t) {
    if (!effect.enabled) return;
    const intensity = effect.intensity;
    const speed = effect.speed;
    const maxConfetti = Math.floor(80 * intensity);

    const spawnCount = audio.beat ? 6 : (Math.random() < 0.3 + audio.volume * 0.5 ? 2 : 0);
    for (let i = 0; i < spawnCount && confettiPool.length < maxConfetti; i++) {
      confettiPool.push({
        x: Math.random() * W, y: -10,
        vx: (Math.random() - 0.5) * 4, vy: 1.5 + Math.random() * 2.5 * speed,
        rot: Math.random() * Math.PI * 2, rotSpeed: (Math.random() - 0.5) * 0.25,
        w: 5 + Math.random() * 10, h: 4 + Math.random() * 6,
        color: hsl(Math.random() * 360, 90, 60, 1), life: 1
      });
    }

    ctx.save();
    for (let i = confettiPool.length - 1; i >= 0; i--) {
      const c = confettiPool[i];
      c.x += c.vx; c.y += c.vy; c.rot += c.rotSpeed;
      c.vx += (Math.random() - 0.5) * 0.15;
      if (c.y > H + 20) { confettiPool.splice(i, 1); continue; }

      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rot);
      ctx.fillStyle = c.color;
      ctx.globalAlpha = 0.85 * intensity;
      ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
      ctx.restore();
    }
    ctx.restore();
  }

  // ═══════════════════ LIGHTNING ═══════════════════
  let lightningBolts = [];
  function renderLightning(ctx, effect, audio, t) {
    if (!effect.enabled) return;
    const intensity = effect.intensity;
    const color = effect.color;

    if (audio.beat) {
      const startX = W * (0.1 + Math.random() * 0.8);
      const bolt = { points: [{ x: startX, y: 0 }], alpha: 1.0, life: 8 };
      let bx = startX, by = 0;
      while (by < H) {
        bx += (Math.random() - 0.5) * 140;
        by += 25 + Math.random() * 55;
        bolt.points.push({ x: bx, y: Math.min(by, H), branch: false });
        if (Math.random() < 0.3) {
          let bbx = bx, bby = by;
          const branchLen = 2 + Math.floor(Math.random() * 5);
          for (let b = 0; b < branchLen; b++) {
            bbx += (Math.random() - 0.5) * 100;
            bby += 15 + Math.random() * 35;
            bolt.points.push({ x: bbx, y: Math.min(bby, H), branch: true });
          }
          bolt.points.push({ x: bx, y: Math.min(by, H), branch: false });
        }
      }
      lightningBolts.push(bolt);
    }

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (let i = lightningBolts.length - 1; i >= 0; i--) {
      const bolt = lightningBolts[i];
      bolt.life--;
      bolt.alpha *= 0.65;
      if (bolt.life <= 0) { lightningBolts.splice(i, 1); continue; }

      // Wide glow (manual - no shadowBlur)
      ctx.beginPath();
      let started = false;
      for (const pt of bolt.points) {
        if (pt.branch) { ctx.moveTo(pt.x, pt.y); started = true; }
        else if (!started) { ctx.moveTo(pt.x, pt.y); started = true; }
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.strokeStyle = rgba(color, bolt.alpha * 0.3 * intensity);
      ctx.lineWidth = 24;
      ctx.stroke();

      // Medium glow
      ctx.beginPath();
      started = false;
      for (const pt of bolt.points) {
        if (pt.branch) { ctx.moveTo(pt.x, pt.y); started = true; }
        else if (!started) { ctx.moveTo(pt.x, pt.y); started = true; }
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.strokeStyle = rgba(color, bolt.alpha * 0.5 * intensity);
      ctx.lineWidth = 8;
      ctx.stroke();

      // Core
      ctx.beginPath();
      started = false;
      for (const pt of bolt.points) {
        if (pt.branch) { ctx.moveTo(pt.x, pt.y); started = true; }
        else if (!started) { ctx.moveTo(pt.x, pt.y); started = true; }
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.strokeStyle = rgba('#ffffff', bolt.alpha * intensity);
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
  }

  // ═══════════════════ SMOKE ═══════════════════
  function renderSmoke(ctx, effect, audio, t) {
    if (!effect.enabled) return;
    const intensity = effect.intensity;
    const speed = effect.speed;
    const color = effect.color;
    const bp = audio.beatPulse || 0;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    for (let i = 0; i < 10; i++) {
      const phase = i * 1.6;
      const x = ((Math.sin(t * speed * 0.07 + phase) + 1) / 2) * W;
      const y = H - 50 - Math.sin(t * speed * 0.1 + phase) * 300 - i * 35;
      const size = 320 + i * 80 + audio.volume * 250 * intensity + bp * 100;
      const alpha = (0.08 + audio.bass * 0.07 + bp * 0.04) * intensity;

      const grad = ctx.createRadialGradient(x, y, 0, x, y, size);
      grad.addColorStop(0, rgba(color, alpha * 2.5));
      grad.addColorStop(0.25, rgba(color, alpha * 1.5));
      grad.addColorStop(0.6, rgba(color, alpha * 0.6));
      grad.addColorStop(1, rgba(color, 0));

      ctx.beginPath();
      ctx.ellipse(x, y, size, size * 0.45, Math.sin(t * 0.08 + i) * 0.25, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    }
    ctx.restore();
  }

  // ═══════════════════ MAIN RENDER ═══════════════════
  function render(ctx, effects, audio, t) {
    const effectMap = {
      colorwash: renderColorwash,
      fog: renderFog,
      smoke: renderSmoke,
      lightbeam: renderLightbeam,
      spotlight: renderSpotlight,
      mirrorball: renderMirrorball,
      laser: renderLaser,
      particles: renderParticles,
      pulsering: renderPulsering,
      equalizer: renderEqualizer,
      confetti: renderConfetti,
      lightning: renderLightning,
      strobe: renderStrobe,
    };

    const renderOrder = ['colorwash', 'fog', 'smoke', 'lightbeam', 'spotlight', 'mirrorball', 'laser', 'particles', 'pulsering', 'equalizer', 'confetti', 'lightning', 'strobe'];

    for (const id of renderOrder) {
      const effect = effects.find(e => e.id === id);
      if (effect && effectMap[id]) {
        effectMap[id](ctx, effect, audio, t);
      }
    }
  }

  return { render };
})();
