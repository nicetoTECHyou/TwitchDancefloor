// ═══════════════════════════════════════════════════════════════
// TwitchDancefloor v0.0.5 - Standalone Server
// OBS Music Reactive Light Show Overlay
// Audio data flows: Admin -> Server -> Overlay
// ═══════════════════════════════════════════════════════════════

const http = require('http');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');
const WebSocket = require('ws');

const PORT = 3131;
const PUBLIC_DIR = path.join(__dirname, 'public');

// ═══════════════════════ DEFAULT EFFECTS ═══════════════════════
const defaultEffects = [
  { id: 'laser', name: 'Laser', category: 'light', enabled: false, intensity: 0.7, speed: 1.0, color: '#00ff88' },
  { id: 'spotlight', name: 'Scheinwerfer', category: 'light', enabled: false, intensity: 0.6, speed: 0.8, color: '#ffffff' },
  { id: 'fog', name: 'Nebel', category: 'atmosphere', enabled: false, intensity: 0.5, speed: 0.5, color: '#88ccff' },
  { id: 'strobe', name: 'Stroboskop', category: 'light', enabled: false, intensity: 0.8, speed: 2.0, color: '#ffffff' },
  { id: 'lightbeam', name: 'Lichtkegel', category: 'light', enabled: false, intensity: 0.6, speed: 0.7, color: '#ffaa00' },
  { id: 'particles', name: 'Partikel', category: 'atmosphere', enabled: false, intensity: 0.5, speed: 1.0, color: '#ff00ff' },
  { id: 'equalizer', name: 'Equalizer', category: 'visual', enabled: false, intensity: 0.7, speed: 1.0, color: '#00ffff' },
  { id: 'dancers', name: 'Taenzer', category: 'visual', enabled: false, intensity: 0.6, speed: 1.0, color: '#ff4488' },
  { id: 'colorwash', name: 'Farbflut', category: 'atmosphere', enabled: false, intensity: 0.4, speed: 0.5, color: '#ff0066' },
  { id: 'mirrorball', name: 'Spiegelkugel', category: 'light', enabled: false, intensity: 0.6, speed: 1.0, color: '#ffffff' },
  { id: 'pulsering', name: 'Puls-Ring', category: 'visual', enabled: false, intensity: 0.7, speed: 1.0, color: '#00ff00' },
  { id: 'confetti', name: 'Konfetti', category: 'visual', enabled: false, intensity: 0.5, speed: 1.0, color: '#ffff00' },
  { id: 'lightning', name: 'Blitze', category: 'light', enabled: false, intensity: 0.8, speed: 1.5, color: '#aaccff' },
  { id: 'smoke', name: 'Rauch', category: 'atmosphere', enabled: false, intensity: 0.4, speed: 0.3, color: '#666666' },
];

// ═══════════════════════ STATE ═══════════════════════
let effects = JSON.parse(JSON.stringify(defaultEffects));
let commands = [];
let channelConfig = { channelName: '', platform: 'twitch', connected: false };
let audioData = { bass: 0, mid: 0, high: 0, volume: 0, beat: false, beatPulse: 0, bpm: 120, eqBands: [] };
const commandCooldowns = new Map();
let twitchWs = null;

// ═══════════════════════ STATIC FILE SERVER ═══════════════════════
const MIME_TYPES = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.gif': 'image/gif',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.json': 'application/json',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
};

function serveStatic(req, res) {
  let filePath = path.join(PUBLIC_DIR, req.url === '/' ? 'admin.html' : req.url);
  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end('<h1>404 - Not Found</h1>');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType + '; charset=utf-8' });
    res.end(data);
  });
}

