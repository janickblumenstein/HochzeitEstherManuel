// === tapduel.js – Zwischenspiel: Tap-Duell Braut vs. Bräutigam ===
const A = window.App, { db, ref, set, onValue, update, get, remove, $, toast } = A;

const DURATION_SEC = 15;
let hostTimer = null; 
let currentPhase = null; // Merkt sich die aktuelle Phase für die Spieler

const prevReady = A.listeners.onReady;
A.listeners.onReady = ()=>{
  if(prevReady) prevReady();

  onValue(ref(db, `rooms/${A.room}/tapduel`), snap => {
    const d = snap.val();
    A.state.tapduel = d;

    if (d) {
      A.switchTab("Game"); 
    } else {
      // 🚀 NEU: Automatischer Rücksprung, wenn das Spiel geschlossen wird!
      if (currentPhase !== null) {
        if (A.isHost) {
          A.switchTab("Host");  // Host geht zurück ins Steuer-Panel
        } else if (!A.isBeamer) {
          A.switchTab("Score"); // Gäste gehen auf die Rangliste
        }
      }
      currentPhase = null; // Reset
    }

    // 🚀 DER 80-GÄSTE PERFORMANCE FIX 🚀
    // Ignoriert Firebase-Updates während des Tippens, um Ruckeln zu verhindern
    if (!A.isHost && !A.isBeamer && d && d.phase === "running" && currentPhase === "running") {
      return; 
    }

    currentPhase = d ? d.phase : null;

    render();
    renderHostButton();

    if (A.isHost && d) {
      if (hostTimer) clearTimeout(hostTimer); 

      if (d.phase === "countdown") {
        const left = Math.max(0, d.startsAt - Date.now());
        hostTimer = setTimeout(() => {
          if(A.state.tapduel?.phase === "countdown") {
            update(ref(db, `rooms/${A.room}/tapduel`), { phase: "running" });
          }
        }, left);
      }
      else if (d.phase === "running") {
        const left = Math.max(0, d.endsAt - Date.now());
        hostTimer = setTimeout(() => {
          if(A.state.tapduel?.phase === "running") {
            finishTapDuel();
          }
        }, left);
      }
    }
  });

  const btn = $("btnStartTap");
  if(btn) btn.onclick = startTapDuel;
};

function renderHostButton(){
  const btn = $("btnStartTap");
  if(!btn) return;
  btn.disabled = !!A.state.tapduel;
}

async function startTapDuel(){
  if(!A.isHost) return;
  await remove(ref(db, `rooms/${A.room}/quiz`));
  await remove(ref(db, `rooms/${A.room}/game`));

  const startsAt = Date.now() + 3000; 
  await set(ref(db, `rooms/${A.room}/tapduel`), {
    phase: "countdown",
    startsAt,
    endsAt: startsAt + DURATION_SEC * 1000,
    taps: {}
  });
  toast("⚡ Tap-Duell: Los in 3 Sek!");
}

async function finishTapDuel() {
  if (!A.isHost) return;
  const snap = await get(ref(db, `rooms/${A.room}/tapduel`));
  const d = snap.val();
  if (!d || d.phase !== "running") return;

  const taps = d.taps || {};
  const players = A.players || {};
  const teamStats = { braut: { sum: 0, n: 0 }, braeutigam: { sum: 0, n: 0 } };

  for (const [uid, count] of Object.entries(taps)) {
    const p = players[uid];
    if (p && count > 0) {
      teamStats[p.team].sum += count;
      teamStats[p.team].n++;
    }
  }

  for (const k of ["braut", "braeutigam"]) {
    teamStats[k].avg = teamStats[k].n > 0 ? teamStats[k].sum / teamStats[k].n : 0;
  }

  const winner = teamStats.braut.avg > teamStats.braeutigam.avg ? "braut" :
                 teamStats.braeutigam.avg > teamStats.braut.avg ? "braeutigam" : null;

  if (winner) {
    const tRef = ref(db, `rooms/${A.room}/teams/${winner}`);
    const cur = (await get(tRef)).val() || 0;
    await set(tRef, cur + 1);
  }

  await update(ref(db, `rooms/${A.room}/tapduel`), {
    phase: "done",
    teamStats, winner
  });
}

