# ✦ Teens-Abschluss – Mitmach-Spiel (PoC)

Web-App, um die Gemeinde & Gäste beim Teens-Abschluss-Gottesdienst einzubinden:
Auf dem Beamer erscheint ein Foto oder ein Satz, alle raten am Handy
**„Welcher der Teens ist das?"**. Fan-Teams sammeln Rundensiege, einzelne
Tipper sammeln Punkte.

> Diese App ist aus dem bewährten Hochzeits-Rate-Spiel entstanden. Statt
> *„Wer von **beiden**?"* (Braut/Bräutigam) geht es jetzt um *„Welcher der
> **Teens**?"* – die binäre Logik wurde auf **beliebig viele Teens + ein
> neutrales Team** verallgemeinert.

## 🎯 Konzept

- **Jeder Besucher** scannt den QR-Code, gibt **optional** einen Namen ein und
  wählt **ein Teen als Fan-Team** – oder bleibt bewusst **„Noch offen"**
  (kein Zwang, kein Popularitäts-Contest).
- **Spiel:** Host zeigt Babyfotos / Kindheitsfotos oder blendet einen Satz/Fakt
  ein. Alle tippen, welcher Teen gemeint ist.
- **Wertung – bewusst relativ, nie absolut:**
  - **Einzelpunkte:** +1 pro richtige Antwort → persönliche Rangliste.
  - **Rundensieg fürs Fan-Team:** das Team mit der höchsten **Trefferquote in %**
    gewinnt die Runde. Dadurch ist die **Teamgrösse egal** – ein Teen mit
    wenigen Fans kann genauso gewinnen wie eins mit vielen.
- **Tap-Duell** als Auflockerung: schnellstes Fan-Team (Taps pro Person) gewinnt.

## 📁 Projekt-Struktur

```
├── index.html       ← Layout & Styles
└── js/
    ├── content.js   ← HIER: Teens, Fragen, Fotos & Sets anpassen
    ├── core.js      ← Firebase, Login, Team-Modell (Teens + neutral)
    ├── games.js     ← Quiz-Runner mit Timer & relativer Team-Wertung
    ├── tapduel.js   ← Tap-Duell aller Fan-Teams
    └── beamer.js    ← Beamer-Großansicht
```

## 🚀 Setup in 3 Schritten

### 1. Firebase
Die `firebaseConfig` in `js/core.js` (Zeilen 9–14) eintragen.
Die App nutzt den Raum **`TEENS`** (Konstante `ROOM` in `core.js`), kollidiert
also nicht mit anderen Apps in derselben Datenbank.
Realtime-Database-Rules (für ein Event):
```json
{ "rules": { ".read": "now < 1830000000000", ".write": "now < 1830000000000" } }
```

### 2. Teens & Fragen anpassen → `js/content.js`
- **`teens`**: id, Name, Emoji, Farbe (`color`) und optional `photo` je Teen.
  Die Reihenfolge bestimmt die Reihenfolge der Antwort-Buttons.
- **`questions.guess`**: Fragen mit `answer: "<teen-id>"`.
  - *mit* `photoUrl` → Bild-Quiz („Welcher Teen ist auf dem Foto?")
  - *ohne* `photoUrl` → Satz/Fakt-Quiz („Welcher Teen hat das gesagt?")
- **`questions.estimate`** (optional): Schätzfragen mit Zahl-`answer`.
- **`sets`**: welche Quiz-Sets der Host starten kann.

> Fotos auf https://imgur.com hochladen → Rechtsklick → „Bildadresse kopieren".

### 3. Hosten
**Netlify Drop** (https://netlify.com/drop): Ordner in den Browser ziehen → fertig.
Alternativ Vercel oder GitHub Pages.

## 🎮 Ablauf am Abend

**Host:** 3× auf den Titel oben tippen → Host-Button erscheint → ohne Team starten →
Host-Tab → Set wählen → starten → Frage auflösen → nächste Frage.

**Beamer-Laptop:** gleiche URL mit `?beamer=1` öffnen (Vollbild, QR-Code unten rechts).

**Gäste:** QR scannen → (Name optional) → Teen wählen oder „Noch offen" → mitmachen.

## ⚠️ Known Limits (PoC)
- Keine Foto-Uploads in der App (imgur-/Bild-URLs nötig).
- Ein Raum (`TEENS`) – für ein Event reicht das.
- Kein echtes Auth.
- `color-mix()` im CSS → moderne Browser nötig (aktuelle Handys: kein Problem).

## 💡 Ideen für später
- Eigener Fragetyp „Zitat-Zuordnung" mit Audio.
- „Steckbrief" je Teen, der nach jeder Runde ein Stück mehr enthüllt wird.
- Abschluss-Slide pro Teen mit Foto & Segenswunsch.
