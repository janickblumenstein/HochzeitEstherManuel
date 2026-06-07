// === tapduel.js – Zwischenspiel: Tap-Duell aller Fan-Teams ===
// Gewinner = Team mit dem höchsten Schnitt PRO PERSON (Teamgrösse egal).
const A = window.App, { db, ref, set, onValue, update, get, remove, $, toast } = A;

const DURATION_SEC = 15;
let hostTimer = null;
let currentPhase = null;

const prevReady = A.listeners.onReady;
A.listeners.onReady = ()=>{
  if(prevReady) prevReady();

  onValue(ref(db, `rooms/${A.room}/tapduel`), snap => {
    const d = snap.val();
    A.state.tapduel = d;

    if (d) {
      A.switchTab("Game");
    } else {
      if (currentPhase !== null) {
        if (A.isHost) A.switchTab("Host");
        else if (!A.isBeamer) A.switchTab("Score");
      }
      currentPhase = null;
    }

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
          if(A.state.tapduel?.phase === "running") finishTapDuel();
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

// Aggregiert Taps zu { teamId: { sum, n, avg } } über alle Teams
function aggregate(taps){
  const ts = {};
  A.allTeams().forEach(t => ts[t.id] = { sum: 0, n: 0, avg: 0 });
  for(const [p, c] of Object.entries(taps || {})){
    const team = (A.players[p] || {}).team;
    if(!team || !ts[team]) continue;
    ts[team].sum += c; ts[team].n++;
  }
  Object.values(ts).forEach(s => s.avg = s.n > 0 ? s.sum / s.n : 0);
  return ts;
}

async function finishTapDuel() {
  if (!A.isHost) return;
  const snap = await get(ref(db, `rooms/${A.room}/tapduel`));
  const d = snap.val();
  if (!d || d.phase !== "running") return;

  const taps = d.taps || {};
  const players = A.players || {};
  const teamStats = aggregate(taps);
  const tappers = [];
  for (const [uid, count] of Object.entries(taps)) {
    const p = players[uid];
    if (p && count > 0) tappers.push({ uid, name: p.name || uid.split('_')[0], count, team: p.team });
  }

  // Gewinner = höchster Schnitt pro Person (Gleichstand → keiner)
  let winner = null, best = -1, tie = false;
  A.allTeams().forEach(t=>{
    const s = teamStats[t.id];
    if(s.n === 0) return;
    if(s.avg > best){ best = s.avg; winner = t.id; tie = false; }
    else if(s.avg === best){ tie = true; }
  });
  if(tie) winner = null;

  if (winner) {
    const tRef = ref(db, `rooms/${A.room}/teams/${winner}`);
    const cur = (await get(tRef)).val() || 0;
    await set(tRef, cur + 1);
  }

  // Punkte für die schnellsten Finger
  tappers.sort((a, b) => b.count - a.count);
  const topTappers = [];
  const points = [10, 5, 3];
  let currentRank = 0;
  let lastCount = tappers.length > 0 ? tappers[0].count : -1;
  const scoreDeltas = {};
  for (let i = 0; i < tappers.length; i++) {
    if (tappers[i].count < lastCount) { currentRank++; lastCount = tappers[i].count; }
    if (currentRank > 2) break;
    const pts = points[currentRank];
    scoreDeltas[tappers[i].uid] = pts;
    tappers[i].pts = pts;
    topTappers.push(tappers[i]);
  }

  if (Object.keys(scoreDeltas).length > 0) {
    const scoreUpdates = {};
    for (const [uid, delta] of Object.entries(scoreDeltas)) {
      scoreUpdates[`${uid}/score`] = (players[uid]?.score || 0) + delta;
    }
    await update(ref(db, `rooms/${A.room}/players`), scoreUpdates);
  }

  await update(ref(db, `rooms/${A.room}/tapduel`), { phase: "done", teamStats, winner, topTappers });
}

function render(){
  const d = A.state.tapduel;
  const panel = $("tapPanel"), wait = $("gameWait"), gamePanel = $("gamePanel");
  if(!d){ panel.classList.add("hidden"); return; }

  panel.classList.remove("hidden");
  wait.classList.add("hidden");
  gamePanel.classList.add("hidden");

  const body = $("tapBody");
  const myTeam = A.team;
  const myCount = ((d.taps || {})[A.user]) || 0;

  if(d.phase === "countdown"){
    const left = Math.max(0, Math.ceil((d.startsAt - Date.now()) / 1000));
    body.innerHTML = `<div class="q-big">⚡ Tap-Duell!</div>
      <div class="sub" style="text-align:center">Gleich geht's los — tippt so schnell ihr könnt!</div>
      <div class="tap-count">${left}</div>
      <div class="sub" style="text-align:center">Team mit den meisten Taps pro Person gewinnt 1 Rundensieg</div>`;
    A.clearTimers();
    A.timers.push(setInterval(render, 250));
    return;
  }

  if(d.phase === "running"){
    const leftMs = Math.max(0, d.endsAt - Date.now());
    const leftSec = Math.ceil(leftMs / 1000);
    const pct = (leftMs / (DURATION_SEC * 1000)) * 100;
    const isHost = A.isHost;
    const tcol = A.teamColor(myTeam);
    const teamLabel = myTeam ? `${A.teamEmoji(myTeam)} ${A.teamName(myTeam)}` : "(Host)";

    let html = `<div class="q-big">⚡ GO GO GO!</div>
      <div class="timer-num" id="tapTimer">${leftSec}s</div>
      <div class="timer-bar"><div class="fill" id="tapTimerBar" style="width:${pct}%"></div></div>`;

    if(isHost){
      const ts = aggregate(d.taps);
      html += `<div class="team-board">` + A.allTeams().map(t=>{
        const s = ts[t.id];
        return `<div class="team-card" style="--tcol:${t.color}">
          <div class="nm">${t.emoji} ${t.name}</div>
          <div class="pts" style="color:${t.color}">${s.sum}</div>
          <div class="pts-sub">Ø ${s.avg.toFixed(1)} pro Person</div>
        </div>`;
      }).join("") + `</div>`;
    } else {
      html += `<div class="tap-count" style="color:${tcol}">${myCount}</div>
        <button class="tap-btn teen-btn" style="--tcol:${tcol};font-size:2rem;padding:50px 20px" id="tapBtn">TAP! ${teamLabel}</button>`;
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

  if(d.phase === "done"){
    const ts = d.teamStats || {};
    const winner = d.winner;
    let html = `<div class="q-big">⚡ Tap-Duell beendet!</div>`;
    html += `<div class="team-board">` + A.allTeams().map(t=>{
      const s = ts[t.id] || {};
      const win = winner === t.id;
      return `<div class="team-card ${win?'team-winning':''}" style="--tcol:${t.color}">
        <div class="nm">${t.emoji} ${t.name}</div>
        <div class="pts" style="color:${t.color}">${(s.avg||0).toFixed(1)}</div>
        <div class="pts-sub">Ø Taps pro Person</div>
        <div class="mem">(${s.sum||0} total, ${s.n||0} dabei)</div>
      </div>`;
    }).join("") + `</div>`;

    if (d.topTappers && d.topTappers.length > 0) {
      html += `<h3 style="text-align:center;margin-top:24px;color:var(--gold)">🔥 Die schnellsten Finger</h3>`;
      d.topTappers.forEach((t) => {
        let medal = "🔹";
        if (t.pts === 10) medal = "🥇";
        if (t.pts === 5) medal = "🥈";
        if (t.pts === 3) medal = "🥉";
        const isMe = t.uid === A.user ? 'style="border:1px solid var(--gold);background:rgba(212,175,55,.15)"' : '';
        html += `<div class="score-row" ${isMe}>
          <span>${medal} ${t.name} <span class="sub">(${t.count} Taps)</span></span>
          <strong style="color:var(--gold)">+${t.pts} Pkt</strong>
        </div>`;
      });
    }

    if(winner){
      const t = A.teamById(winner) || {};
      html += `<div class="flash gold" style="text-align:center;font-size:1.05rem;margin-top:14px">
        🏆 Rundensieg für ${t.emoji||''} <b>${t.name||winner}</b>!
      </div>`;
    } else {
      html += `<div class="flash">Unentschieden – keiner kriegt den Punkt</div>`;
    }

    if(A.isHost){
      html += `<button class="btn-ghost" id="tapClose" style="margin-top:15px">Schliessen</button>`;
    }

    body.innerHTML = html;
    const cl = $("tapClose");
    if(cl) cl.onclick = ()=>remove(ref(db, `rooms/${A.room}/tapduel`));
    A.clearTimers();
  }
}

console.log("✅ tapduel.js loaded (Teens)");
