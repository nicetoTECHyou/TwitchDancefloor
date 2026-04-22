# Changelog

## [0.0.8] - 2026-04-23

### REVOLUTIONARY: CSS/GPU Dancers + Autocorrelation BPM

- **TÄNZER: VOLLSTÄNDIG AUF CSS/GPU UMGESTELLT!**
  - Tänzer sind jetzt HTML/DIV-Elemente statt Canvas 2D Draw Calls
  - CSS `transform` wird vom Browser GPU-kompositiert (Chrome/CEF Hardware-Beschleunigung)
  - `will-change: transform` + `transform: translateZ(0)` forciert GPU-Layer
  - `box-shadow` für Glow wird auf der GPU gerendert (NICHT CPU shadowBlur!)
  - Ergebnis: NULL Canvas Draw Calls für Tänzer! Kein Freeze mehr!
  - Neon-Silhouetten-Look: Dunkle Body-Parts mit farbigem Glow-Outline
  - Opacity-Modulation bei Beats (GPU-kompositiert)

- **BPM-ERKENNUNG: AUTOKORRELATION (Industriestandard!)**
  - Komplette Neuimplementierung des BPM-Detection-Algorithmus
  - Autokorrelation auf Onset-Envelope (wie DJ-Software: Traktor, Serato, etc.)
  - Onset-basierte Beat-Detection statt simpler Bass-Schwellenwert
  - Erkennt plötzliche Bass-ANSTIEGE (onsets), nicht absolute Pegel
  - Oktaven-Korrektur: Bevorzugt 100-180 BPM (elektronische Musik)
  - Konfidenz-basierte BPM-Glättung (nur aktualisieren wenn sicher)
  - KEIN Feedback-Loop mehr! Fixed minBeatInterval statt estimatedBPM-basiert
  - Fixt: 88 BPM erkannt statt ~128 BPM

- **EFFECTS: PATH BATCHING (massiv weniger Draw Calls!)**
  - Laser: 18 → 3 Draw Calls (alle Linien pro Layer gebatcht)
  - Blitze: 4N → 2 Draw Calls (alle Bolts pro Layer gebatcht)
  - Puls-Ringe: 2N → 2 Draw Calls (alle Ringe pro Layer gebatcht)
  - Partikel: 2N → 2 Draw Calls (Glow+Core als batched fill)
  - Spiegelkugel: 2N → 2 Draw Calls (Glow+Core batched)
  - Ergebnis: ~75% weniger Canvas 2D Draw Calls insgesamt!

- **Desktop Audio UX verbessert:**
  - VB-Audio Virtual Cable als EMPFOHLENE Methode 1 (statt Stereo Mix)
  - Klarere Anleitung mit 4 Schritten
  - Hinweis dass Bildschirmfreigabe nicht immer zuverlässig funktioniert

## [0.0.7] - 2026-04-23

### Fixed - CRITICAL: Beat Detection Bug + Performance Overhaul

- **BEAT DETECTION KAPUTT - Root Cause gefunden und gefixt!**
  - getData() hatte SIDE EFFECTS, wurde von 2 Stellen aufgerufen
  - Ergebnis: Analyse lief statt mit 25fps mit ~85fps = ALLE Timing-Werte falsch!
  - **FIX**: Interne Analyse-Schleife mit festen 30fps, getData() ist jetzt PURE READ

- **PERFORMANCE: Half-Resolution Canvas (960×540 intern, CSS skaliert auf 1920×1080)**
- **PERFORMANCE: Tänzer drastisch vereinfacht (4 statt 6, 2 statt 4 Render-Passes)**
- **PERFORMANCE: Effekte reduziert (weniger Objekte, weniger Layer)**
- **Overlay auf 30fps gedeckelt**

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
