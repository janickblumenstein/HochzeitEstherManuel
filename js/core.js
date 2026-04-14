// === core.js – Basis-Modul ===
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue, update, get, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// ═══════════════════════════════════════════════════════════
// HIER FIREBASE-CONFIG EINTRAGEN (siehe README.md)
// ═══════════════════════════════════════════════════════════
const firebaseConfig = {
  apiKey: "AIzaSyCQxhhkr-YF81rJ7J-ApwGmonB4CUywlp8",
  authDomain: "hochzeitesthermanuel.firebaseapp.com",
  databaseURL: "https://hochzeitesthermanuel-default-rtdb.europe-west1.firebasedatabase.app/",
  projectId: "hochzeitesthermanuel"
};
// ═══════════════════════════════════════════════════════════

const fbApp = initializeApp(firebaseConfig);
const db = getDatabase(fbApp);
const ROOM = "HOCHZEIT";

const App = window.App = {
  db, ref, set, onValue, update, get, remove,
  user: null, team: null, room: ROOM, isHost: false,
  state: {}, players: {}, meta: {}, teams: {},
  timers: [],
  listeners: {},
  $: id => document.getElementById(id),
  toast, awardScore, switchTab, clearTimers, shuffle, isBeamer: false
};

function clearTimers(){ App.timers.forEach(t=>{clearInterval(t);clearTimeout(t)}); App.timers=[]; }
function shuffle(a){ return [...a].sort(()=>Math.random()-0.5); }

function toast(text, duration=2500){
  const c = App.$("toastContainer");
  const t = document.createElement("div");
  t.className = "toast"; t.innerText = text;
  c.appendChild(t);
  setTimeout(()=>t.remove(), duration);
}

async function awardScore(player, pts){
  const r = ref(db, `rooms/${App.room}/players/${player}/score`);
  const cur = (await get(r)).val() || 0;
  await set(r, cur + pts);
}
// === core.js – Auto-Login Fix ===

// === BEAMER-MODE CHECK ===
const urlParams = new URLSearchParams(location.search);
if(urlParams.get("beamer") === "1"){
  App.isBeamer = true;
  document.body.classList.add("beamer-mode");
  App.$("login").classList.add("hidden");
  App.$("app").classList.add("hidden");
  App.$("beamer").classList.remove("hidden");
  connectBeamer();
} else {
  initLogin();
  attemptAutoLogin(); // <-- HIER direkt beim Start ausführen!
}

async function connectBeamer(){
  // ... (bleibt wie vorher)
  onValue(ref(db, `rooms/${App.room}/meta`),    snap=>{ App.meta = snap.val() || {}; beamerUpdate(); });
  onValue(ref(db, `rooms/${App.room}/players`), snap=>{ App.players = snap.val() || {}; beamerUpdate(); });
  onValue(ref(db, `rooms/${App.room}/teams`),   snap=>{ App.teams = snap.val() || {}; beamerUpdate(); });
  onValue(ref(db, `rooms/${App.room}/game`),    snap=>{ App.state.game = snap.val(); beamerUpdate(); });
  onValue(ref(db, `rooms/${App.room}/quiz`),    snap=>{ App.state.quiz = snap.val(); beamerUpdate(); });
  onValue(ref(db, `rooms/${App.room}/tapduel`), snap=>{ App.state.tapduel = snap.val(); beamerUpdate(); });
}
function beamerUpdate(){ if(App.listeners.onBeamerUpdate) App.listeners.onBeamerUpdate(); }


async function attemptAutoLogin() {
  const savedUid = localStorage.getItem("wedding_uid");
  if (!savedUid) return; // Kein alter Login gefunden

  // Namen vorsichtshalber schon mal ins Input-Feld schreiben
  const savedName = localStorage.getItem("wedding_name") || savedUid.split('_')[0];
  if (App.$("nameInp")) App.$("nameInp").value = savedName;

  try {
    // 1. Prüfen: Bin ich ein normaler Spieler?
    const pSnap = await get(ref(db, `rooms/${App.room}/players/${savedUid}`));
    if (pSnap.exists()) {
      const data = pSnap.val();
      App.user = savedUid;
      App.userName = data.name;
      App.team = data.team;
      finishLogin(); // Direkt ins Spiel springen!
      return;
    }

    // 2. Prüfen: Bin ich der Host? (Der Host steht in 'meta', nicht in 'players')
    const mSnap = await get(ref(db, `rooms/${App.room}/meta`));
    if (mSnap.exists()) {
      const meta = mSnap.val();
      if (meta.host === savedUid) {
        App.user = savedUid;
        App.userName = meta.hostName || savedName;
        // isHost wird in attachListeners() auf true gesetzt
        finishLogin(); // Direkt ins Host-Panel springen!
      }
    }
  } catch (error) {
    console.error("Auto-login fehler:", error);
  }
}

