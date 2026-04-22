# Changelog

## [0.0.4] - 2026-04-23

### Changed - MAJOR: Audio Architecture Overhaul
- **Audio capture now runs in Admin Panel** (not overlay!)
  - OBS Browser Source cannot show permission dialogs for audio access
  - Admin page runs in a real browser tab where all APIs work normally
  - Audio data is sent from admin to server, then relayed to overlay via WebSocket
- **Device Dropdown with `enumerateDevices()`**
  - Lists ALL available audio input devices (microphones, virtual cables, Stereo Mix, etc.)
  - Select any device and click "Verbinden" to start capturing
  - Refresh button to reload device list
- **Desktop Audio option** via screen share with audio
- **Audio File playback** directly in admin
- **Real-time Waveform Display** in admin - 64-band EQ visualization
- **Level meters update locally** at 60fps (no server round-trip delay)
- **Disconnect button** to stop audio capture
- **Sensitivity slider** range extended to 0.5 - 5.0
- **Tip box** explaining how to get desktop audio without microphone (VB-Audio Virtual Cable, Stereo Mix)
- **64-band EQ data** sent from admin to overlay (no more raw frequency array)
- Equalizer renderer uses `eqBands[]` instead of `audio.frequencies`

### Removed
- Audio controls removed from overlay.html (no longer needed)
- AudioAnalyzer no longer loaded in overlay (runs in admin only)
- `audio-command` WebSocket event removed (admin handles audio directly)

### Fixed
- Audio capture actually works now (was impossible in OBS browser source before)
- Beat detection receives real audio data
- Level meters show accurate real-time values

## [0.0.3] - 2026-04-23

### Changed
- **ALL effects now much more visible!** Doubled+ intensity on fog, smoke, mirrorball, lightning, equalizer
- **Dancers completely reworked**: Silhouettes extracted from sprites (no more white boxes!)
  - White body + effect color tinting via multiply blend mode
  - Glow outline effect on dancers
  - Right-side dancers now mirrored (facing inward)
  - Beat-synced foot flash effect
- **Beat detection with BPM tracking**:
  - Auto-detects BPM from beat intervals
  - Uses BPM to prevent double-triggering
  - Better bass response with faster smoothing (0.55/0.45)
  - Higher FFT resolution (4096)
  - Bass frequency focus (sub-200Hz) for better kick detection
- **Audio source selector in Admin Panel** (NEW!)
  - Dedicated "Audio" tab as first panel
  - Big buttons: Microphone, Desktop Audio, Audio File
  - Desktop Audio recommended for best beat detection
  - Connection status indicator
- **Level meters in Admin Panel** (NEW!)
  - Real-time Bass/Mid/High/Volume bars with percentages
  - Beat indicator dot (flashes pink on beat)
  - BPM display (auto-detected)
  - Sensitivity slider
  - Lets you verify the right audio source is connected
- Server relays audio commands from admin to overlay

### Fixed
- Fog and smoke now clearly visible (was nearly invisible before)
- Mirrorball reflections much brighter with trails
- Lightning bolts thicker with wider glow
- Equalizer bars bigger (64 bars) with top cap highlights
- Strobe now beat-synced instead of random

## [0.0.2] - 2026-04-23

### Changed
- AI-generated sprite-based dancing party people
- Audio analyzer with reliable beat detection
- beatPulse for smooth visual transitions
- All effects improved with beatPulse integration

### Fixed
- Transparent overlay background
- Missing socket.io client script in overlay.html

## [0.0.1] - 2026-04-23

### Added
- Initial Release
