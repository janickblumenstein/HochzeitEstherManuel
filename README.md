# ♥ Hochzeits-Rate-Spiel v2

Einfache Web-App für Hochzeitsgesellschaften: Host steuert spontan Quiz-Sets oder ein Tap-Duell, Gäste tippen am Handy mit, der Beamer zeigt Fragen & Ergebnisse groß.

## 📁 Projekt-Struktur

```
hochzeit/
├── index.html
├── README.md
└── js/
    ├── content.js    ← HIER Fragen, Fotos & Sets anpassen
    ├── core.js       ← Firebase-Config, Login, Team-Board
    ├── games.js      ← Quiz-Runner mit Timer und Team-Fairness
    ├── tapduel.js    ← Tap-Duell (15 Sek Zwischenspiel)
    └── beamer.js     ← Beamer-Großansicht
```

## ✨ Was ist neu gegenüber v1

- **Quiz-Sets statt Einzelfragen**: Host wählt z.B. "Bunter Mix (10 Fragen)" → läuft automatisch durch
- **Timer pro Frage** (default 20s, pro Set konfigurierbar, Host kann +10s geben)
- **Faire Team-Wertung**: Team mit der höheren Trefferquote (%) gewinnt 1 Rundensieg — Teamgröße egal
- **Host spielt nicht mit**: Als Host eingeloggt → keine Antwort-Buttons, nur Steuerung und Live-Status
- **Tap-Duell als Zwischenspiel**: 15 Sek Tippen, Team mit höchstem Durchschnitt pro Person gewinnt
- **Foto-Sets**: Einmal in `content.js` vorbereiten, dann mit einem Klick starten
- **Beamer-Timer**: Countdown groß am Beamer, wird rot in den letzten 5 Sek

## 🚀 Setup in 3 Schritten

### 1. Firebase einrichten (~5 Min, kostenlos)

1. https://console.firebase.google.com → **"Add project"**
2. **Build → Realtime Database → Create** → Region `europe-west1`
3. **⚙️ Project Settings → General** → Web-App registrieren (`</>`)
4. Die `firebaseConfig` in `js/core.js` Zeilen 6–11 einsetzen
5. Database **Rules-Tab**:
```json
{
  "rules": {
    ".read": "now < 1830000000000",
    ".write": "now < 1830000000000"
  }
}
```

### 2. Fragen & Sets anpassen

`js/content.js` öffnen und anpassen:

- **`braut` / `braeutigam`**: Echte Namen
- **`questions.who/estimate/photos/prognose/family`**: Deine eigenen Fragen
- **`sets`**: Welche Quiz-Sets der Host starten kann

Quiz-Sets sehen so aus:
```javascript
{ id: "whoRound", label: "👫 Wer-von-beiden (5 Fragen)", pick: { who: 5 }, timer: 20 }
```

`pick`-Optionen:
- `{ who: 3 }` → 3 zufällige Wer-Fragen
- `{ photos: "all" }` → alle Fotos der Reihe nach
- `{ random: 10 }` → 10 zufällige aus allen Kategorien gemischt
- Mehrere kombinierbar: `{ who: 2, photos: 2, estimate: 1 }`

**Fotos**: Auf https://imgur.com hochladen → Rechtsklick → "Bildadresse kopieren" → als `photoUrl` einfügen.

### 3. Hosten

**Empfohlen: Netlify Drop** (https://netlify.com/drop)
- Ordner einfach in den Browser ziehen → läuft sofort mit eigener URL

Alternativ: **Vercel** oder **GitHub Pages**.

## 🎮 Ablauf am Hochzeitstag

**Host (z.B. Trauzeuge)**:
1. 3× auf "♥ HOCHZEIT ♥"-Logo tippen → Host-Button erscheint
2. Name eingeben → "Als Host starten" (kein Team nötig, Host spielt nicht mit)
3. Host-Tab öffnen → Quiz-Set wählen → "Set starten"

**Beamer-Laptop**:
- Gleiche URL mit `?beamer=1` am Ende öffnen → Vollbild, zeigt alles automatisch

**Gäste**:
- QR-Code scannen → Name + Team wählen → mitmachen

**Während des Quiz**:
- Zeitlimit läuft automatisch ab → Host kann früher auflösen oder +10 Sek geben
- Nach Auflösung: "Nächste Frage"-Button (oder Quiz beenden am Ende)
- Zwischendurch: "⚡ Tap-Duell starten" für 15 Sek Auflockerung

## 🎯 Die 5 Fragetypen

| Typ | Mechanik | Einzel-Punkte | Team-Rundensieg |
|---|---|---|---|
| **Wer von beiden?** | Klick auf Braut/Bräutigam | +1 pro richtig | Team mit höherer Trefferquote |
| **Schätzfrage** | Zahl eingeben | +3/+2/+1 für Top 3 | Team des Siegers (Top 1) |
| **Kindheitsfoto** | Foto wird groß gezeigt | +1 pro richtig | Team mit höherer Trefferquote |
| **Familie** | 2 custom Optionen | +1 pro richtig | Team mit höherer Trefferquote |
| **Ehe-Prognose** | Kein "richtig" | keine | Mehrheits-Team gewinnt Runde |

## ⚡ Tap-Duell (Zwischenspiel, 15 Sek)

- Jeder tippt so oft wie möglich auf den Team-Button
- **Gewinner** = Team mit dem höchsten **Durchschnitt pro Person** (nicht der Summe!) → Teamgröße egal
- Gewinner-Team bekommt 1 Rundensieg
- Live-Anzeige am Beamer

## 🏆 Scoring-System

- **Rundensiege** (Team-Stand): Hauptmetrik, 1 pro gewonnene Runde. Fair auch bei ungleicher Teamgröße.
- **Einzelpunkte** (persönliche Rangliste): Pro richtige Antwort, nicht für Team-Wertung.

Am Ende des Abends kürt ihr:
- **Team-Sieger** (meiste Rundensiege)
- **Top-Tipper** (Einzel-Rangliste)

## 🔧 Tipps für den Abend

- **Dramaturgie**: Warmmacher → Foto-Quiz → Schätz-Runde → Tap-Duell als Pause → Familien-Quiz → Prognose → Grosses Finale (Mixed)
- **Zeit**: Ein Set dauert 3–5 Min je nach Anzahl Fragen. Verteile 2–4 Sets über den Abend.
- **Beamer-Fallback**: Funktioniert auch komplett ohne Beamer, nur aufs Handy.

## ⚠️ Known Limits

- Keine Foto-Uploads in der App (imgur-URLs nötig)
- Ein Raum (`HOCHZEIT`) — für ein Event reicht das
- Kein Auth — wer den Namen kennt kann als der Name einloggen (unkritisch für Hochzeit)

Viel Spaß! 💍
