# Changelog

## [0.0.7] - 2026-04-23

### Fixed - CRITICAL: Beat Detection Bug + Performance Overhaul

- **BEAT DETECTION KAPUTT - Root Cause gefunden und gefixt!**
  - `AudioAnalyzer.getData()` wurde von 2 Stellen aufgerufen:
    - `startAudioBroadcast()` alle 40ms (25fps)
    - `updateLocalMeters()` per requestAnimationFrame (~60fps)
  - getData() hatte SIDE EFFECTS (aktualisierte smoothBass, beatDecay, bassHistory, etc.)
  - Ergebnis: Analyse lief statt mit 25fps mit ~85fps = ALLE Timing-Werte falsch!
  - beatDecay verschwand in 50ms statt 200ms
  - bassHistory füllte sich 3x zu schnell = falscher Durchschnitt = falsche Thresholds
  - BPM-Schätzung komplett daneben (88 BPM statt 128 BPM)
  - **FIX**: Interne Analyse-Schleife mit festen 30fps, getData() ist jetzt PURE READ

- **BPM-Erkennung verbessert:**
  - Median statt Durchschnitt für Intervall-Berechnung (robuster gegen Ausreißer)
  - BPM-Glättung: 0.75/0.25 statt 0.7/0.3 (weniger Sprünge)
  - Mindest-Beat-Intervall: beatInterval × 0.65 statt 0.6 (verhindert Halb-Beat-Erkennung)
  - Sensitivity Default: 1.2 → 1.0 (war zu empfindlich)
  - Bass-Gewichtung: 1.1× → 1.0× (weniger Bass-Übertreibung)

- **PERFORMANCE: Half-Resolution Canvas (960×540 intern, CSS skaliert auf 1920×1080)**
  - 4x weniger Pixel zu rendern = massiv weniger CPU/GPU-Belastung
  - Glow-Effekte sehen bei halber Auflösung IDENTISCH aus (sie sind sowieso weich)
  - ctx.scale(0.5, 0.5) = alle Koordinaten bleiben auf 1920×1080
  - OBS braucht kein Full-Res Overlay

- **PERFORMANCE: Tänzer drastisch vereinfacht:**
  - 4 Tänzer statt 6 (2 links, 2 rechts)
  - 2 Render-Passes statt 4 (Glow + Body statt Glow + Medium + Body + Highlights)
  - Pre-computed Color Cache (kein hex-Parsing pro Frame)
  - Ergebnis: ~60% weniger Draw-Calls pro Tänzer

- **PERFORMANCE: Effekte reduziert:**
  - Laser: max 6 statt 8, 3 Layer statt 4
  - Partikel: max 60 statt 120, Beat-Burst 12 statt 35
  - Spiegelkugel: 4 Ringe statt 5, weniger Dots pro Ring
  - Nebel: 8 statt 12 Elemente
  - Rauch: 7 statt 10 Elemente
  - Equalizer: 48 Bars statt 64
  - Konfetti: max 60 statt 100
  - Blitze: kürzere Branches, kürzere Lebensdauer
  - Lichtkegel: 5 statt 6

- **Overlay auf 30fps gedeckelt** (OBS braucht nicht mehr)

## [0.0.6] - 2026-04-23

### Fixed - CRITICAL: shadowBlur Performance Fix
- shadowBlur komplett entfernt (war Ursache für Video-Freeze)
- Manual Glow Technik statt shadowBlur
- 30fps Frame-Cap eingeführt

## [0.0.5] - 2026-04-23
### Changed - Procedural Dancers + Beat Detection Fix
- Prozedurale Skelett-Animation statt Sprites
- Beat Detection Parameter entschärft

## [0.0.4] - 2026-04-23
### Changed - Audio Architecture Overhaul
- Audio capture in Admin Panel

## [0.0.3] - 2026-04-23
### Changed - Effects visibility, Beat detection, Audio source

## [0.0.2] - 2026-04-23
### Fixed - Transparent overlay, socket.io

## [0.0.1] - 2026-04-23
### Added - Initial Release
