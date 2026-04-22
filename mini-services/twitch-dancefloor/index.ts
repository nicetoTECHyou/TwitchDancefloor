import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { Server as SocketIOServer } from 'socket.io';
import WebSocket from 'ws';

const PORT = 3131;
const PUBLIC_DIR = join(__dirname, '..', '..', 'standalone', 'public');

const defaultEffects = [
  { id: 'laser', name: 'Laser', category: 'light', enabled: false, intensity: 0.7, speed: 1.0, color: '#00ff88', position: 'auto' },
  { id: 'spotlight', name: 'Scheinwerfer', category: 'light', enabled: false, intensity: 0.6, speed: 0.8, color: '#ffffff', position: 'auto' },
  { id: 'fog', name: 'Nebel', category: 'atmosphere', enabled: false, intensity: 0.5, speed: 0.5, color: '#88ccff', position: 'auto' },
  { id: 'strobe', name: 'Stroboskop', category: 'light', enabled: false, intensity: 0.8, speed: 2.0, color: '#ffffff', position: 'auto' },
  { id: 'lightbeam', name: 'Lichtkegel', category: 'light', enabled: false, intensity: 0.6, speed: 0.7, color: '#ffaa00', position: 'auto' },
  { id: 'particles', name: 'Partikel', category: 'atmosphere', enabled: false, intensity: 0.5, speed: 1.0, color: '#ff00ff', position: 'auto' },
  { id: 'equalizer', name: 'Equalizer', category: 'visual', enabled: false, intensity: 0.7, speed: 1.0, color: '#00ffff', position: 'bottom' },
  { id: 'dancers', name: 'Tänzer', category: 'visual', enabled: false, intensity: 0.6, speed: 1.0, color: '#ff4488', position: 'sides' },
  { id: 'colorwash', name: 'Farbflut', category: 'atmosphere', enabled: false, intensity: 0.4, speed: 0.5, color: '#ff0066', position: 'auto' },
  { id: 'mirrorball', name: 'Spiegelkugel', category: 'light', enabled: false, intensity: 0.6, speed: 1.0, color: '#ffffff', position: 'top' },
  { id: 'pulsering', name: 'Puls-Ring', category: 'visual', enabled: false, intensity: 0.7, speed: 1.0, color: '#00ff00', position: 'center' },
  { id: 'confetti', name: 'Konfetti', category: 'visual', enabled: false, intensity: 0.5, speed: 1.0, color: '#ffff00', position: 'auto' },
  { id: 'lightning', name: 'Blitze', category: 'light', enabled: false, intensity: 0.8, speed: 1.5, color: '#aaccff', position: 'auto' },
  { id: 'smoke', name: 'Rauch', category: 'atmosphere', enabled: false, intensity: 0.4, speed: 0.3, color: '#666666', position: 'bottom' },
];

let effects = JSON.parse(JSON.stringify(defaultEffects));
let commands = [
  { id: 'cmd1', text: '!laser', effectId: 'laser', action: 'toggle', cooldown: 10 },
  { id: 'cmd2', text: '!strobe', effectId: 'strobe', action: 'toggle', cooldown: 10 },
  { id: 'cmd3', text: '!party', effectId: '__all__', action: 'on', cooldown: 30 },
  { id: 'cmd4', text: '!blackout', effectId: '__all__', action: 'off', cooldown: 15 },
  { id: 'cmd5', text: '!fog', effectId: 'fog', action: 'toggle', cooldown: 10 },
  { id: 'cmd6', text: '!confetti', effectId: 'confetti', action: 'toggle', cooldown: 10 },
];
let channel: any = { name: '', connected: false };
let audioData: any = { bass: 0, mid: 0, high: 0, volume: 0, beat: false };
let chatLog: any[] = [];
let commandCooldowns: any = {};

const mimeTypes: Record<string, string> = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
};

const server = createServer((req, res) => {
  let filePath = req.url!.split('?')[0];
  if (filePath === '/') filePath = '/admin.html';
  
  const fullPath = join(PUBLIC_DIR, filePath);
  const ext = extname(fullPath).toLowerCase();
  
  if (!fullPath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  
  try {
    if (!existsSync(fullPath)) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }
    const data = readFileSync(fullPath);
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  } catch (err: any) {
    res.writeHead(500);
    res.end('Server Error: ' + err.message);
  }
});