// In der start()-Funktion müssen wir noch den Namen abspeichern:
async function start(takeHost, team) {
  const inputName = App.$("nameInp").value.trim();
  if (!inputName) return alert("Bitte Namen eingeben!");
  if (!takeHost && !team) return alert("Bitte Team wählen!");

  let finalName = inputName;
  let uid = localStorage.getItem("wedding_uid") || (inputName + "_" + Math.random().toString(36).substr(2, 4));

  // Namenskollision prüfen (nur für Spieler)
  const playersSnap = await get(ref(db, `rooms/${App.room}/players`));
  const players = playersSnap.val() || {};
  
  if (!takeHost) {
    let nameExists = Object.values(players).some(p => p.name === finalName && p.uid !== uid);
    if (nameExists) {
      let count = 2;
      while (Object.values(players).some(p => p.name === (inputName + " " + count))) { count++; }
      finalName = inputName + " " + count;
      toast(`Name angepasst: ${finalName}`);
    }
  }

  App.user = uid; 
  App.userName = finalName;
  App.team = team;
  
  // WICHTIG: Hier speichern wir die UID und den Namen lokal ab
  localStorage.setItem("wedding_uid", uid);
  localStorage.setItem("wedding_name", finalName);

  // ... (Rest der start() Funktion bleibt exakt wie vorher)
  if (takeHost) {
    await update(ref(db, `rooms/${App.room}/meta`), { host: uid, hostName: finalName });
  } else {
    await update(ref(db, `rooms/${App.room}/players/${uid}`), {
      name: finalName, team: team, uid: uid,
      score: players[uid]?.score || 0, joined: Date.now()
    });
  }
  finishLogin();
}

// === core.js Korrekturen ===

async function start(takeHost, team) {
  const inputName = App.$("nameInp").value.trim();
  if (!inputName) return alert("Bitte Namen eingeben!");
  if (!takeHost && !team) return alert("Bitte Team wählen!");

  let finalName = inputName;
  // UID aus Speicher laden oder neu generieren
  let uid = localStorage.getItem("wedding_uid") || (inputName + "_" + Math.random().toString(36).substr(2, 4));

  // Namenskollision prüfen (nur für Spieler wichtig)
  const playersSnap = await get(ref(db, `rooms/${App.room}/players`));
  const players = playersSnap.val() || {};
  
  if (!takeHost) {
    let nameExists = Object.values(players).some(p => p.name === finalName && p.uid !== uid);
    if (nameExists) {
      let count = 2;
      while (Object.values(players).some(p => p.name === (inputName + " " + count))) { count++; }
      finalName = inputName + " " + count;
      toast(`Name angepasst: ${finalName}`);
    }
  }

  App.user = uid; 
  App.userName = finalName;
  App.team = team;
  localStorage.setItem("wedding_uid", uid);

  if (takeHost) {
    // ÜBERNAHME: Wir setzen die aktuelle UID als Host in der Meta-Node
    await update(ref(db, `rooms/${App.room}/meta`), { 
      host: uid,           // Die UID ist der Anker für die Berechtigung
      hostName: finalName  // Nur für die Anzeige auf dem Beamer/Badge
    });
  } else {
    await update(ref(db, `rooms/${App.room}/players/${uid}`), {
      name: finalName,
      team: team,
      uid: uid,
      score: players[uid]?.score || 0,
      joined: Date.now()
    });
  }

  finishLogin();
}

function attachListeners() {
  onValue(ref(db, `rooms/${App.room}/meta`), snap => {
    const m = snap.val() || {};
    App.meta = m;
    
    // WICHTIG: Vergleich der UID für Host-Rechte
    App.isHost = (m.host === App.user); 

    const teamEmoji = App.team === "braut" ? "👰" : App.team === "braeutigam" ? "🤵" : "👑";
    const teamClass = App.team || "host";
    
    // Badge zeigt jetzt den Anzeigenamen (userName) statt der kryptischen UID
    App.$("userBadge").innerHTML =
      `<span class="badge ${teamClass}">${teamEmoji} ${App.userName}</span>` +
      (App.isHost ? ' <span class="badge host"> (Host)</span>' : '');

    App.$("hostStatus").innerHTML = `Aktueller Host: <b>${m.hostName || '-'}</b>`;
    
    // UI-Elemente für Host ein/ausblenden
    const controls = App.$("hostControls");
    if(controls) controls.classList.toggle("hidden", !App.isHost);
    document.querySelectorAll(".hostOnly").forEach(el => el.classList.toggle("hidden", !App.isHost));
    
    if(m.braut) App.$("nameBraut").value = m.braut;
    if(m.braeutigam) App.$("nameBraeutigam").value = m.braeutigam;
  });
  
  // ... restliche onValue-Listener für Players/Teams
}

