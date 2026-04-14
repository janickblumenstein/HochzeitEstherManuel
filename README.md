# ♥ Hochzeits-Rate-Spiel

Eine einfache Web-App für Hochzeitsgesellschaften: Gäste tippen Fragen über das Brautpaar auf dem Handy, der Host steuert das Spiel spontan, und ein Beamer zeigt Fragen & Ergebnisse groß.

## 📁 Projekt-Struktur

```
hochzeit/
├── index.html
├── README.md
└── js/
    ├── content.js    ← HIER Fragen, Fotos & Namen anpassen
    ├── core.js       ← Firebase-Config, Login, Rangliste
    ├── games.js      ← Spiel-Logik (5 Modi)
    └── beamer.js     ← Beamer-Großansicht
```

## 🚀 Setup in 3 Schritten

### 1. Firebase einrichten (ca. 5 Min, kostenlos)

1. Auf https://console.firebase.google.com → **"Add project"** → Name eingeben (z.B. `hochzeit-spiel`)
2. Im Projekt: **Build → Realtime Database → Create Database** → Region `europe-west1` wählen → **Start in test mode**
3. Links oben **⚙️ Project Settings → General** runterscrollen zu "Your apps" → **Web-App hinzufügen** (`</>`-Symbol) → App registrieren
4. Die `firebaseConfig` kopieren und in `js/core.js` einfügen (Zeilen 6–11):

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "hochzeit-spiel.firebaseapp.com",
  databaseURL: "https://hochzeit-spiel-default-rtdb.europe-west1.firebasedatabase.app/",
  projectId: "hochzeit-spiel"
};
```

5. In der Realtime Database → **Rules-Tab** → folgende Regel einfügen (erlaubt Zugriff bis Ende 2027):

```json
{
  "rules": {
    ".read": "now < 1830000000000",
    ".write": "now < 1830000000000"
  }
}
```

### 2. Fragen, Fotos & Namen anpassen

Öffne `js/content.js` und passe an:

- **`braut` / `braeutigam`**: Die echten Namen
- **`who`, `estimate`, `photos`, `prognose`, `family`**: Fragen zum Paar schreiben

**Fotos**: Am einfachsten kostenlos auf https://imgur.com hochladen → Rechtsklick aufs Bild → "Bildadresse kopieren" → als `photoUrl` einfügen. Quadratische Fotos sehen am besten aus.

### 3. Hosten

**Option A – GitHub Pages (empfohlen, gratis)**

1. GitHub-Repo erstellen, Dateien hochladen (gleiche Ordnerstruktur)
2. **Settings → Pages → Source: main, folder: `/ (root)`**
3. Nach ~30s läuft die App unter `https://<dein-user>.github.io/<repo>/`
4. URL im Hochzeitssaal per QR-Code an die Gäste verteilen

**Option B – Netlify (Drag & Drop)**

Ordner auf https://netlify.com droppen – fertig mit eigener URL.

**Option C – Lokal (Testing)**

```
cd hochzeit
python3 -m http.server 8000
```
→ im Browser `http://localhost:8000/` öffnen

## 🎮 Ablauf am Hochzeitstag

1. **Host öffnet die App** auf dem Handy, tippt 3× auf das "♥ HOCHZEIT ♥"-Logo → "Als Host starten"-Button erscheint → Name eingeben + Team wählen + "Als Host starten"
2. **Beamer-Laptop**: URL mit `?beamer=1` am Ende öffnen (z.B. `https://dein-user.github.io/hochzeit/?beamer=1`) → Zeigt automatisch im Vollbild den aktuellen Spielstand, die Frage oder das Ergebnis
3. **Gäste** scannen den QR-Code zur normalen URL → tippen Name ein → wählen Team Braut oder Bräutigam → fertig
4. **Host-Panel** (Tab 👑 Host): Spielart wählen, vorbereitete Frage laden ODER spontan tippen, dann "Runde starten" → Gäste beantworten am Handy → Host drückt "Auflösung zeigen" → Punkte werden automatisch vergeben → Nächste Runde starten

## 🎯 Die 5 Spielmodi

| Modus | Was passiert | Punkte |
|---|---|---|
| **Wer von beiden?** | Frage + 2 Buttons (Braut/Bräutigam) | +1 pro richtiger Antwort → fürs jeweilige Team |
| **Schätzfrage** | Zahl eingeben (z.B. "Wie viele Länder bereist?") | Top 3 näher-dran: +3 / +2 / +1 |
| **Kindheitsfoto** | Foto wird groß gezeigt, wer ist das? | +1 pro richtiger Antwort |
| **Ehe-Prognose** | Lustige Frage ohne richtige Antwort | Mehrheits-Team bekommt +1 je Tipp |
| **Familie** | Frei wählbare 2 Optionen (z.B. Vater A / Vater B) | +1 pro richtiger Antwort |

Jede Runde dauert typisch 2–3 Min. Zwischen Runden ist Pause – der Host kann jederzeit spontan entscheiden, ob's weitergeht oder gegessen/geredet wird.

## 🏆 Punkte-System

- **Einzel-Score**: Pro richtiger Antwort kriegt der Gast Punkte auf seinen persönlichen Stand
- **Team-Score**: Gleichzeitig gehen die Punkte auch ans Team (Braut/Bräutigam) — wird im Beamer groß angezeigt
- **Gewinner-Team** bekommt ein Feature-Glow auf dem Leaderboard

## 🔧 Tipps für den Abend

- **Reihenfolge**: Starte mit 2–3 einfachen "Wer von beiden?"-Fragen zum Warmwerden, dann ein Foto-Rätsel als Highlight, eine Schätzfrage, und zum Schluss eine Prognose für die Lacher
- **Timing**: 8–12 Runden über den Abend verteilt, nicht am Stück
- **Beamer-Fallback**: Falls kein Beamer da ist — alles läuft genauso auf den Handys, kein Problem
- **Host-Wechsel**: Jeder kann im Host-Tab "Host übernehmen" drücken, falls der ursprüngliche Host keine Lust mehr hat

## ⚠️ Bekannte Limitationen

- Keine Foto-Uploads direkt in der App (man braucht eine URL — imgur etc.)
- Nur 1 Raum (`HOCHZEIT`) — reicht für ein Event, bei Paralleleinsätzen in `core.js` `ROOM` anpassen
- Kein User-Authentication — wer den Namen kennt, kann als der Name einloggen (für eine Hochzeit unkritisch)

Viel Spaß! 💍
