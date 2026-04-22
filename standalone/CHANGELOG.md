# Changelog

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
  - Dedicated "🔊 Audio" tab as first panel
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