function finishLogin() {
  App.$("login").classList.add("hidden");
  App.$("app").classList.remove("hidden");
  attachListeners();
  bindCoreUI();
  if (App.listeners.onReady) App.listeners.onReady();
  // Sicherstellen, dass wir im "Spiel"-Tab landen
  switchTab("Game");
}



function bindCoreUI(){
  document.querySelectorAll(".tab").forEach(t=>{
    t.onclick = ()=>switchTab(t.dataset.tab);
  });

  App.$("btnResetScores").onclick = async()=>{
    if(!App.isHost || !confirm("Alle Scores auf 0?")) return;
    const upd = {};
    Object.keys(App.players).forEach(p=>{ upd[`${p}/score`] = 0; });
    await update(ref(db, `rooms/${App.room}/players`), upd);
    await set(ref(db, `rooms/${App.room}/teams`), { braut: 0, braeutigam: 0 });
    toast("Alles zurückgesetzt");
  };

  App.$("btnFullReset").onclick = async()=>{
    if(!App.isHost || !confirm("WIRKLICH ALLES löschen? Alle Spieler fliegen raus.")) return;
    await remove(ref(db, `rooms/${App.room}`));
    location.reload();
  };

  App.$("btnSaveNames").onclick = async()=>{
    if(!App.isHost) return;
    const b = App.$("nameBraut").value.trim();
    const br = App.$("nameBraeutigam").value.trim();
    if(b) await update(ref(db, `rooms/${App.room}/meta`), { braut: b });
    if(br) await update(ref(db, `rooms/${App.room}/meta`), { braeutigam: br });
    toast("Namen gespeichert");
  };

  const bu = location.origin + location.pathname + "?beamer=1";
  App.$("beamerUrl").innerText = bu;
  App.$("btnCopyUrl").onclick = ()=>{
    navigator.clipboard.writeText(bu);
    toast("URL kopiert");
  };
}

function switchTab(name){
  document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active", x.dataset.tab === name));
  document.querySelectorAll(".tabPane").forEach(p=>p.classList.add("hidden"));
  App.$("tab"+name).classList.remove("hidden");
}

function renderTeamBoard(){
  const board = App.$("teamBoard"); if(!board) return;
  const players = App.players || {};
  const teams = { braut: { members: [] }, braeutigam: { members: [] } };
  Object.entries(players).forEach(([n, p])=>{
    if(p.team === "braut" || p.team === "braeutigam"){
      teams[p.team].members.push(n);
    }
  });
  const t = App.teams || { braut: 0, braeutigam: 0 };
  const m = App.meta || {};
  const nameB = m.braut || "Braut";
  const nameBr = m.braeutigam || "Bräutigam";
  const winB = (t.braut || 0) > (t.braeutigam || 0);
  const winBr = (t.braeutigam || 0) > (t.braut || 0);

  board.innerHTML = `
    <div class="team-card braut ${winB?'team-winning':''}">
      <div class="nm">👰 Team ${nameB}</div>
      <div class="pts">${t.braut || 0}</div>
      <div class="pts-sub">Rundensiege</div>
      <div class="mem">${teams.braut.members.length} Mitglieder</div>
    </div>
    <div class="team-card braeutigam ${winBr?'team-winning':''}">
      <div class="nm">🤵 Team ${nameBr}</div>
      <div class="pts">${t.braeutigam || 0}</div>
      <div class="pts-sub">Rundensiege</div>
      <div class="mem">${teams.braeutigam.members.length} Mitglieder</div>
    </div>
  `;
}

function renderLeaderboard(){
  const lb = App.$("leaderboard"); if(!lb) return;
  const sorted = Object.entries(App.players).sort((a,b)=>(b[1].score||0)-(a[1].score||0));
  lb.innerHTML = sorted.map(([n, d], i)=>{
    const medal = ['🥇','🥈','🥉'][i] || ((i+1)+'. ');
    const tmLabel = d.team === "braut" ? "👰 B" : "🤵 Br";
    return `<div class="score-row ${n===App.user?'me':''}">
      <span><span class="tm ${d.team}">${tmLabel}</span>${medal}${n}</span>
      <strong>${d.score||0} Pkt</strong>
    </div>`;
  }).join("") || '<div class="sub">Noch keine Spieler</div>';
}

console.log("✅ core.js loaded");
