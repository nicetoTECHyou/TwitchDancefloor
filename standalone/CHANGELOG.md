# Changelog

## [0.0.5] - 2026-04-23

### Changed - MAJOR: Procedural Dancers + Beat Detection Fix

- **Tänzer komplett neu: Prozedurale Skelett-Animation!**
  - Keine 3-Bilder-Sprites mehr - echte fließende Bewegungen
  - 4 Tanzstile: Hip Hop, Techno, Pop, Club
  - Forward Kinematics mit 14 Gelenken (Kopf, Schultern, Ellbogen, Hände, Hüfte, Knie, Füße)
  - Beat-reaktive Bewegungsintensität
  - Neon-Silhouette-Stil mit 3-Pass-Rendering (Glow → Body → Highlights)
  - Torsos als ausgefüllte Form (keine Strichmännchen!)
  - 6 Tänzer: 3 links, 3 rechts, nie in der Mitte

- **Beat Detection deutlich entschärft:**
  - Sensitivity Default: 2.0 → 1.2 (war zu extrem)
  - Beat-Schwellwert: bassAvg × 1.3 → bassAvg × 1.5 (weniger Fehlauslösungen)
  - Mindest-Beat-Intervall: 150ms → 250ms (besser für House/Techno)
  - BeatPulse-Zerfall: 0.88 → 0.80 (schneller abklingend = knackiger)
  - Frequency-Gewichtung moderater (1.3× → 1.1× für Bass)
  - Glättung stärker (0.55/0.45 → 0.65/0.35)

- **Effekte weniger extrem:**
  - Laser: MAX 8 statt 14, weniger Glow, weniger bass-getrieben
  - Strobe: Nur noch bei starken Beats (bp > 0.4 statt > 0.2), schwächere Intensität
  - Blitz: Nur noch bei echten Beats, nicht bei zufälligen Bass-Spitzen
  - Alle beatPulse-Einflüsse reduziert

- **Desktop Audio Anleitung komplett überarbeitet:**
  - 3 Methoden detailliert erklärt: Stereo Mix, VB-Cable, Bildschirmfreigabe
  - Schritt-für-Schritt mit Windows-Sound-Einstellungen
  - Hinweis auf "Audio teilen" Checkbox bei Bildschirmfreigabe

## [0.0.4] - 2026-04-23

### Changed - MAJOR: Audio Architecture Overhaul
- Audio capture now runs in Admin Panel (not overlay!)
- Device Dropdown with enumerateDevices()
- Desktop Audio option via screen share
- Audio File playback directly in admin
- Real-time Waveform Display in admin
- Level meters update locally at 60fps
- 64-band EQ data sent from admin to overlay
- Equalizer renderer uses eqBands[] instead of audio.frequencies

## [0.0.3] - 2026-04-23

### Changed
- ALL effects now much more visible
- Dancers reworked with sprites (replaced again in v0.0.5 with procedural animation)
- Beat detection with BPM tracking
- Audio source selector in Admin Panel
- Level meters in Admin Panel

## [0.0.2] - 2026-04-23

### Changed
- AI-generated sprite-based dancing party people
- Audio analyzer with reliable beat detection
- beatPulse for smooth visual transitions

### Fixed
- Transparent overlay background
- Missing socket.io client script in overlay.html

## [0.0.1] - 2026-04-23

### Added
- Initial Release