function render(){
  const d = A.state.tapduel;
  const panel = $("tapPanel"), wait = $("gameWait"), gamePanel = $("gamePanel");
  if(!d){
    panel.classList.add("hidden");
    return;
  }
  
  panel.classList.remove("hidden");
  wait.classList.add("hidden");
  gamePanel.classList.add("hidden");

  const body = $("tapBody");
  const m = A.meta || {};
  const nameB = m.braut || "Braut";
  const nameBr = m.braeutigam || "Bräutigam";
  const myTeam = A.team;
  const myCount = ((d.taps || {})[A.user]) || 0;

  // ── COUNTDOWN ──
  if(d.phase === "countdown"){
    const left = Math.max(0, Math.ceil((d.startsAt - Date.now()) / 1000));
    body.innerHTML = `<div class="q-big">⚡ Tap-Duell!</div>
      <div class="sub" style="text-align:center">Team ${nameB} vs Team ${nameBr}<br>Gleich geht's los — tippt so schnell ihr könnt!</div>
      <div class="tap-count">${left}</div>
      <div class="sub" style="text-align:center">Team mit den meisten Taps pro Person gewinnt 1 Rundensieg</div>`;

    A.clearTimers();
    A.timers.push(setInterval(render, 250));
    return;
  }

  // ── RUNNING ──
  if(d.phase === "running"){
    const leftMs = Math.max(0, d.endsAt - Date.now());
    const leftSec = Math.ceil(leftMs / 1000);
    const pct = (leftMs / (DURATION_SEC * 1000)) * 100;
    const isHost = A.isHost;
    const teamClass = myTeam || "braut";
    const teamLabel = myTeam === "braut" ? `👰 ${nameB}` : myTeam === "braeutigam" ? `🤵 ${nameBr}` : "(Host)";

    let html = `<div class="q-big">⚡ GO GO GO!</div>
      <div class="timer-num" id="tapTimer">${leftSec}s</div>
      <div class="timer-bar"><div class="fill" id="tapTimerBar" style="width:${pct}%"></div></div>`;

    if(isHost){
      const taps = d.taps || {};
      const ts = { braut: { sum:0, n:0 }, braeutigam: { sum:0, n:0 } };
      for(const [p, c] of Object.entries(taps)){
        const t = (A.players[p] || {}).team;
        if(!t || !ts[t]) continue;
        ts[t].sum += c; ts[t].n++;
      }
      const avgB = ts.braut.n ? (ts.braut.sum / ts.braut.n).toFixed(1) : "0";
      const avgBr = ts.braeutigam.n ? (ts.braeutigam.sum / ts.braeutigam.n).toFixed(1) : "0";
      html += `<div class="team-board">
        <div class="team-card braut">
          <div class="nm">👰 ${nameB}</div>
          <div class="pts">${ts.braut.sum}</div>
          <div class="pts-sub">Ø ${avgB} pro Person</div>
        </div>
        <div class="team-card braeutigam">
          <div class="nm">🤵 ${nameBr}</div>
          <div class="pts">${ts.braeutigam.sum}</div>
          <div class="pts-sub">Ø ${avgBr} pro Person</div>
        </div>
      </div>`;
    } else {
      html += `<div class="tap-count ${teamClass}">${myCount}</div>
        <button class="tap-btn btn-${teamClass}" id="tapBtn">TAP! ${teamLabel}</button>`;
    }

    body.innerHTML = html;

    A.clearTimers();
    A.timers.push(setInterval(()=>{
      const l = Math.max(0, d.endsAt - Date.now());
      const s = Math.ceil(l / 1000);
      const p = (l / (DURATION_SEC * 1000)) * 100;
      const tn = $("tapTimer"), tb = $("tapTimerBar");
      if(tn) tn.innerText = s + "s";
      if(tb) tb.style.width = p + "%";
      if(l <= 0) A.clearTimers();
      if(isHost && (A.timers.length % 4 === 0)) render(); 
    }, 250));

    const btn = $("tapBtn");
    if(btn && !isHost){
      let localCount = myCount;
      let pending = false;
      const flush = ()=>{
        if(pending) return;
        pending = true;
        setTimeout(async()=>{
          await set(ref(db, `rooms/${A.room}/tapduel/taps/${A.user}`), localCount);
          pending = false;
        }, 1000); 
      };
      
      btn.onclick = ()=>{
        if(Date.now() >= d.endsAt) return; 
        localCount++;
        const disp = document.querySelector(".tap-count");
        if(disp) disp.innerText = localCount; 
        flush(); 
      };
    }
    return;
  }

  // ── DONE ──
  if(d.phase === "done"){
    const ts = d.teamStats || { braut: {}, braeutigam: {} };
    const winner = d.winner;
    const wName = winner === "braut" ? nameB : winner === "braeutigam" ? nameBr : null;
    let html = `<div class="q-big">⚡ Tap-Duell beendet!</div>`;
    
    html += `<div class="team-board">
      <div class="team-card braut ${winner==="braut"?"team-winning":""}">
        <div class="nm">👰 ${nameB}</div>
        <div class="pts">${(ts.braut.avg||0).toFixed(1)}</div>
        <div class="pts-sub">Ø Taps pro Person</div>
        <div class="mem">(${ts.braut.sum||0} insgesamt, ${ts.braut.n||0} Teilnehmer)</div>
      </div>
      <div class="team-card braeutigam ${winner==="braeutigam"?"team-winning":""}">
        <div class="nm">🤵 ${nameBr}</div>
        <div class="pts">${(ts.braeutigam.avg||0).toFixed(1)}</div>
        <div class="pts-sub">Ø Taps pro Person</div>
        <div class="mem">(${ts.braeutigam.sum||0} insgesamt, ${ts.braeutigam.n||0} Teilnehmer)</div>
      </div>
    </div>`;

    if(wName){
      html += `<div class="flash gold" style="text-align:center;font-size:1.05rem;margin-top:14px">
        🏆 Rundensieg für Team ${winner==="braut"?"👰":"🤵"} <b>${wName}</b>!
      </div>`;
    } else {
      html += `<div class="flash">Unentschieden – keiner kriegt den Punkt</div>`;
    }

    if(A.isHost){
      html += `<button class="btn-ghost" id="tapClose" style="margin-top: 15px">Schliessen</button>`;
    }
    
    body.innerHTML = html;
    
    const cl = $("tapClose");
    if(cl) cl.onclick = ()=>remove(ref(db, `rooms/${A.room}/tapduel`));
    A.clearTimers();
  }
}

console.log("✅ tapduel.js loaded");