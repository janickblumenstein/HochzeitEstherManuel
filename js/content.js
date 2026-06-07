// === content.js ===
// HIER werden die Teens, Fragen, Fotos und Quiz-Sets vorbereitet.
// Der Host wählt am Abend nur noch "welches Set starten?" — fertig.
//
// PoC für den Teens-Abschluss: aus "Wer von beiden?" wird
// "Welcher der Teens ist das?". Jede Frage hat als Antwort eine Teen-id.

window.TeensContent = {

  // Titel/Untertitel auf Login & Beamer
  eventTitle: "Teens-Abschluss",
  subtitle:   "Lerne unsere Teens kennen",

  // Label für Besucher, die sich KEINEM Teen zugehörig fühlen wollen.
  // (kein Zwang, kein "Gäste"-Stempel — einfach offen)
  neutralLabel: "Noch offen",

  // ═══════════════════════════════════════════════════════
  // DIE TEENS  (id = intern, name = Anzeige, color = Farbe)
  // Reihenfolge = Reihenfolge der Antwort-Buttons.
  // Tipp: Fotos auf imgur.com hochladen → "Bildadresse kopieren".
  // ═══════════════════════════════════════════════════════
  teens: [
    { id: "t1", name: "Teen 1", emoji: "🧑", color: "#e8a4b8", photo: "" },
    { id: "t2", name: "Teen 2", emoji: "👧", color: "#6ba3c7", photo: "" },
    { id: "t3", name: "Teen 3", emoji: "👦", color: "#7ed987", photo: "" },
    { id: "t4", name: "Teen 4", emoji: "👩", color: "#e8a555", photo: "" },
    { id: "t5", name: "Teen 5", emoji: "🧒", color: "#b98ce8", photo: "" }
  ],

  // ═══════════════════════════════════════════════════════
  // FRAGEN-POOL
  // ═══════════════════════════════════════════════════════
  questions: {

    // --- RATEN: "Welcher Teen ist das?" -----------------------------
    // answer = id eines Teens (z.B. "t1").
    // photoUrl optional → mit Foto ein Bild-Quiz, ohne Foto ein Satz/Fakt-Quiz.
    guess: [
      { q: "Welcher Teen ist auf diesem Babyfoto?",
        photoUrl: "https://via.placeholder.com/400x400/e8a4b8/fff?text=Babyfoto+1", answer: "t1" },
      { q: "Und auf diesem Kindheitsfoto?",
        photoUrl: "https://via.placeholder.com/400x400/6ba3c7/fff?text=Foto+2",     answer: "t2" },
      { q: "Wer ist das als kleiner Wirbelwind?",
        photoUrl: "https://via.placeholder.com/400x400/7ed987/fff?text=Foto+3",     answer: "t3" },

      // --- ohne Foto: ein Satz/Fakt wird eingeblendet ---
      { q: "„Ich wollte als Kind unbedingt Feuerwehrmann werden.“ — Welcher Teen war das?", answer: "t4" },
      { q: "„Mein erstes Wort war angeblich 'Ball'.“ — Welcher Teen?",                       answer: "t5" },
      { q: "Welcher Teen ist am längsten schon in der Gruppe dabei?",                        answer: "t1" },
      { q: "Welcher Teen kann am besten Fussball jonglieren?",                               answer: "t3" }
    ],

    // --- SCHÄTZFRAGEN (optional, funktioniert teamübergreifend) ---
    // answer = Zahl. Punkte für die nächsten Tipper, Rundensieg fürs Team.
    estimate: [
      { q: "Wie viele Jahre waren unsere 5 Teens zusammen in der Gruppe?", answer: 5,  unit: "Jahre" },
      { q: "Wie viele Lager haben sie zusammen erlebt?",                   answer: 12, unit: "Lager" }
    ]
  },

  // ═══════════════════════════════════════════════════════
  // QUIZ-SETS: was der Host am Abend starten kann
  // pick: { guess: 5 }     = 5 Rate-Fragen
  // pick: { guess: "all" } = alle Rate-Fragen der Reihe nach
  // pick: { random: 8 }    = 8 zufällig gemischt aus allen Kategorien
  // ═══════════════════════════════════════════════════════
  sets: [
    { id: "fotos",     label: "📷 Babyfotos (alle)",        pick: { guess: "all" }, timer: 20 },
    { id: "saetze",    label: "💬 Wer war das? (5 Fragen)", pick: { guess: 5 },     timer: 20 },
    { id: "schaetzen", label: "🔢 Schätz-Runde (2 Fragen)", pick: { estimate: 2 },  timer: 30 },
    { id: "mixed",     label: "🎲 Bunter Mix (8 Fragen)",   pick: { random: 8 },    timer: 20 }
  ]
};

console.log("✅ content.js loaded — Teens:", window.TeensContent.teens.length, "Sets:", window.TeensContent.sets.length);
