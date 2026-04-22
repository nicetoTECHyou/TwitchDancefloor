import { createServer } from 'http'
import { Server } from 'socket.io'

const httpServer = createServer()
const io = new Server(httpServer, {
  path: '/',
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// ============ STATE ============
interface EffectState {
  id: string
  name: string
  enabled: boolean
  intensity: number
  speed: number
  color: string
  position: string
}

interface ChatCommandConfig {
  id: string
  command: string
  effectId: string
  action: string
  description: string
  cooldown: number
}

interface ChannelConfig {
  channelName: string
  platform: string
  connected: boolean
}

let effectsState: EffectState[] = []
let commandsState: ChatCommandConfig[] = []
let channelState: ChannelConfig = { channelName: '', platform: 'twitch', connected: false }
let audioData = { bass: 0, mid: 0, high: 0, volume: 0 }

// Twitch IRC connection
let twitchConnection: any = null
let commandCooldowns = new Map<string, number>()

// ============ TWITCH CHAT ============
async function connectTwitchChat(channelName: string) {
  if (twitchConnection) {
    disconnectTwitchChat()
  }

  try {
    // Connect to Twitch IRC via WebSocket (anonymous/anonymous works for reading)
    const ws = await import('ws')
    const client = new ws.default('wss://irc-ws.chat.twitch.tv:443')

    client.on('open', () => {
      console.log(`[Twitch] Connecting to #${channelName}...`)
      client.send('CAP REQ :twitch.tv/tags twitch.tv/commands')
      client.send('PASS SCHMOOPIIE')
      client.send('NICK justinfan' + Math.floor(Math.random() * 99999))
      client.send(`JOIN #${channelName.toLowerCase()}`)
    })

    client.on('message', (data: Buffer) => {
      const message = data.toString()
      const lines = message.split('\r\n')

      for (const line of lines) {
        if (!line) continue

        // Handle PING
        if (line.startsWith('PING')) {
          client.send('PONG :tmi.twitch.tv')
          continue
        }

        // Parse PRIVMSG
        if (line.includes('PRIVMSG')) {
          const match = line.match(/:(\w+)!\w+@\w+\.tmi\.twitch\.tv PRIVMSG #\w+ :(.+)/)
          if (match) {
            const username = match[1]
            const content = match[2].trim()
            handleChatMessage(username, content)
          }
        }
      }
    })

    client.on('close', () => {
      console.log('[Twitch] Disconnected')
      channelState.connected = false
      io.emit('channel-status', channelState)
    })

    client.on('error', (err: Error) => {
      console.error('[Twitch] Error:', err.message)
      channelState.connected = false
      io.emit('channel-status', channelState)
    })

    twitchConnection = client
    channelState.channelName = channelName
    channelState.connected = true
    channelState.platform = 'twitch'
    io.emit('channel-status', channelState)
    console.log(`[Twitch] Connected to #${channelName}`)

  } catch (err: any) {
    console.error('[Twitch] Connection failed:', err.message)
    channelState.connected = false
    io.emit('channel-status', channelState)
  }
}

function disconnectTwitchChat() {
  if (twitchConnection) {
    twitchConnection.close()
    twitchConnection = null
  }
  channelState.connected = false
  io.emit('channel-status', channelState)
  console.log('[Twitch] Disconnected')
}

function handleChatMessage(username: string, content: string) {
  console.log(`[Chat] ${username}: ${content}`)

  // Check if message matches any command
  const now = Date.now()
  for (const cmd of commandsState) {
    if (content.toLowerCase() === cmd.command.toLowerCase()) {
      // Check cooldown
      const lastUsed = commandCooldowns.get(cmd.command) || 0
      if (now - lastUsed < cmd.cooldown * 1000) continue

      commandCooldowns.set(cmd.command, now)

      // Find the effect and apply action
      const effect = effectsState.find(e => e.id === cmd.effectId)
      if (!effect) continue

      if (cmd.action === 'toggle') {
        effect.enabled = !effect.enabled
      } else if (cmd.action === 'on') {
        effect.enabled = true
      } else if (cmd.action === 'off') {
        effect.enabled = false
      }

      // Broadcast the change
      io.emit('effect-update', effect)
      io.emit('chat-trigger', { username, command: cmd.command, effectId: cmd.effectId, action: cmd.action })

      console.log(`[Command] ${username} triggered !${cmd.command} -> ${effect.name} (${cmd.action})`)
    }
  }
}

// ============ SOCKET.IO EVENTS ============
io.on('connection', (socket) => {
  console.log(`[WS] Client connected: ${socket.id}`)

  // Send current state to newly connected client
  socket.emit('effects-state', effectsState)
  socket.emit('commands-state', commandsState)
  socket.emit('channel-status', channelState)
  socket.emit('audio-data', audioData)

  // ---- Effect Management ----
  socket.on('set-effects', (effects: EffectState[]) => {
    effectsState = effects
    io.emit('effects-state', effectsState)
  })

  socket.on('update-effect', (effect: Partial<EffectState> & { id: string }) => {
    const idx = effectsState.findIndex(e => e.id === effect.id)
    if (idx !== -1) {
      effectsState[idx] = { ...effectsState[idx], ...effect }
      io.emit('effect-update', effectsState[idx])
    }
  })

  socket.on('toggle-effect', (data: { id: string, enabled: boolean }) => {
    const effect = effectsState.find(e => e.id === data.id)
    if (effect) {
      effect.enabled = data.enabled
      io.emit('effect-update', effect)
    }
  })

  // ---- Command Management ----
  socket.on('set-commands', (commands: ChatCommandConfig[]) => {
    commandsState = commands
    io.emit('commands-state', commandsState)
  })

  socket.on('add-command', (cmd: ChatCommandConfig) => {
    commandsState.push(cmd)
    io.emit('commands-state', commandsState)
  })

  socket.on('remove-command', (cmdId: string) => {
    commandsState = commandsState.filter(c => c.id !== cmdId)
    io.emit('commands-state', commandsState)
  })

  socket.on('update-command', (cmd: Partial<ChatCommandConfig> & { id: string }) => {
    const idx = commandsState.findIndex(c => c.id === cmd.id)
    if (idx !== -1) {
      commandsState[idx] = { ...commandsState[idx], ...cmd }
      io.emit('commands-state', commandsState)
    }
  })

  // ---- Channel Management ----
  socket.on('connect-channel', (data: { channelName: string, platform: string }) => {
    connectTwitchChat(data.channelName)
  })

  socket.on('disconnect-channel', () => {
    disconnectTwitchChat()
  })

  // ---- Audio Data (from overlay) ----
  socket.on('audio-data', (data: { bass: number, mid: number, high: number, volume: number }) => {
    audioData = data
    socket.broadcast.emit('audio-data', data)
  })

  // ---- Manual Effect Trigger (for testing from admin) ----
  socket.on('trigger-effect', (data: { effectId: string, action: string }) => {
    const effect = effectsState.find(e => e.id === data.effectId)
    if (effect) {
      if (data.action === 'toggle') effect.enabled = !effect.enabled
      else if (data.action === 'on') effect.enabled = true
      else if (data.action === 'off') effect.enabled = false
      io.emit('effect-update', effect)
    }
  })

  socket.on('disconnect', () => {
    console.log(`[WS] Client disconnected: ${socket.id}`)
  })

  socket.on('error', (error) => {
    console.error(`[WS] Socket error (${socket.id}):`, error)
  })
})

const PORT = 3001
httpServer.listen(PORT, () => {
  console.log(`[Overlay WS] Server running on port ${PORT}`)
})

process.on('SIGTERM', () => {
  disconnectTwitchChat()
  httpServer.close(() => process.exit(0))
})

process.on('SIGINT', () => {
  disconnectTwitchChat()
  httpServer.close(() => process.exit(0))
})
