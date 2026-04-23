# TwitchDancefloor Changelog

## v0.0.9 - Scene Management System
- **NEW: Full Scene CRUD** - Szenen können jetzt bearbeitet, hinzugefügt und gelöscht werden
- **NEW: Scene Editor Modal** - Komfortabler Editor mit Name, Icon, Beschreibung, Chat-Command und Effekt-Auswahl
- **NEW: Scene Chat Commands** - Szenen per Twitch Chat aktivieren: `!scene <name>` oder direkter Command wie `!club`
- **NEW: Scene Persistence** - Szenen werden in `data/scenes.json` gespeichert und beim Neustart geladen
- **NEW: Scene Feedback** - Visuelles Highlight wenn eine Scene per Chat aktiviert wird
- **CHANGED: Server** - Scene-System komplett überarbeitet, CRUD-Socket-Events, Chat-Command-Integration
- **CHANGED: Admin** - Dynamisches Scene-Panel statt statischer Buttons, Modal-Editor
- **CHANGED: CSS** - Modal-Styles, Scene-Card-Actions, Mini-Toggle, responsive Anpassungen
- **CHANGED: Socket-Client** - `scenes-state` und `scene-applied` Events hinzugefügt

## v0.0.8 - Performance Overhaul
- HALF-RESOLUTION canvas (960x540 internal, CSS scaled to 1920x1080)
- CSS/GPU Dancer Renderer (zero canvas draw calls!)
- Path batching for lasers, lightning, pulse rings
- No shadowBlur anywhere (manual glow via layered strokes)
- Autocorrelation-based BPM detection
- Onset-based beat detection
- Admin panel with device dropdown, desktop audio, level meters

## v0.0.7 - Audio Architecture Rework
- Audio analysis moved to admin side (admin captures → analyzes → sends via WebSocket)
- Device enumeration with dropdown
- Desktop audio capture button
- Audio file playback support
- Real-time level meters in admin

## v0.0.6 - Initial Release
- 14 visual effects (laser, spotlight, fog, strobe, etc.)
- Skeletal animation dancers
- Beat detection from audio
- Twitch chat integration
- OBS Browser Source compatible
