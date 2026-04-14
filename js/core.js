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
const ROOM = "HOCHZEIT"; // Fester Raumcode – kein Eintippen nötig

// === Globales App-Objekt ===
const App = window.App = {
  db, ref, set, onValue, update, get, remove,
  user: null, team: null, room: ROOM, isHost: false,
  state: {}, players: {}, meta: {},
  timers: [],
  listeners: {},
  $: id => document.getElementById(id),
  toast, awardScore, switchTab, clearTimers, isBeamer: false
};

function clearTimers(){ App.timers.forEach(t=>{clearInterval(t);clearTimeout(t)}); App.timers=[]; }

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

// === BEAMER-MODE CHECK ===
const urlParams = new URLSearchParams(location.search);
if(urlParams.get("beamer") === "1"){
  App.isBeamer = true;
  document.body.classList.add("beamer-mode");
  App.$("login").classList.add("hidden");
  App.$("app").classList.add("hidden");
  App.$("beamer").classList.remove("hidden");
  // Beamer verbindet sich automatisch ohne Login
  connectBeamer();
} else {
  // Normaler Login-Flow
  initLogin();
}

async function connectBeamer(){
  onValue(ref(db, `rooms/${App.room}/meta`), snap=>{
    App.meta = snap.val() || {};
    if(App.listeners.onMeta) App.listeners.onMeta();
  });
  onValue(ref(db, `rooms/${App.room}/players`), snap=>{
    App.players = snap.val() || {};
    if(App.listeners.onBeamerUpdate) App.listeners.onBeamerUpdate();
  });
  onValue(ref(db, `rooms/${App.room}/game`), snap=>{
    App.state.game = snap.val();
    if(App.listeners.onBeamerUpdate) App.listeners.onBeamerUpdate();
  });
}

// === LOGIN ===
function initLogin(){
  // Team-Auswahl
  let selectedTeam = null;
  document.querySelectorAll("[data-team]").forEach(btn=>{
    btn.onclick = ()=>{
      selectedTeam = btn.dataset.team;
      document.querySelectorAll("[data-team]").forEach(b=>{
        b.classList.remove("sel-braut", "sel-braeutigam");
      });
      btn.classList.add("sel-"+selectedTeam);
    };
  });

  // 3× Logo tippen für Host-Modus
  let taps = 0, tapTimer;
  App.$("landingLogo").addEventListener("click", ()=>{
    taps++;
    clearTimeout(tapTimer);
    tapTimer = setTimeout(()=>{ taps=0; }, 1500);
    if(taps >= 3){
      App.$("btnHost").classList.remove("hidden");
      toast("Host-Modus freigeschaltet 👑");
      taps = 0;
    }
  });

  App.$("btnJoin").onclick = ()=>start(false, selectedTeam);
  App.$("btnHost").onclick = ()=>start(true, selectedTeam);

  // Zeige Paar-Namen aus content.js wenn verfügbar
  if(window.HochzeitContent){
    const c = window.HochzeitContent;
    App.$("coupleName").innerText = `${c.braut} ♥ ${c.braeutigam}`;
  }
}

async function start(takeHost, team){
  const name = App.$("nameInp").value.trim();
  if(!name) return alert("Bitte Namen eingeben!");
  if(!team) return alert("Bitte Team wählen (Braut oder Bräutigam)!");
  App.user = name;
  App.team = team;

  // Raum initialisieren
  const metaSnap = await get(ref(db, `rooms/${App.room}/meta`));
  if(!metaSnap.exists()){
    const c = window.HochzeitContent || {};
    await set(ref(db, `rooms/${App.room}/meta`), {
      host: App.user,
      created: Date.now(),
      braut: c.braut || "Braut",
      braeutigam: c.braeutigam || "Bräutigam"
    });
  } else if(takeHost){
    await update(ref(db, `rooms/${App.room}/meta`), { host: App.user });
  }

  // Spieler speichern/updaten
  const pRef = ref(db, `rooms/${App.room}/players/${App.user}`);
  const existing = (await get(pRef)).val();
  await set(pRef, {
    team: team,
    score: existing ? (existing.score || 0) : 0,
    joined: existing ? (existing.joined || Date.now()) : Date.now()
  });

  App.$("login").classList.add("hidden");
  App.$("app").classList.remove("hidden");
  attachListeners();
  bindCoreUI();
  if(App.listeners.onReady) App.listeners.onReady();
}

