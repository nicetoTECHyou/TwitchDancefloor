// ═══════════════════════════════════════════════════════════════
// TwitchDancefloor - Admin Panel Logic v2
// With audio source selector + level meters
// ═══════════════════════════════════════════════════════════════
(function () {
  let effects = [];
  let commands = [];
  let channelConfig = { channelName: '', connected: false };
  let chatMessages = [];
  let audioConnected = false;

  // ── Connect ──
  OverlaySocket.connect();

  OverlaySocket.on('connected', (state) => {
    const el = document.getElementById('ws-status');
    el.querySelector('.status-dot').classList.toggle('connected', state);
    el.querySelector('.status-text').textContent = state ? 'Verbunden' : 'Getrennt';
  });

  OverlaySocket.on('effects-state', (data) => { effects = data; renderEffects(); });
  OverlaySocket.on('effect-update', (data) => {
    const idx = effects.findIndex(e => e.id === data.id);
    if (idx !== -1) effects[idx] = data; else effects.push(data);
    renderEffects();
  });

  OverlaySocket.on('commands-state', (data) => { commands = data; renderCommands(); populateEffectDropdown(); });

  OverlaySocket.on('channel-status', (data) => {
    channelConfig = data;
    updateChannelUI();
  });

  OverlaySocket.on('audio-data', (data) => { updateLevelMeters(data); });

  OverlaySocket.on('chat-message', (msg) => {
    chatMessages.push(msg);
    if (chatMessages.length > 100) chatMessages.shift();
    renderChatLog();
  });

  OverlaySocket.on('chat-trigger', (data) => {
    chatMessages.push({ username: '⚡ System', content: `${data.username} triggered ${data.command} → ${data.effectName}`, timestamp: Date.now(), isSystem: true });
    if (chatMessages.length > 100) chatMessages.shift();
    renderChatLog();
  });

  // ── Navigation ──
  document.querySelectorAll('.nav-btn[data-panel]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('panel-' + btn.dataset.panel).classList.add('active');
    });
  });

  // ═══════════════════ AUDIO SOURCE ═══════════════════
  const btnMic = document.getElementById('btn-audio-mic');
  const btnDesktop = document.getElementById('btn-audio-desktop');
  const btnFile = document.getElementById('btn-audio-file');
  const fileInput = document.getElementById('audio-file-input');
  const audioDot = document.getElementById('audio-dot');
  const audioStatusText = document.getElementById('audio-status-text');
  const sensSlider = document.getElementById('admin-sensitivity');
  const sensValue = document.getElementById('sens-value');

  // These buttons tell the overlay (via WebSocket) to connect audio
  // The overlay page actually does the audio connection since it has the canvas
  btnMic.addEventListener('click', () => {
    OverlaySocket.emit('audio-command', { source: 'mic' });
    updateAudioStatus(true, 'Mikrofon');
  });

  btnDesktop.addEventListener('click', () => {
    OverlaySocket.emit('audio-command', { source: 'desktop' });
    updateAudioStatus(true, 'Desktop Audio');
  });

  btnFile.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    // We can't send files via WebSocket easily, so we'll need to handle this in overlay
    // For now, tell the user to use the overlay's file picker
    OverlaySocket.emit('audio-command', { source: 'file', fileName: e.target.files[0]?.name || '' });
    updateAudioStatus(true, 'Datei: ' + (e.target.files[0]?.name || '?'));
  });

  sensSlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    sensValue.textContent = val.toFixed(1);
    OverlaySocket.emit('audio-command', { sensitivity: val });
  });

  function updateAudioStatus(connected, source) {
    audioConnected = connected;
    audioDot.classList.toggle('connected', connected);
    audioStatusText.textContent = connected ? `Verbunden: ${source}` : 'Keine Audio-Quelle verbunden';
  }

  // ═══════════════════ LEVEL METERS ═══════════════════
  function updateLevelMeters(data) {
    // Level bars
    const bars = { bass: data.bass, mid: data.mid, high: data.high, vol: data.volume };
    for (const [key, val] of Object.entries(bars)) {
      const fill = document.getElementById('level-' + key);
      const valEl = document.getElementById('val-' + key);
      if (fill) fill.style.width = Math.round(val * 100) + '%';
      if (valEl) valEl.textContent = Math.round(val * 100) + '%';
    }

    // Header meters
    const meters = { 'meter-bass': data.bass, 'meter-mid': data.mid, 'meter-high': data.high, 'meter-vol': data.volume };
    for (const [id, val] of Object.entries(meters)) {
      const bar = document.getElementById(id);
      if (bar) {
        const h = Math.max(4, val * 28);
        bar.style.height = h + 'px';
        bar.classList.toggle('active', val > 0.3);
      }
    }

    // Beat indicator
    const beatDot = document.getElementById('admin-beat-dot');
    if (beatDot) beatDot.classList.toggle('active', data.beat);

    // BPM
    const bpm = data.bpm || 0;
    const bpmEl = document.getElementById('admin-bpm');
    const headerBpm = document.getElementById('bpm-display');
    const bpmText = bpm > 0 ? bpm + ' BPM' : '-- BPM';
    if (bpmEl) bpmEl.textContent = bpmText;
    if (headerBpm) headerBpm.textContent = bpmText;

    // Audio connected status from data
    if (data.volume > 0.01) {
      audioDot.classList.add('connected');
    }
  }

  // ═══════════════════ EFFECTS ═══════════════════
  function renderEffects() {
    const categories = { light: 'grid-light', atmosphere: 'grid-atmosphere', visual: 'grid-visual' };
    for (const [cat, gridId] of Object.entries(categories)) {
      const grid = document.getElementById(gridId);
      const catEffects = effects.filter(e => e.category === cat);
      grid.innerHTML = catEffects.map(e => effectCardHTML(e)).join('');
      catEffects.forEach(e => bindEffectEvents(e.id, grid));
    }
  }

  function effectCardHTML(e) {
    return `
      <div class="effect-card ${e.enabled ? 'active' : ''}" data-effect-id="${e.id}">
        <div class="effect-header">
          <span class="effect-name">${e.name}</span>
          <label class="toggle">
            <input type="checkbox" ${e.enabled ? 'checked' : ''} data-toggle="${e.id}">
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="effect-controls">
          <div class="control-row">
            <span class="control-label">Intensität</span>
            <input type="range" min="0" max="1" step="0.05" value="${e.intensity}" data-slider="${e.id}-intensity">
            <span class="control-value" data-value="${e.id}-intensity">${e.intensity.toFixed(2)}</span>
          </div>
          <div class="control-row">
            <span class="control-label">Geschw.</span>
            <input type="range" min="0.1" max="3" step="0.1" value="${e.speed}" data-slider="${e.id}-speed">
            <span class="control-value" data-value="${e.id}-speed">${e.speed.toFixed(1)}</span>
          </div>
          <div class="control-row">
            <span class="control-label">Farbe</span>
            <input type="color" value="${e.color}" data-color="${e.id}">
          </div>
          <button class="btn-flash" data-flash="${e.id}">⚡ Flash (2s)</button>
        </div>
      </div>`;
  }

  function bindEffectEvents(id, container) {
    const toggle = container.querySelector(`[data-toggle="${id}"]`);
    if (toggle) toggle.addEventListener('change', (e) => {
      OverlaySocket.emit('toggle-effect', { id, enabled: e.target.checked });
      container.querySelector(`[data-effect-id="${id}"]`).classList.toggle('active', e.target.checked);
    });

    const intSlider = container.querySelector(`[data-slider="${id}-intensity"]`);
    if (intSlider) intSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      container.querySelector(`[data-value="${id}-intensity"]`).textContent = val.toFixed(2);
      OverlaySocket.emit('update-effect', { id, intensity: val });
    });

    const spdSlider = container.querySelector(`[data-slider="${id}-speed"]`);
    if (spdSlider) spdSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      container.querySelector(`[data-value="${id}-speed"]`).textContent = val.toFixed(1);
      OverlaySocket.emit('update-effect', { id, speed: val });
    });

    const colorPicker = container.querySelector(`[data-color="${id}"]`);
    if (colorPicker) colorPicker.addEventListener('input', (e) => {
      OverlaySocket.emit('update-effect', { id, color: e.target.value });
    });

    const flashBtn = container.querySelector(`[data-flash="${id}"]`);
    if (flashBtn) flashBtn.addEventListener('click', () => {
      OverlaySocket.emit('trigger-effect', { effectId: id, action: 'on' });
      setTimeout(() => OverlaySocket.emit('trigger-effect', { effectId: id, action: 'off' }), 2000);
    });
  }

  // ═══════════════════ SCENES ═══════════════════
  document.querySelectorAll('.scene-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const sceneName = btn.dataset.scene;
      if (sceneName === 'blackout') {
        OverlaySocket.emit('apply-scene', effects.map(e => ({ id: e.id, enabled: false })));
      } else if (sceneName === 'party') {
        OverlaySocket.emit('apply-scene', effects.map(e => ({ id: e.id, enabled: true, intensity: 0.5 })));
      } else {
        const sceneEffects = {
          club: [
            { id: 'laser', enabled: true, intensity: 0.8 }, { id: 'spotlight', enabled: true, intensity: 0.7 },
            { id: 'mirrorball', enabled: true, intensity: 0.7 }, { id: 'fog', enabled: true, intensity: 0.5 },
            { id: 'equalizer', enabled: true, intensity: 0.8 }, { id: 'colorwash', enabled: true, intensity: 0.3 },
            { id: 'dancers', enabled: true, intensity: 0.6 },
          ],
          rave: [
            { id: 'strobe', enabled: true, intensity: 0.7 }, { id: 'laser', enabled: true, intensity: 0.9 },
            { id: 'particles', enabled: true, intensity: 0.7 }, { id: 'colorwash', enabled: true, intensity: 0.6 },
            { id: 'confetti', enabled: true, intensity: 0.6 }, { id: 'lightning', enabled: true, intensity: 0.7 },
            { id: 'dancers', enabled: true, intensity: 0.7 },
          ],
          chill: [
            { id: 'colorwash', enabled: true, intensity: 0.3 }, { id: 'fog', enabled: true, intensity: 0.4 },
            { id: 'lightbeam', enabled: true, intensity: 0.5 }, { id: 'smoke', enabled: true, intensity: 0.4 },
            { id: 'mirrorball', enabled: true, intensity: 0.3 },
          ],
        };
        const allOff = effects.map(e => ({ id: e.id, enabled: false }));
        OverlaySocket.emit('apply-scene', [...allOff, ...(sceneEffects[sceneName] || [])]);
      }
    });
  });

  // ═══════════════════ COMMANDS ═══════════════════
  function populateEffectDropdown() {
    const sel = document.getElementById('cmd-effect');
    sel.innerHTML = '<option value="">Effekt wählen...</option>' +
      effects.map(e => `<option value="${e.id}">${e.name}</option>`).join('');
  }

  document.getElementById('btn-add-command').addEventListener('click', () => {
    const effectId = document.getElementById('cmd-effect').value;
    const command = document.getElementById('cmd-command').value.trim();
    const action = document.getElementById('cmd-action').value;
    const cooldown = parseInt(document.getElementById('cmd-cooldown').value) || 5;

    if (!effectId || !command) return;
    if (!command.startsWith('!')) return;

    const cmd = {
      id: 'cmd_' + Date.now(),
      command: command.toLowerCase(),
      effectId, action, cooldown,
      description: `${command} → ${effects.find(e => e.id === effectId)?.name || effectId} (${action})`
    };

    OverlaySocket.emit('add-command', cmd);
    document.getElementById('cmd-command').value = '';
  });

  function renderCommands() {
    const list = document.getElementById('command-list');
    if (commands.length === 0) {
      list.innerHTML = '<p class="empty-msg">Noch keine Commands definiert</p>';
      return;
    }
    list.innerHTML = commands.map(cmd => {
      const eff = effects.find(e => e.id === cmd.effectId);
      return `<div class="command-item" data-cmd-id="${cmd.id}">
        <span class="cmd-name">${cmd.command}</span>
        <span class="cmd-effect">→ ${eff?.name || cmd.effectId}</span>
        <span class="cmd-action">${cmd.action}</span>
        <span class="cmd-cooldown">${cmd.cooldown}s</span>
        <button class="btn-remove" data-remove-cmd="${cmd.id}">✕</button>
      </div>`;
    }).join('');

    list.querySelectorAll('[data-remove-cmd]').forEach(btn => {
      btn.addEventListener('click', () => OverlaySocket.emit('remove-command', btn.dataset.removeCmd));
    });
  }

  // ═══════════════════ CHANNEL ═══════════════════
  document.getElementById('btn-connect-channel').addEventListener('click', () => {
    const name = document.getElementById('channel-name').value.trim();
    if (!name) return;
    OverlaySocket.emit('connect-channel', { channelName: name, platform: 'twitch' });
  });

  document.getElementById('btn-disconnect-channel').addEventListener('click', () => {
    OverlaySocket.emit('disconnect-channel', {});
  });

  function updateChannelUI() {
    const dot = document.querySelector('.ch-dot');
    const statusText = document.querySelector('.channel-status span:last-child');
    const btnConnect = document.getElementById('btn-connect-channel');
    const btnDisconnect = document.getElementById('btn-disconnect-channel');

    dot.classList.toggle('connected', channelConfig.connected);
    statusText.textContent = channelConfig.connected ? `Verbunden mit #${channelConfig.channelName}` : 'Nicht verbunden';
    btnConnect.disabled = channelConfig.connected;
    btnDisconnect.disabled = !channelConfig.connected;
  }

  // ═══════════════════ CHAT LOG ═══════════════════
  function renderChatLog() {
    const log = document.getElementById('chat-log');
    log.innerHTML = chatMessages.map(msg => {
      if (msg.isSystem) return `<div class="chat-msg system">${msg.content}</div>`;
      return `<div class="chat-msg"><span class="username">${msg.username}:</span> <span class="content">${msg.content}</span></div>`;
    }).join('');
    log.scrollTop = log.scrollHeight;
  }
})();
