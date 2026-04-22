# Changelog

## [0.0.2] - 2026-04-23

### Changed
- **BREAKING**: Dancers completely redesigned - AI-generated sprite-based party people instead of stick figures!
  - 4 character types: Dude, Girl, DJ, Raver - each with 3 animation frames
  - Realistic silhouettes with glow/color effects
  - Smooth frame animation synced to beat
  - Still positioned ONLY on sides (never center!)
- Audio analyzer completely rewritten with reliable beat detection
  - Running average bass comparison algorithm
  - Beat cooldown to prevent double-triggers
  - beatPulse (decaying) added for smooth visual transitions
  - Sensitivity slider in overlay controls
  - Better mic settings (no echo cancellation/noise suppression)
- All effects improved with beatPulse integration
  - Smoother, more impactful visual response
  - Equalizer bars now use smooth interpolation
  - Lightning has branching bolts
  - Particles burst bigger on beats
  - Strobe flashes on beat AND rhythmically

### Fixed
- Transparent overlay background (was black, now fully transparent for OBS)
- Missing socket.io client script in overlay.html

## [0.0.1] - 2026-04-23

### Added
- Initial Release
- 14 visual effects: Laser, Scheinwerfer, Nebel, Stroboskop, Lichtkegel, Partikel, Equalizer, Tänzer, Farbflut, Spiegelkugel, Puls-Ring, Konfetti, Blitze, Rauch
- Admin panel with real-time effect controls
- 5 quick scenes: Club, Rave, Chill, Party, Blackout
- Twitch chat command system (anonymous, no token needed)
- Audio analysis via Web Audio API (mic, desktop, file)
- Dancing silhouettes on sides only (not center!)
- Standalone server on port 3131
- Windows BAT startup files
