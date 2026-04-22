# Changelog

## [0.0.6] - 2026-04-23

### Fixed - CRITICAL: Performance / Video Freeze Fix

- **Tänzer haben Video eingefroren!** Ursache: `ctx.shadowBlur` in jedem Frame
  - shadowBlur erzeugt pro Stroke einen Gauss-Blur = extrem GPU-hungrig
  - 6 Tänzer × 3 Passes × 14 Gelenke = 100+ Blur-Operationen pro Frame = INSTANT FREEZE
  - Komplett ersetzt durch "Manual Glow" Technik: Gestaffelte dicke/transparente Strokes
  - Ergebnis: ~10x schneller, gleicher visueller Effekt

- **Alle Effekte auf Manual Glow umgestellt:**
  - Laser: 4-Layer Strokes statt shadowBlur (Wide → Medium → Core → White)
  - Partikel: 3-Kreis Technik (Glow → Core → White center) statt shadowBlur
  - Spiegelkugel: 3-Kreis Dots statt shadowBlur
  - Blitze: 3-Layer Strokes statt shadowBlur
  - Pulse Ring: Doppelter Stroke statt shadowBlur
  - Nebel/Rauch: Unverändert (nutzte bereits keine shadowBlur)

- **Overlay Frame Rate auf 30fps gedeckelt:**
  - OBS braucht keine 60fps für ein Overlay
  - Spart massiv GPU-Ressourcen
  - Verhindert dass Dancefloor andere OBS-Quellen verhungern lässt

- **Particle Pool Limits reduziert:**
  - Max Partikel: 120 → 100 (normal), Beat-Burst: 35 → 20
  - Nebel-Elemente: 16 → 12
  - Rauch-Elemente: 14 → 10
  - Spiegelkugel Ringe: 6 → 5

## [0.0.5] - 2026-04-23

### Changed - MAJOR: Procedural Dancers + Beat Detection Fix

- **Tänzer komplett neu: Prozedurale Skelett-Animation!**
  - Keine 3-Bilder-Sprites mehr - echte fließende Bewegungen
  - 4 Tanzstile: Hip Hop, Techno, Pop, Club
  - Forward Kinematics mit 14 Gelenken
  - Beat-reaktive Bewegungsintensität
  - Neon-Silhouette-Stil mit Multi-Pass-Rendering
  - 6 Tänzer: 3 links, 3 rechts, nie in der Mitte

- **Beat Detection deutlich entschärft**

- **Desktop Audio Anleitung komplett überarbeitet**

## [0.0.4] - 2026-04-23

### Changed - MAJOR: Audio Architecture Overhaul
- Audio capture now runs in Admin Panel (not overlay!)
- Device Dropdown with enumerateDevices()
- Desktop Audio option via screen share
- Audio File playback directly in admin
- Real-time Waveform Display in admin
- Level meters update locally at 60fps

## [0.0.3] - 2026-04-23

### Changed
- ALL effects now much more visible
- Beat detection with BPM tracking
- Audio source selector in Admin Panel

## [0.0.2] - 2026-04-23

### Fixed
- Transparent overlay background
- Missing socket.io client script in overlay.html

## [0.0.1] - 2026-04-23

### Added
- Initial Release
