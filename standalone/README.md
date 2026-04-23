# TwitchDancefloor v0.0.1

OBS Music Reactive Light Show Overlay mit Twitch Chat Commands

## Schnellstart

1. **Entpacken** - ZIP-Datei entpacken
2. **Installieren** - `install.bat` ausführen (nur beim ersten Mal)
3. **Starten** - `start.bat` ausführen
4. **Admin öffnet sich** automatisch unter `http://localhost:3131/admin.html`
5. **Overlay in OBS** - Browser Source hinzufügen: `http://localhost:3131/overlay.html` (1920x1080)

## Features

### Effekte (14 Stück!)
| Effekt | Kategorie | Beschreibung |
|--------|-----------|--------------|
| Laser | 💡 Licht | Mehrfarbige Laserstrahlen mit Glow-Effekt |
| Scheinwerfer | 💡 Licht | Realistische Spotlights mit Lichtkegeln |
| Stroboskop | 💡 Licht | Rhythmisches Blitzlicht |
| Lichtkegel | 💡 Licht | Volumetrische Lichtstrahlen von oben |
| Spiegelkugel | 💡 Licht | Klassische Disco-Kugel mit Reflektionen |
| Blitze | 💡 Licht | Zufällige Blitzschläge bei Bass-Peaks |
| Nebel | 🌫️ Atmosphäre | Schwebende Nebelschwaden |
| Rauch | 🌫️ Atmosphäre | Aufsteigender Rauch mit Swirl |
| Farbflut | 🌫️ Atmosphäre | Farbverlauf-Overlay das sich mit der Musik ändert |
| Partikel | 🌫️ Atmosphäre | Leuchtende Partikel mit Burst bei Beats |
| Equalizer | 🎨 Visuell | Audio-reaktive Frequenzbalken |
| Tänzer | 🎨 Visuell | Animierte Silhouetten (nur links/rechts!) |
| Puls-Ring | 🎨 Visuell | Expandierende Ringe bei Bass-Hits |
| Konfetti | 🎨 Visuell | Bunt fallendes Konfetti |

### Szenen (Quick-Presets)
- **Club Mode** - Laser + Spotlights + Spiegelkugel + Nebel + EQ
- **Rave Mode** - Strobe + Laser + Partikel + Farbflut + Konfetti
- **Chill Mode** - Farbflut + Nebel + Lichtkegel + Rauch
- **Party Mode** - Alles aktiv mit moderater Intensität
- **Blackout** - Alle Effekte aus

### Twitch Chat Commands
- Kein Token nötig! Nur Kanalname eingeben
- Anonyme Verbindung über IRC
- Eigene Commands erstellen: `!laser`, `!nebel`, `!strobe` etc.
- Cooldown pro Command einstellbar
- Aktionen: Toggle, An, Aus

### Audio-Quellen
- **Mikrofon** - Über getUserMedia
- **Desktop Audio** - Über getDisplayMedia (Bildschirmaufnahme mit Audio)
- **Audio-Datei** - MP3/WAV/OGG direkt abspielen

## Architektur

```
┌─────────────────┐     WebSocket      ┌─────────────────┐
│   OBS Overlay   │◄──────────────────►│   Admin Panel   │
│  (overlay.html) │     Port 3131      │  (admin.html)   │
│                 │                     │                 │
│  Canvas 1920x   │                     │  Effekt-Toggle  │
│  1080 + Audio   │                     │  Slider/Farben  │
│  Analyse        │                     │  Commands       │
└────────┬────────┘                     └────────┬────────┘
         │                                       │
         └───────────────┬───────────────────────┘
                         │
                ┌────────┴────────┐
                │   server.js     │
                │   Port 3131     │
                │                 │
                │  - HTTP Server  │
                │  - Socket.io    │
                │  - Twitch IRC   │
                │  - State Mgmt   │
                └─────────────────┘
```

## OBS Einrichtung

1. OBS öffnen → Sources → Add → Browser
2. URL: `http://localhost:3131/overlay.html`
3. Width: **1920**, Height: **1080**
4. "Shutdown source when not visible" **deaktivieren**
5. "Refresh browser when scene becomes active" nach Belieben

## Port

Standard: **3131** (änderbar in server.js Zeile `const PORT = 3131`)

## Lizenz

MIT - Mach was du willst damit! 🎉
