// ═══════════════════════════════════════════════════════════════
// TwitchDancefloor - Visual Effects Renderer
// All the magic happens here ✨
// ═══════════════════════════════════════════════════════════════

const EffectsRenderer = (() => {
  const W = 1920, H = 1080;

  // ── Utility ──
  function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
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
    const count = Math.floor(4 + audio.bass * 6 * intensity);
    const sweepSpeed = 0.3 * speed + audio.mid * 1.5;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    for (let i = 0; i < count; i++) {
      const phase = (i / count) * Math.PI * 2;
      const angle = Math.sin(t * sweepSpeed + phase) * 0.8;
      const originSide = i % 4;
      let ox, oy, dx, dy;

      if (originSide === 0) { ox = 0; oy = H; dx = Math.cos(angle - 0.3); dy = Math.sin(angle - 1.2); }
      else if (originSide === 1) { ox = W; oy = H; dx = Math.cos(angle + 0.3 + Math.PI); dy = Math.sin(angle - 1.2); }
      else if (originSide === 2) { ox = W * 0.2; oy = 0; dx = Math.cos(angle + 0.5); dy = Math.sin(angle + 0.8); }
      else { ox = W * 0.8; oy = 0; dx = Math.cos(angle - 0.5 + Math.PI); dy = Math.sin(angle + 0.8); }

      const len = 2500;
      const ex = ox + dx * len;
      const ey = oy + dy * len;

      // Glow
      ctx.beginPath();
      ctx.moveTo(ox, oy); ctx.lineTo(ex, ey);
      ctx.strokeStyle = rgba(color, 0.15 * intensity);
      ctx.lineWidth = 12 + audio.bass * 8;
      ctx.shadowColor = color;
      ctx.shadowBlur = 30 + audio.volume * 40;
      ctx.stroke();

      // Core
      ctx.beginPath();
      ctx.moveTo(ox, oy); ctx.lineTo(ex, ey);
      ctx.strokeStyle = rgba(color, 0.8 * intensity);
      ctx.lineWidth = 1.5 + audio.bass * 1.5;
      ctx.shadowBlur = 15;
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
    const count = 3;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    for (let i = 0; i < count; i++) {
      const phase = (i / count) * Math.PI * 2;
      const centerX = W * (0.25 + i * 0.25) + Math.sin(t * speed * 0.3 + phase) * 200;
      const topX = centerX + Math.sin(t * speed * 0.2 + phase * 1.5) * 100;
      const topY = -20;
      const spread = (200 + audio.bass * 300 * intensity);
      const alpha = 0.08 * intensity + audio.mid * 0.12 * intensity;

      const grad = ctx.createRadialGradient(topX, topY, 10, centerX, H, spread);
      grad.addColorStop(0, rgba(color, alpha));
      grad.addColorStop(0.6, rgba(color, alpha * 0.3));
      grad.addColorStop(1, rgba(color, 0));

      ctx.beginPath();
      ctx.moveTo(topX, topY);
      ctx.lineTo(centerX - spread, H);
      ctx.lineTo(centerX + spread, H);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // Spotlight pool on floor
      const poolGrad = ctx.createRadialGradient(centerX, H - 30, 5, centerX, H - 30, spread * 0.6);
      poolGrad.addColorStop(0, rgba(color, alpha * 1.5));
      poolGrad.addColorStop(1, rgba(color, 0));
      ctx.beginPath();
      ctx.ellipse(centerX, H - 30, spread * 0.6, 40, 0, 0, Math.PI * 2);
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

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    for (let i = 0; i < 8; i++) {
      const y = H * 0.5 + Math.sin(t * speed * 0.15 + i * 1.2) * H * 0.25;
      const x = ((t * speed * 40 + i * 300) % (W + 600)) - 300;
      const size = 300 + i * 50 + audio.volume * 200 * intensity;
      const alpha = (0.03 + audio.volume * 0.04) * intensity;

      const grad = ctx.createRadialGradient(x, y, 0, x, y, size);
      grad.addColorStop(0, rgba(color, alpha));
      grad.addColorStop(0.5, rgba(color, alpha * 0.4));
      grad.addColorStop(1, rgba(color, 0));

      ctx.beginPath();
      ctx.ellipse(x, y, size, size * 0.4, 0, 0, Math.PI * 2);
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

    const freq = speed * 3;
    const flash = Math.sin(t * freq * Math.PI * 2) > 0.85 - audio.bass * 0.4;

    if (flash) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = rgba(color, 0.4 * intensity + audio.bass * 0.3);
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

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    for (let i = 0; i < 5; i++) {
      const phase = i * Math.PI * 2 / 5;
      const topX = W * (0.1 + i * 0.2);
      const sway = Math.sin(t * speed * 0.4 + phase) * 150;
      const alpha = (0.06 + audio.bass * 0.1) * intensity;
      const topW = 8;
      const botW = 120 + audio.bass * 160 * intensity;

      ctx.beginPath();
      ctx.moveTo(topX + sway - topW, 0);
      ctx.lineTo(topX + sway + topW, 0);
      ctx.lineTo(topX + sway * 2 + botW, H);
      ctx.lineTo(topX + sway * 2 - botW, H);
      ctx.closePath();

      const grad = ctx.createLinearGradient(topX + sway, 0, topX + sway * 2, H);
      grad.addColorStop(0, rgba(color, alpha));
      grad.addColorStop(0.5, rgba(color, alpha * 0.5));
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
    const maxParticles = Math.floor(80 * intensity);

    // Spawn
    const spawnRate = 2 + audio.volume * 8 * intensity;
    for (let i = 0; i < spawnRate && particlePool.length < maxParticles; i++) {
      particlePool.push({
        x: Math.random() * W, y: H + 10,
        vx: (Math.random() - 0.5) * 2 * speed,
        vy: -(1 + Math.random() * 3) * speed,
        size: 1 + Math.random() * 3,
        life: 1, decay: 0.003 + Math.random() * 0.005,
        hue: Math.random() * 60
      });
    }

    // Burst on beat
    if (audio.beat) {
      for (let i = 0; i < 20; i++) {
        if (particlePool.length < maxParticles + 40) {
          particlePool.push({
            x: W * 0.3 + Math.random() * W * 0.4, y: H * 0.5 + Math.random() * H * 0.3,
            vx: (Math.random() - 0.5) * 8, vy: -Math.random() * 6,
            size: 2 + Math.random() * 3, life: 1, decay: 0.01 + Math.random() * 0.01,
            hue: Math.random() * 360
          });
        }
      }
    }

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    for (let i = particlePool.length - 1; i >= 0; i--) {
      const p = particlePool[i];
      p.x += p.vx; p.y += p.vy;
      p.vy -= 0.02; p.life -= p.decay;
      if (p.life <= 0) { particlePool.splice(i, 1); continue; }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fillStyle = rgba(color, p.life * 0.8 * intensity);
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.fill();
    }
    ctx.restore();
  }

  // ═══════════════════ EQUALIZER ═══════════════════
  function renderEqualizer(ctx, effect, audio, t) {
    if (!effect.enabled) return;
    const intensity = effect.intensity;
    const color = effect.color;
    const barCount = 48;
    const barW = W / barCount * 0.7;
    const gap = W / barCount * 0.3;
    const maxH = 250 * intensity;

    if (!audio.frequencies || audio.frequencies.length === 0) return;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    for (let i = 0; i < barCount; i++) {
      const freqIdx = Math.floor((i / barCount) * (audio.frequencies.length * 0.5));
      const val = (audio.frequencies[freqIdx] || 0) / 255;
      const barH = val * maxH + 4;
      const x = i * (barW + gap) + gap / 2;
      const y = H - barH;

      // Bar gradient
      const grad = ctx.createLinearGradient(x, H, x, y);
      grad.addColorStop(0, rgba(color, 0.8 * intensity));
      grad.addColorStop(0.5, rgba(color, 0.5 * intensity));
      grad.addColorStop(1, rgba(color, 0.2 * intensity));

      ctx.fillStyle = grad;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      // Rounded top
      const r = Math.min(barW / 2, 3);
      ctx.beginPath();
      ctx.moveTo(x, H);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.lineTo(x + barW - r, y);
      ctx.quadraticCurveTo(x + barW, y, x + barW, y + r);
      ctx.lineTo(x + barW, H);
      ctx.fill();

      // Reflection
      const refGrad = ctx.createLinearGradient(x, H, x, H + barH * 0.3);
      refGrad.addColorStop(0, rgba(color, 0.15 * intensity));
      refGrad.addColorStop(1, rgba(color, 0));
      ctx.fillStyle = refGrad;
      ctx.shadowBlur = 0;
      ctx.fillRect(x, H, barW, barH * 0.3);
    }
    ctx.restore();
  }

  // ═══════════════════ COLOR WASH ═══════════════════
  function renderColorwash(ctx, effect, audio, t) {
    if (!effect.enabled) return;
    const intensity = effect.intensity;
    const speed = effect.speed;
    const hue = (t * speed * 30) % 360;

    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, hsl(hue, 80, 50, (0.08 + audio.bass * 0.1) * intensity));
    grad.addColorStop(0.5, hsl((hue + 120) % 360, 80, 50, (0.06 + audio.mid * 0.08) * intensity));
    grad.addColorStop(1, hsl((hue + 240) % 360, 80, 50, (0.08 + audio.bass * 0.1) * intensity));
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
    const cx = W / 2, cy = 80;
    const dotCount = 30;
    const rotSpeed = t * speed * 0.5;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    // Ball itself
    const ballGrad = ctx.createRadialGradient(cx, cy, 5, cx, cy, 30);
    ballGrad.addColorStop(0, rgba('#cccccc', 0.4 * intensity));
    ballGrad.addColorStop(1, rgba('#444444', 0.1 * intensity));
    ctx.beginPath();
    ctx.arc(cx, cy, 25, 0, Math.PI * 2);
    ctx.fillStyle = ballGrad;
    ctx.fill();

    // Reflections
    for (let i = 0; i < dotCount; i++) {
      const angle = (i / dotCount) * Math.PI * 2 + rotSpeed;
      const ring = Math.floor(i / 10);
      const dist = 200 + ring * 200 + audio.bass * 200 * intensity;
      const dx = Math.cos(angle) * dist;
      const dy = Math.abs(Math.sin(angle)) * dist * 0.7 + 100;
      const dotX = cx + dx;
      const dotY = cy + dy;
      if (dotY > H || dotX < -50 || dotX > W + 50) continue;

      const dotSize = 3 + audio.volume * 6 * intensity;
      const alpha = (0.2 + audio.volume * 0.4) * intensity;

      ctx.beginPath();
      ctx.arc(dotX, dotY, dotSize, 0, Math.PI * 2);
      ctx.fillStyle = rgba(color, alpha);
      ctx.shadowColor = color;
      ctx.shadowBlur = 15;
      ctx.fill();
    }
    ctx.restore();
  }

  // ═══════════════════ PULSE RING ═══════════════════
  function renderPulsering(ctx, effect, audio, t) {
    if (!effect.enabled) return;
    const intensity = effect.intensity;
    const speed = effect.speed;
    const color = effect.color;

    if (audio.beat) {
      pulseRings.push({ r: 50, maxR: 600 + audio.bass * 400, alpha: 0.8 * intensity, speed: 3 + speed * 4 });
    }

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    for (let i = pulseRings.length - 1; i >= 0; i--) {
      const ring = pulseRings[i];
      ring.r += ring.speed * (1 + audio.mid);
      ring.alpha *= 0.96;

      if (ring.alpha < 0.01 || ring.r > ring.maxR) { pulseRings.splice(i, 1); continue; }

      ctx.beginPath();
      ctx.arc(W / 2, H / 2, ring.r, 0, Math.PI * 2);
      ctx.strokeStyle = rgba(color, ring.alpha);
      ctx.lineWidth = 3 * ring.alpha * intensity;
      ctx.shadowColor = color;
      ctx.shadowBlur = 20;
      ctx.stroke();
    }
    ctx.restore();
  }

  // ═══════════════════ CONFETTI ═══════════════════
  function renderConfetti(ctx, effect, audio, t) {
    if (!effect.enabled) return;
    const intensity = effect.intensity;
    const speed = effect.speed;
    const maxConfetti = Math.floor(60 * intensity);

    // Spawn
    if (Math.random() < 0.3 + audio.volume * 0.5) {
      for (let i = 0; i < 2 && confettiPool.length < maxConfetti; i++) {
        confettiPool.push({
          x: Math.random() * W, y: -10,
          vx: (Math.random() - 0.5) * 3, vy: 1 + Math.random() * 2 * speed,
          rot: Math.random() * Math.PI * 2, rotSpeed: (Math.random() - 0.5) * 0.2,
          w: 4 + Math.random() * 8, h: 3 + Math.random() * 5,
          color: hsl(Math.random() * 360, 90, 60, 1), life: 1
        });
      }
    }

    ctx.save();
    for (let i = confettiPool.length - 1; i >= 0; i--) {
      const c = confettiPool[i];
      c.x += c.vx; c.y += c.vy; c.rot += c.rotSpeed;
      c.vx += (Math.random() - 0.5) * 0.1;
      if (c.y > H + 20) { confettiPool.splice(i, 1); continue; }

      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rot);
      ctx.fillStyle = c.color;
      ctx.globalAlpha = 0.8 * intensity;
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

    if (audio.beat && Math.random() < 0.6) {
      const startX = W * (0.2 + Math.random() * 0.6);
      const bolt = { points: [{ x: startX, y: 0 }], alpha: 1.0, life: 4 };
      let cx = startX, cy = 0;
      while (cy < H) {
        cx += (Math.random() - 0.5) * 120;
        cy += 30 + Math.random() * 60;
        bolt.points.push({ x: cx, y: Math.min(cy, H) });
      }
      lightningBolts.push(bolt);
    }

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (let i = lightningBolts.length - 1; i >= 0; i--) {
      const bolt = lightningBolts[i];
      bolt.life--;
      bolt.alpha *= 0.7;
      if (bolt.life <= 0) { lightningBolts.splice(i, 1); continue; }

      // Glow
      ctx.beginPath();
      ctx.moveTo(bolt.points[0].x, bolt.points[0].y);
      for (let j = 1; j < bolt.points.length; j++) ctx.lineTo(bolt.points[j].x, bolt.points[j].y);
      ctx.strokeStyle = rgba(color, bolt.alpha * 0.3 * intensity);
      ctx.lineWidth = 8;
      ctx.shadowColor = color;
      ctx.shadowBlur = 30;
      ctx.stroke();

      // Core
      ctx.beginPath();
      ctx.moveTo(bolt.points[0].x, bolt.points[0].y);
      for (let j = 1; j < bolt.points.length; j++) ctx.lineTo(bolt.points[j].x, bolt.points[j].y);
      ctx.strokeStyle = rgba('#ffffff', bolt.alpha * 0.9 * intensity);
      ctx.lineWidth = 2;
      ctx.shadowBlur = 15;
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

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    for (let i = 0; i < 6; i++) {
      const phase = i * 1.8;
      const x = ((Math.sin(t * speed * 0.08 + phase) + 1) / 2) * W;
      const y = H - Math.sin(t * speed * 0.12 + phase) * 200 - i * 40;
      const size = 250 + i * 60 + audio.volume * 150 * intensity;
      const alpha = (0.04 + audio.bass * 0.03) * intensity;

      const grad = ctx.createRadialGradient(x, y, 0, x, y, size);
      grad.addColorStop(0, rgba(color, alpha * 1.5));
      grad.addColorStop(0.4, rgba(color, alpha));
      grad.addColorStop(1, rgba(color, 0));

      ctx.beginPath();
      ctx.ellipse(x, y, size, size * 0.5, Math.sin(t * 0.1 + i) * 0.2, 0, Math.PI * 2);
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

    // Render in specific order for layering
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