// ═══════════════════════ TWITCH IRC ═══════════════════════
function connectTwitch(channelName) {
  disconnectTwitch();
  try {
    const nick = 'justinfan' + Math.floor(Math.random() * 90000 + 10000);
    const ws = new WebSocket('wss://irc-ws.chat.twitch.tv:443');

    ws.on('open', () => {
      ws.send('CAP REQ :twitch.tv/tags twitch.tv/commands');
      ws.send('PASS SCHMOOPIIE');
      ws.send('NICK ' + nick);
      ws.send('JOIN #' + channelName.toLowerCase());
      channelConfig = { channelName, platform: 'twitch', connected: true };
      io.emit('channel-status', channelConfig);
      console.log('[Twitch] Connected to #' + channelName);
    });

    ws.on('message', (data) => {
      const lines = data.toString().split('\r\n');
      for (const line of lines) {
        if (!line) continue;
        if (line.startsWith('PING')) { ws.send('PONG :tmi.twitch.tv'); continue; }
        const match = line.match(/:([^!]+)!\w+@\w+\.tmi\.twitch\.tv PRIVMSG #\w+ :(.+)/);
        if (match) {
          const [, username, content] = match;
          io.emit('chat-message', { username, content: content.trim(), timestamp: Date.now() });
          processChatCommand(username, content.trim());
        }
      }
    });

    ws.on('close', () => {
      channelConfig.connected = false;
      io.emit('channel-status', channelConfig);
      console.log('[Twitch] Disconnected');
    });

    ws.on('error', (err) => {
      console.error('[Twitch] Error:', err.message);
      channelConfig.connected = false;
      io.emit('channel-status', channelConfig);
    });

    twitchWs = ws;
  } catch (err) {
    console.error('[Twitch] Failed:', err.message);
  }
}

function disconnectTwitch() {
  if (twitchWs) { twitchWs.close(); twitchWs = null; }
  channelConfig.connected = false;
  io.emit('channel-status', channelConfig);
}

function processChatCommand(username, content) {
  const now = Date.now();
  for (const cmd of commands) {
    if (content.toLowerCase() === cmd.command.toLowerCase()) {
      const lastUsed = commandCooldowns.get(cmd.command) || 0;
      if (now - lastUsed < cmd.cooldown * 1000) continue;
      commandCooldowns.set(cmd.command, now);

      const effect = effects.find(e => e.id === cmd.effectId);
      if (!effect) continue;

      if (cmd.action === 'toggle') effect.enabled = !effect.enabled;
      else if (cmd.action === 'on') effect.enabled = true;
      else if (cmd.action === 'off') effect.enabled = false;

      io.emit('effect-update', effect);
      io.emit('chat-trigger', { username, command: cmd.command, effectId: cmd.effectId, action: cmd.action, effectName: effect.name });
      console.log(`[CMD] ${username}: ${cmd.command} -> ${effect.name} (${cmd.action})`);
    }
  }
}

// ═══════════════════════ HTTP SERVER ═══════════════════════
const httpServer = http.createServer(serveStatic);

// ═══════════════════════ SOCKET.IO ═══════════════════════
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000, pingInterval: 25000,
});

io.on('connection', (socket) => {
  console.log('[WS] Client connected:', socket.id);
  socket.emit('effects-state', effects);
  socket.emit('commands-state', commands);
  socket.emit('channel-status', channelConfig);
  socket.emit('audio-data', audioData);

  // Effects
  socket.on('update-effect', (data) => {
    const idx = effects.findIndex(e => e.id === data.id);
    if (idx !== -1) { effects[idx] = { ...effects[idx], ...data }; io.emit('effect-update', effects[idx]); }
  });
  socket.on('toggle-effect', (data) => {
    const eff = effects.find(e => e.id === data.id);
    if (eff) { eff.enabled = data.enabled; io.emit('effect-update', eff); }
  });
  socket.on('set-effects', (data) => { effects = data; io.emit('effects-state', effects); });

  // Commands
  socket.on('add-command', (cmd) => { commands.push(cmd); io.emit('commands-state', commands); });
  socket.on('remove-command', (id) => { commands = commands.filter(c => c.id !== id); io.emit('commands-state', commands); });
  socket.on('update-command', (data) => {
    const idx = commands.findIndex(c => c.id === data.id);
    if (idx !== -1) { commands[idx] = { ...commands[idx], ...data }; io.emit('commands-state', commands); }
  });

  // Channel
  socket.on('connect-channel', (data) => connectTwitch(data.channelName));
  socket.on('disconnect-channel', () => disconnectTwitch());

  // Audio data - relay from admin to all other clients (overlay)
  socket.on('audio-data', (data) => {
    audioData = data;
    socket.broadcast.emit('audio-data', data);
  });

  // Manual trigger
  socket.on('trigger-effect', (data) => {
    const eff = effects.find(e => e.id === data.effectId);
    if (eff) {
      if (data.action === 'toggle') eff.enabled = !eff.enabled;
      else if (data.action === 'on') eff.enabled = true;
      else if (data.action === 'off') eff.enabled = false;
      io.emit('effect-update', eff);
    }
  });

  // Scene presets
  socket.on('apply-scene', (sceneEffects) => {
    for (const upd of sceneEffects) {
      const eff = effects.find(e => e.id === upd.id);
      if (eff) { eff.enabled = upd.enabled; eff.intensity = upd.intensity ?? eff.intensity; }
    }
    io.emit('effects-state', effects);
  });

  socket.on('disconnect', () => console.log('[WS] Client disconnected:', socket.id));
});

// ═══════════════════════ START ═══════════════════════
httpServer.listen(PORT, () => {
  console.log('');
  console.log('  TwitchDancefloor v0.0.5 - Music Reactive Light Show Overlay');
  console.log('');
  console.log('  Overlay:  http://localhost:' + PORT + '/overlay.html');
  console.log('  Admin:    http://localhost:' + PORT + '/admin.html');
  console.log('');
  console.log('  TIP: Open admin.html first, select an audio source,');
  console.log('       then add overlay.html as OBS Browser Source.');
  console.log('');
});