const io = new SocketIOServer(server, {
  cors: { origin: '*' },
  maxHttpBufferSize: 1e6,
});

io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  socket.emit('state', { effects, commands, channel, audioData, chatLog: chatLog.slice(-50) });

  socket.on('get-state', (cb: any) => {
    if (typeof cb === 'function') {
      cb({ effects, commands, channel, audioData, chatLog: chatLog.slice(-50) });
    } else {
      socket.emit('state', { effects, commands, channel, audioData, chatLog: chatLog.slice(-50) });
    }
  });

  socket.on('update-effect', (data: any) => {
    const idx = effects.findIndex((e: any) => e.id === data.id);
    if (idx !== -1) {
      effects[idx] = { ...effects[idx], ...data };
      io.emit('effect-updated', effects[idx]);
    }
  });

  socket.on('toggle-effect', (data: any) => {
    const idx = effects.findIndex((e: any) => e.id === data.id);
    if (idx !== -1) {
      effects[idx].enabled = data.enabled;
      io.emit('effect-updated', effects[idx]);
    }
  });

  socket.on('add-command', (cmd: any, cb: any) => {
    const newCmd = { id: 'cmd' + Date.now(), ...cmd };
    commands.push(newCmd);
    io.emit('commands-updated', commands);
    if (typeof cb === 'function') cb(newCmd);
  });

  socket.on('remove-command', (cmdId: string) => {
    commands = commands.filter((c: any) => c.id !== cmdId);
    io.emit('commands-updated', commands);
  });

  socket.on('update-command', (data: any) => {
    const idx = commands.findIndex((c: any) => c.id === data.id);
    if (idx !== -1) {
      commands[idx] = { ...commands[idx], ...data };
      io.emit('commands-updated', commands);
    }
  });

  socket.on('connect-channel', (data: any) => {
    channel.name = data.name.toLowerCase().trim();
    connectTwitch(channel.name);
  });

  socket.on('disconnect-channel', () => {
    disconnectTwitch();
  });

  socket.on('audio-data', (data: any) => {
    audioData = data;
    socket.broadcast.emit('audio-data', data);
  });

  socket.on('quick-scene', (scene: string) => {
    applyQuickScene(scene);
    io.emit('state', { effects, commands, channel, audioData, chatLog: chatLog.slice(-50) });
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

function applyQuickScene(scene: string) {
  effects.forEach((e: any) => { e.enabled = false; e.intensity = 0.5; });
  const enable = (ids: string[], intensity = 0.6) => {
    ids.forEach(id => {
      const e = effects.find((ef: any) => ef.id === id);
      if (e) { e.enabled = true; e.intensity = intensity; }
    });
  };
  switch (scene) {
    case 'club': enable(['laser', 'spotlight', 'mirrorball', 'fog', 'equalizer'], 0.65); break;
    case 'rave': enable(['strobe', 'laser', 'particles', 'colorwash', 'confetti'], 0.8); break;
    case 'chill': enable(['colorwash', 'fog', 'lightbeam', 'smoke'], 0.45); break;
    case 'party': enable(['laser', 'spotlight', 'fog', 'lightbeam', 'particles', 'equalizer', 'dancers', 'colorwash', 'mirrorball', 'confetti'], 0.55); break;
    case 'blackout': break;
  }
}

let twitchWs: any = null;
let twitchPingInterval: any = null;

function connectTwitch(channelName: string) {
  disconnectTwitch();
  if (!channelName) return;

  const nick = 'justinfan' + Math.floor(Math.random() * 90000 + 10000);
  const pass = 'SCHMOOPIIE';
  console.log(`[Twitch] Connecting to #${channelName} as ${nick}...`);

  twitchWs = new WebSocket('wss://irc-ws.chat.twitch.tv:443');

  twitchWs.on('open', () => {
    console.log('[Twitch] WebSocket connected');
    twitchWs.send(`PASS ${pass}`);
    twitchWs.send(`NICK ${nick}`);
    twitchWs.send(`USER ${nick} 8 * :${nick}`);
    twitchWs.send('CAP REQ :twitch.tv/tags twitch.tv/commands');
    twitchWs.send(`JOIN #${channelName}`);
  });

  twitchWs.on('message', (data: Buffer) => {
    const lines = data.toString().split('\r\n');
    lines.forEach(line => {
      if (!line.trim()) return;
      if (line.startsWith('PING')) {
        twitchWs.send('PONG :tmi.twitch.tv');
        return;
      }
      const parts = line.split(' ');
      if (parts[1] === 'PRIVMSG') {
        const match = line.match(/:(\w+)!\w+@\w+\.tmi\.twitch\.tv PRIVMSG #\w+ :(.+)/);
        if (match) {
          const username = match[1];
          const message = match[2].trim();
          const chatMsg = { username, message, time: Date.now() };
          chatLog.push(chatMsg);
          if (chatLog.length > 200) chatLog = chatLog.slice(-100);
          io.emit('chat-message', chatMsg);

          const cmdText = message.toLowerCase().split(' ')[0];
          const cmd = commands.find((c: any) => c.text.toLowerCase() === cmdText);
          if (cmd) {
            const now = Date.now();
            const lastUsed = commandCooldowns[cmd.id] || 0;
            if (now - lastUsed < cmd.cooldown * 1000) {
              io.emit('chat-trigger', { command: cmd, username, onCooldown: true });
              return;
            }
            commandCooldowns[cmd.id] = now;

            if (cmd.effectId === '__all__') {
              if (cmd.action === 'on') effects.forEach((e: any) => { e.enabled = true; });
              else if (cmd.action === 'off') effects.forEach((e: any) => { e.enabled = false; });
              io.emit('state', { effects, commands, channel, audioData, chatLog: chatLog.slice(-50) });
            } else {
              const effect = effects.find((e: any) => e.id === cmd.effectId);
              if (effect) {
                if (cmd.action === 'toggle') effect.enabled = !effect.enabled;
                else if (cmd.action === 'on') effect.enabled = true;
                else if (cmd.action === 'off') effect.enabled = false;
                io.emit('effect-updated', effect);
              }
            }
            io.emit('chat-trigger', { command: cmd, username, onCooldown: false });
          }
        }
      }
      if (line.includes(`JOIN #${channelName}`)) {
        channel.connected = true;
        io.emit('channel-status', channel);
        console.log(`[Twitch] Joined #${channelName}`);
      }
    });
  });

  twitchWs.on('error', (err: Error) => {
    console.error('[Twitch] WebSocket error:', err.message);
    channel.connected = false;
    io.emit('channel-status', channel);
  });

  twitchWs.on('close', () => {
    console.log('[Twitch] WebSocket closed');
    channel.connected = false;
    io.emit('channel-status', channel);
    if (twitchPingInterval) { clearInterval(twitchPingInterval); twitchPingInterval = null; }
  });

  twitchPingInterval = setInterval(() => {
    if (twitchWs && twitchWs.readyState === WebSocket.OPEN) {
      twitchWs.send('PING :tmi.twitch.tv');
    }
  }, 30000);
}

function disconnectTwitch() {
  if (twitchWs) {
    if (twitchWs.readyState === WebSocket.OPEN) {
      twitchWs.send(`PART #${channel.name}`);
      twitchWs.close();
    }
    twitchWs = null;
  }
  if (twitchPingInterval) { clearInterval(twitchPingInterval); twitchPingInterval = null; }
  channel.connected = false;
  io.emit('channel-status', channel);
  console.log('[Twitch] Disconnected');
}

server.listen(PORT, () => {
  console.log('');
  console.log('  ████████╗██╗██╗  ██╗███████╗███████╗███████╗███╗   ██╗███████╗');
  console.log('  ╚══██╔══╝██║██║ ██╔╝██╔════╝██╔════╝██╔════╝████╗  ██║██╔════╝');
  console.log('     ██║   ██║█████╔╝ █████╗  ███████╗█████╗  ██╔██╗ ██║█████╗  ');
  console.log('     ██║   ██║██╔═██╗ ██╔══╝  ╚══███╔╝██╔══╝  ██║╚██╗██║██╔══╝  ');
  console.log('     ██║   ██║██║  ██╗███████╗███████║███████╗██║ ╚████║███████╗');
  console.log('     ╚═╝   ╚═╝╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝╚═╝  ╚═══╝╚══════╝');
  console.log('');
  console.log(`  [v0.0.1] Music Reactive Light Show Overlay`);
  console.log(`  Server running at http://localhost:${PORT}`);
  console.log(`  Admin panel: http://localhost:${PORT}/admin.html`);
  console.log(`  OBS Overlay: http://localhost:${PORT}/overlay.html`);
  console.log('');
});