function attachListeners(){
  onValue(ref(db, `rooms/${App.room}/meta`), snap=>{
    const m = snap.val() || {};
    App.meta = m;
    App.isHost = (m.host === App.user);
    const teamEmoji = App.team === "braut" ? "👰" : "🤵";
    App.$("userBadge").innerHTML =
      `<span class="badge ${App.team}">${teamEmoji} ${App.user}</span>` +
      (App.isHost ? ' <span class="badge host">(Host)</span>' : '');
    App.$("hostStatus").innerHTML = `Aktueller Host: <b>${m.host || '-'}</b>`;
    App.$("btnTakeHost").style.display = App.isHost ? "none" : "block";
    App.$("hostControls").classList.toggle("hidden", !App.isHost);
    if(m.braut) App.$("nameBraut").value = m.braut;
    if(m.braeutigam) App.$("nameBraeutigam").value = m.braeutigam;
    if(App.listeners.onMeta) App.listeners.onMeta();
  });
  onValue(ref(db, `rooms/${App.room}/players`), snap=>{
    App.players = snap.val() || {};
    renderTeamBoard();
    renderLeaderboard();
    if(App.listeners.onPlayers) App.listeners.onPlayers();
  });
}

function bindCoreUI(){
  // Tabs
  document.querySelectorAll(".tab").forEach(t=>{
    t.onclick = ()=>switchTab(t.dataset.tab);
  });

  // Host takeover
  App.$("btnTakeHost").onclick = async()=>{
    if(!confirm("Host übernehmen?")) return;
    await update(ref(db, `rooms/${App.room}/meta`), { host: App.user });
    toast("Du bist jetzt Host");
  };

  // Reset scores
  App.$("btnResetScores").onclick = async()=>{
    if(!App.isHost || !confirm("Alle Scores auf 0?")) return;
    const upd = {};
    Object.keys(App.players).forEach(p=>{ upd[`${p}/score`] = 0; });
    await update(ref(db, `rooms/${App.room}/players`), upd);
    toast("Scores zurückgesetzt");
  };

  App.$("btnFullReset").onclick = async()=>{
    if(!App.isHost || !confirm("WIRKLICH ALLES löschen? Alle Spieler fliegen raus.")) return;
    await remove(ref(db, `rooms/${App.room}`));
    location.reload();
  };

  // Namen speichern
  App.$("btnSaveNames").onclick = async()=>{
    if(!App.isHost) return;
    const b = App.$("nameBraut").value.trim();
    const br = App.$("nameBraeutigam").value.trim();
    if(b) await update(ref(db, `rooms/${App.room}/meta`), { braut: b });
    if(br) await update(ref(db, `rooms/${App.room}/meta`), { braeutigam: br });
    toast("Namen gespeichert");
  };

  // Beamer-URL anzeigen
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
  const teams = { braut: { score: 0, members: [] }, braeutigam: { score: 0, members: [] } };
  Object.entries(players).forEach(([n, p])=>{
    if(p.team === "braut" || p.team === "braeutigam"){
      teams[p.team].score += (p.score || 0);
      teams[p.team].members.push(n);
    }
  });
  const m = App.meta || {};
  const nameB = m.braut || "Braut";
  const nameBr = m.braeutigam || "Bräutigam";
  const winB = teams.braut.score > teams.braeutigam.score;
  const winBr = teams.braeutigam.score > teams.braut.score;

  board.innerHTML = `
    <div class="team-card braut ${winB?'team-winning':''}">
      <div class="nm">👰 Team ${nameB}</div>
      <div class="pts">${teams.braut.score}</div>
      <div class="mem">${teams.braut.members.length} Mitglieder</div>
    </div>
    <div class="team-card braeutigam ${winBr?'team-winning':''}">
      <div class="nm">🤵 Team ${nameBr}</div>
      <div class="pts">${teams.braeutigam.score}</div>
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
