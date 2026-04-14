// === content.js ===
// HIER kannst du die Fragen & Fotos fürs Hochzeitsspiel vorbereiten.
// Einfach die Beispiele ersetzen/ergänzen.
// Die Host-Panel-App lädt die Fragen automatisch beim Start.

window.HochzeitContent = {

  // Namen des Paares – werden überall angezeigt
  // (Kann auch später im Host-Panel live geändert werden)
  braut: "Esther",
  braeutigam: "Manuel",

  // ============ WER-VON-BEIDEN ============
  // Eine Frage, Antwort ist "braut" oder "braeutigam"
  who: [
    { q: "Wer hat den Heiratsantrag gemacht?",         answer: "braeutigam" },
    { q: "Wer kann besser kochen?",                    answer: "braut" },
    { q: "Wer schläft länger am Wochenende?",          answer: "braut" },
    { q: "Wer hat das Bad öfter blockiert?",           answer: "braut" },
    { q: "Wer vergisst am ehesten den Hochzeitstag?",  answer: "braeutigam" },
    { q: "Wer wollte zuerst heiraten?",                answer: "braeutigam" },
    { q: "Wer hat zuerst 'Ich liebe dich' gesagt?",    answer: "braeutigam" },
    { q: "Wer ist besser im Auto parken?",             answer: "braut" },
    { q: "Wer flucht lauter beim Möbel aufbauen?",     answer: "braeutigam" },
    { q: "Wer kann besser tanzen?",                    answer: "braut" },
    { q: "Wer hat mehr Kleider im Schrank?",           answer: "braut" },
    { q: "Wer ist pünktlicher?",                       answer: "braeutigam" },
    { q: "Wer weint öfter im Kino?",                   answer: "braut" },
    { q: "Wer trinkt mehr Kaffee am Morgen?",          answer: "braeutigam" },
    { q: "Wer hat die verrückteren Träume?",           answer: "braut" }
  ],

  // ============ SCHÄTZFRAGEN ============
  // Antwort als Zahl (int oder float)
  estimate: [
    { q: "Wie viele Jahre kennen sich Anna & Max schon?",       answer: 8,    unit: "Jahre" },
    { q: "Wie viele Länder haben die beiden zusammen bereist?", answer: 12,   unit: "Länder" },
    { q: "Wie viele Tage hat der längste Streit gedauert?",     answer: 3,    unit: "Tage" },
    { q: "In welchem Jahr war das erste Date?",                 answer: 2016, unit: "" },
    { q: "Wie viele Freunde auf Instagram hat Anna?",           answer: 487,  unit: "" },
    { q: "Wie lang ist die Gästeliste heute?",                  answer: 98,   unit: "Gäste" },
    { q: "Wie viele Minuten dauerte die Traurede?",             answer: 14,   unit: "Min" },
    { q: "Wie viele Bier hat Max beim JGA getrunken?",          answer: 17,   unit: "Bier" },
    { q: "Wie viele Paar Schuhe besitzt Anna?",                 answer: 34,   unit: "Paar" },
    { q: "Kosten der Flitterwochen in CHF?",                    answer: 6500, unit: "CHF" }
  ],

  // ============ KINDHEITSFOTOS ============
  // photoUrl: direkter Link zum Bild. Upload z.B. auf imgur.com, dann Link einfügen.
  // answer: "braut" oder "braeutigam"
  photos: [
    { q: "Wer ist auf dem Foto?",  photoUrl: "https://i.imgur.com/4ILisqH.jpeg", answer: "braut" },
    { q: "Und hier?",              photoUrl: "https://i.imgur.com/4ILisqH.jpeg", answer: "braeutigam" },
    { q: "Wer könnte das sein?",   photoUrl: "https://i.imgur.com/4ILisqH.jpeg", answer: "braut" },
    { q: "Ratet mal!",             photoUrl: "https://i.imgur.com/4ILisqH.jpeg", answer: "braeutigam" }
    // TIPP: Ersetze die Placeholder-URLs durch echte Kindheitsfoto-Links.
    // Fotos auf imgur.com hochladen → Rechtsklick → "Bildadresse kopieren"
    // oder Google Drive Foto → "Link freigeben" → Link muss direkt aufs Bild zeigen
  ],

  // ============ EHE-PROGNOSE (Spass, keine richtige Antwort) ============
  // Einfach eine Frage, Gäste stimmen ab, Mehrheit gewinnt (ohne Punkte)
  prognose: [
    { q: "Wer wird zuerst das Passwort vom anderen ändern wollen?" },
    { q: "Wer kocht in 10 Jahren öfter?" },
    { q: "Wer wird öfter 'Ich hab's dir doch gesagt' sagen?" },
    { q: "Wer verlernt zuerst den Hochzeitstanz?" },
    { q: "Wer wird öfter bei den Schwiegereltern anrufen?" },
    { q: "Wer gibt im ersten Streit nach der Hochzeit zuerst nach?" },
    { q: "Wer schläft zuerst auf der Couch ein?" },
    { q: "Wer bestellt öfter Essen am Sonntagabend?" }
  ],

  // ============ FAMILIEN-FRAGEN (custom Optionen) ============
  // Du definierst 2 eigene Optionen + richtige Antwort ("a" oder "b")
  family: [
    { q: "Wer hat die längere Velo-Tour gemacht?",   optA: "Vater Braut",     optB: "Vater Bräutigam", answer: "a" },
    { q: "Wer hat mehr Kinder?",                     optA: "Oma Braut",       optB: "Oma Bräutigam",   answer: "b" },
    { q: "Wessen Familie stammt nicht aus der Schweiz?", optA: "Familie Braut", optB: "Familie Bräutigam", answer: "b" },
    { q: "Wessen Geschwister sind älter im Schnitt?", optA: "Geschwister Braut", optB: "Geschwister Bräutigam", answer: "a" },
    { q: "Wer backt den besseren Kuchen?",           optA: "Mutter Braut",    optB: "Mutter Bräutigam",answer: "a" }
  ]
};

console.log("✅ content.js loaded –", Object.keys(window.HochzeitContent).filter(k=>Array.isArray(window.HochzeitContent[k])).map(k=>`${k}: ${window.HochzeitContent[k].length}`).join(", "));
