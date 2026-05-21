// === content.js ===
// HIER werden Fragen, Fotos und Quiz-Sets vorbereitet.
// Der Host wählt am Hochzeitstag nur noch "welches Set starten?" — fertig.

window.HochzeitContent = {

  // Namen des Paares (können im Host-Panel live geändert werden)
  braut: "Alessia ",
  braeutigam: "Silas",

  // ═══════════════════════════════════════════════════════
  // FRAGEN-POOL
  // ═══════════════════════════════════════════════════════
  questions: {

    // --- WER-VON-BEIDEN: answer = "braut" oder "braeutigam" ---
who: [
      { q: "Wer würde eher zu spät kommen?", answer: "braeutigam" },
      { q: "Wer würde eher die Orientierung verlieren?", answer: "braut" },
      { q: "Wer würde eher aus Versehen etwas kaputt machen?", answer: "braut" },
      { q: "Wer würde eher einen cringe Tanzmove bringen?", answer: "braeutigam" },
      { q: "Wer würde eher ein Möbelstück falsch zusammenbauen?", answer: "braut" },
      { q: "Wer kocht besser?", answer: "braeutigam" },
      { q: "Wer würde eher die Kontrolle am Grill übernehmen?", answer: "braeutigam" },
      { q: "Wer würde eher im Urlaub einen Sonnenbrand bekommen?", answer: "braeutigam" },
      { q: "Wer würde eher beim Schätzen komplett danebenliegen?", answer: "braut" }
    ],

    // --- SCHÄTZFRAGEN: answer = Zahl ---
    estimate: [
      { q: "Wie viele Jahre kennen sich Alessia & Silas schon?",       answer: 8,    unit: "Jahre" },
      { q: "Wie viele Länder haben sie zusammen bereist?",        answer: 12,   unit: "Länder" },
      { q: "Wie viele Tage hat der längste Streit gedauert?",     answer: 3,    unit: "Tage" },
      { q: "In welchem Jahr war das erste Date?",                 answer: 2016, unit: "" },
      { q: "Wie viele Gäste sind heute da?",                      answer: 98,   unit: "Gäste" },
      { q: "Wie viele Minuten dauerte die Traurede?",             answer: 14,   unit: "Min" },
      { q: "Wie viele Paar Schuhe besitzt Alessia?",                 answer: 34,   unit: "Paar" },
      { q: "Kosten der Flitterwochen in CHF?",                    answer: 6500, unit: "CHF" }
    ],

    // --- KINDHEITSFOTOS: photoUrl + answer ---
    photos: [
      { q: "Wer ist auf dem Foto?", photoUrl: "https://via.placeholder.com/400x400/e8a4b8/fff?text=Foto+1", answer: "braut" },
      { q: "Und hier?",             photoUrl: "https://via.placeholder.com/400x400/6ba3c7/fff?text=Foto+2", answer: "braeutigam" },
      { q: "Wer könnte das sein?",  photoUrl: "https://via.placeholder.com/400x400/e8a4b8/fff?text=Foto+3", answer: "braut" },
      { q: "Ratet mal!",            photoUrl: "https://via.placeholder.com/400x400/6ba3c7/fff?text=Foto+4", answer: "braeutigam" }
      // TIPP: Fotos auf imgur.com hochladen → Rechtsklick aufs Bild → "Bildadresse kopieren"
    ],

    // --- EHE-PROGNOSEN (kein "richtig", Mehrheit gewinnt Runde) ---
    prognose: [
      { q: "Wer wird zuerst das Passwort vom anderen ändern wollen?" },
      { q: "Wer kocht in 10 Jahren öfter?" },
      { q: "Wer wird öfter 'Ich hab's dir doch gesagt' sagen?" },
      { q: "Wer gibt im ersten Streit zuerst nach?" },
      { q: "Wer schläft zuerst auf der Couch ein?" },
      { q: "Wer bestellt öfter Essen am Sonntagabend?" }
    ],

    // --- FAMILIE: frei wählbare 2 Optionen + answer "a" oder "b" ---
    family: [
      { q: "Wer hat die längere Velo-Tour gemacht?",    optA: "Vater Braut",   optB: "Vater Bräutigam",   answer: "a" },
      { q: "Wer hat mehr Enkel?",                       optA: "Oma Braut",     optB: "Oma Bräutigam",     answer: "b" },
      { q: "Wessen Geschwister sind älter im Schnitt?", optA: "Braut-Seite",   optB: "Bräutigam-Seite",   answer: "a" },
      { q: "Wer backt den besseren Kuchen?",            optA: "Mutter Braut",  optB: "Mutter Bräutigam",  answer: "a" }
    ]
  },

  // ═══════════════════════════════════════════════════════
  // QUIZ-SETS: was der Host am Hochzeitstag starten kann
  // pick: { who: 3 }       = 3 zufällige Wer-Fragen
  // pick: { photos: "all" }= alle Fotos der Reihe nach
  // pick: { random: 10 }   = 10 zufällige aus allen Kategorien gemischt
  // ═══════════════════════════════════════════════════════
  sets: [
    { id: "whoRound",  label: "👫 Wer-von-beiden (9 Fragen)", pick: { who: 9 },         timer: 20 }//,
    //{ id: "fotos",     label: "📷 Foto-Quiz (alle Fotos)",    pick: { photos: "all" },  timer: 15 },
    //{ id: "schaetzen", label: "🔢 Schätz-Runde (4 Fragen)",   pick: { estimate: 4 },    timer: 30 },
    //{ id: "familie",   label: "👨‍👩‍👧 Familien-Quiz",              pick: { family: "all" },  timer: 25 },
    //{ id: "prognose",  label: "🔮 Ehe-Prognose (3 Fragen)",   pick: { prognose: 3 },    timer: 20 },
    //{ id: "mixed",     label: "🎲 Bunter Mix (10 Fragen)",    pick: { random: 10 },     timer: 20 },
    //{ id: "bigFinal",  label: "🏆 Grosses Finale (15 Mixed)", pick: { random: 15 },     timer: 20 }
  ]
};

console.log("✅ content.js loaded — Sets:", window.HochzeitContent.sets.length);
