// === games.js – Quiz-Runner: "Welcher Teen ist das?" + Schätzfragen ===
// Team-Wertung ist RELATIV (Trefferquote in %), nie absolut → kein
// Popularitäts-Contest, Teamgrösse egal. Auch das neutrale Team spielt mit.
const A = window.App, { db, ref, set, onValue, update, get, remove, $, toast, shuffle } = A;

const prevReady = A.listeners.onReady;
A.listeners.onReady = ()=>{
  if(prevReady) prevReady();

  onValue(ref(db, `rooms/${A.room}/quiz`), snap=>{
    A.state.quiz = snap.val();
    renderHostStatus();
  });

  onValue(ref(db, `rooms/${A.room}/game`), snap => {
    const prevGame = A.state.game;
    const newGame = snap.val();
    A.state.game = newGame;

    const isNewQuestionOrPhase = newGame && (!prevGame || prevGame.q !== newGame.q || prevGame.phase !== newGame.phase);
    const myPrevAns = (prevGame && prevGame.answers) ? prevGame.answers[A.user] : undefined;
    const myNewAns = (newGame && newGame.answers) ? newGame.answers[A.user] : undefined;
    const iJustAnswered = myPrevAns !== myNewAns;

    if (isNewQuestionOrPhase) {
      if (!A.isHost && !A.isBeamer) A.switchTab("Game");
      renderGame();
    } else if (iJustAnswered) {
      renderGame();
    } else {
      updateLiveCounter(newGame);
    }

    renderHostStatus();
    maybeStartClientTimer();
  });

  bindHostUI();
  populateSetDropdown();
};

function updateLiveCounter(g) {
  if (!g || g.phase !== "answer") return;
  const answered = Object.keys(g.answers || {}).length;
  const total = Object.values(A.players).length;
  document.querySelectorAll(".live-counter-text").forEach(el => {
    el.innerText = `${answered} / ${total} haben geantwortet`;
  });
}

// ═══════════════════════════════════════════════════════════
// HOST-UI
// ═══════════════════════════════════════════════════════════
function populateSetDropdown(){
  const sel = $("setSel"); if(!sel) return;
  const sets = (window.TeensContent || {}).sets || [];
  sel.innerHTML = sets.map(s=>`<option value="${s.id}">${s.label}</option>`).join("");
}

function bindHostUI(){
  $("btnStartSet").onclick = startSelectedSet;
  $("btnReveal").onclick = revealCurrent;
  $("btnNextQ").onclick = nextQuestion;
  $("btnAddTime").onclick = ()=>addTimerSeconds(10);
  $("btnEndGame").onclick = abortGame;
}

function renderHostStatus(){
  const rs = $("runningStatus");
  const q = A.state.quiz, g = A.state.game;
  if(!rs) return;

  const revealBtn = $("btnReveal"), nextBtn = $("btnNextQ"), timeBtn = $("btnAddTime");
  revealBtn.disabled = !(g && g.phase === "answer");
  timeBtn.disabled = !(g && g.phase === "answer");

  if(!q && !g && !A.state.tapduel){
    rs.innerHTML = "Kein Spiel aktiv";
    nextBtn.classList.add("hidden");
    return;
  }
  if(A.state.tapduel){
    rs.innerHTML = `⚡ Tap-Duell läuft`;
    nextBtn.classList.add("hidden");
    return;
  }
  if(q && g){
    const answered = Object.keys(g.answers || {}).length;
    const total = Object.values(A.players).length;
    rs.innerHTML = `📋 ${q.setLabel}<br>
      Frage ${q.current + 1}/${q.total} · ${answered}/${total} geantwortet<br>
      Phase: <b>${g.phase === "answer" ? "Antworten" : "Auflösung"}</b>`;
    const isLast = q.current + 1 >= q.total;
    nextBtn.classList.toggle("hidden", !(g.phase === "reveal"));
    nextBtn.innerText = g.phase === "reveal" ? (isLast ? "🏁 Quiz beenden" : "➡️ Nächste Frage") : "";
  } else if(g){
    const answered = Object.keys(g.answers || {}).length;
    const total = Object.values(A.players).length;
    rs.innerHTML = `Einzelfrage · ${answered}/${total} geantwortet · Phase: <b>${g.phase}</b>`;
    nextBtn.classList.add("hidden");
  }
}

// ═══════════════════════════════════════════════════════════
// QUIZ-SET STARTEN
// ═══════════════════════════════════════════════════════════
async function startSelectedSet(){
  if(!A.isHost) return;
  await remove(ref(db, `rooms/${A.room}/tapduel`));

  const setId = $("setSel").value;
  const sets = (window.TeensContent || {}).sets || [];
  const setDef = sets.find(s=>s.id === setId);
  if(!setDef) return toast("Set nicht gefunden");

  const questions = buildQuestionList(setDef.pick);
  if(!questions.length) return toast("Keine Fragen in diesem Set");

  const overrideTimer = parseInt($("timerOverride").value);
  const timer = !isNaN(overrideTimer) && overrideTimer > 0 ? overrideTimer : setDef.timer;

  const quiz = {
    setId, setLabel: setDef.label,
    total: questions.length,
    current: 0,
    questions,
    timer,
    startedAt: Date.now()
  };
  await set(ref(db, `rooms/${A.room}/quiz`), quiz);
  await loadQuestion(0);
  toast(`🚀 ${setDef.label} gestartet`);
}

function buildQuestionList(pick){
  const pool = (window.TeensContent || {}).questions || {};
  const out = [];

  for(const [type, amount] of Object.entries(pick)){
    if(type === "random"){
      const all = [];
      for(const [t, arr] of Object.entries(pool)){
        (arr || []).forEach(q => all.push({ ...q, type: t }));
      }
      out.push(...shuffle(all).slice(0, amount));
    } else {
      const arr = pool[type] || [];
      if(amount === "all"){
        out.push(...arr.map(q => ({ ...q, type })));
      } else {
        out.push(...arr.slice(0, amount).map(q => ({ ...q, type })));
      }
    }
  }
  return out;
}

async function loadQuestion(idx){
  if(!A.isHost) return;
  const q = (await get(ref(db, `rooms/${A.room}/quiz`))).val();
  if(!q) return;
  if(idx >= q.total){ return finishQuiz(); }

  const qData = q.questions[idx];
  const endsAt = Date.now() + q.timer * 1000;
  const game = {
    type: qData.type,
    q: qData.q,
    phase: "answer",
    startedAt: Date.now(),
    endsAt,
    answers: {},
    quizIdx: idx
  };
  if(qData.answer !== undefined) game.answer = qData.answer;
  if(qData.photoUrl) game.photoUrl = qData.photoUrl;
  if(qData.unit !== undefined) game.unit = qData.unit;

  await set(ref(db, `rooms/${A.room}/game`), game);
  await update(ref(db, `rooms/${A.room}/quiz`), { current: idx });
}

async function nextQuestion(){
  if(!A.isHost) return;
  const q = (await get(ref(db, `rooms/${A.room}/quiz`))).val();
  if(!q) return;
  const nextIdx = (q.current || 0) + 1;
  if(nextIdx >= q.total) return finishQuiz();
  await loadQuestion(nextIdx);
}

async function finishQuiz(){
  if(!A.isHost) return;
  const q = (await get(ref(db, `rooms/${A.room}/quiz`))).val();
  if(!q) return;
  await set(ref(db, `rooms/${A.room}/game`), {
    type: "_quizdone",
    q: `Quiz "${q.setLabel}" beendet`,
    phase: "reveal",
    startedAt: Date.now(),
    quizSummary: true
  });
  await remove(ref(db, `rooms/${A.room}/quiz`));
  toast("Quiz beendet");
}

async function abortGame(){
  if(!A.isHost) return;
  if(!confirm("Laufendes Spiel abbrechen?")) return;
  await remove(ref(db, `rooms/${A.room}/quiz`));
  await remove(ref(db, `rooms/${A.room}/game`));
  await remove(ref(db, `rooms/${A.room}/tapduel`));
  toast("Abgebrochen");
}

async function addTimerSeconds(sec){
  if(!A.isHost) return;
  const g = (await get(ref(db, `rooms/${A.room}/game`))).val();
  if(!g || g.phase !== "answer") return;
  await update(ref(db, `rooms/${A.room}/game`), { endsAt: (g.endsAt || Date.now()) + sec * 1000 });
  toast(`+${sec} Sek`);
}

// ═══════════════════════════════════════════════════════════
// CLIENT-TIMER
// ═══════════════════════════════════════════════════════════
function maybeStartClientTimer(){
  A.clearTimers();
  const g = A.state.game;
  if(!g || g.phase !== "answer" || !g.endsAt) return;

  const tick = ()=>{
    const left = Math.max(0, g.endsAt - Date.now());
    updateTimerDisplay(left, g.endsAt - g.startedAt);
    if(left <= 0){
      A.clearTimers();
      const num = document.getElementById("timerNum");
      if(num) num.innerText = "⏳";
    }
  };
  tick();
  A.timers.push(setInterval(tick, 250));
}

function updateTimerDisplay(leftMs, totalMs){
  const leftSec = Math.ceil(leftMs / 1000);
  const pct = totalMs > 0 ? (leftMs / totalMs) * 100 : 0;
  const fill = document.getElementById("timerFill");
  const num = document.getElementById("timerNum");
  if(fill){
    fill.style.width = pct + "%";
    fill.classList.toggle("warn", leftSec <= 10 && leftSec > 5);
    fill.classList.toggle("crit", leftSec <= 5);
  }
  if(num) num.innerText = leftSec + "s";
}

// ═══════════════════════════════════════════════════════════
// PLAYER-SICHT: Aktuelles Spiel
// ═══════════════════════════════════════════════════════════
function renderGame(){
  const g = A.state.game, q = A.state.quiz, tap = A.state.tapduel;
  const panel = $("gamePanel"), wait = $("gameWait");

  if(tap){
    panel.classList.add("hidden");
    wait.classList.add("hidden");
    return;
  }

  if(!g){
    panel.classList.add("hidden");
    wait.classList.remove("hidden");
    return;
  }
  panel.classList.remove("hidden");
  wait.classList.add("hidden");
  const body = $("gameBody");

  if(g.type === "_quizdone"){
    body.innerHTML = renderQuizSummary();
    return;
  }

  const myAns = (g.answers || {})[A.user];
  let html = "";

  if(q){
    html += `<div class="q-num">Frage ${q.current + 1} / ${q.total}</div>`;
  }
  html += `<div class="q-big">${g.q}</div>`;

  if(g.type === "guess" && g.photoUrl){
    html += `<div class="photo-box"><img src="${g.photoUrl}" alt="" onerror="this.parentElement.innerHTML='<div class=&quot;ph&quot;>📷</div>'"></div>`;
  }

  if(g.phase === "answer"){
    if(g.endsAt){
      html += `<div class="timer-num" id="timerNum"></div>
        <div class="timer-bar"><div class="fill" id="timerFill"></div></div>`;
    }

    const cnt = Object.keys(g.answers || {}).length;
    const total = Object.values(A.players).length;

    if(A.isHost){
      html += `<div class="flash gold">👑 Du bist Host – du spielst nicht mit.</div>`;
      html += `<div class="flash live-counter-text">${cnt} / ${total} haben geantwortet</div>`;
      html += `<div class="sub" style="text-align:center">Steuerung im Host-Tab unten</div>`;
    } else if(myAns !== undefined){
      const label = labelForAnswer(g, myAns);
      html += `<div class="flash">✅ Deine Antwort: <b>${label}</b></div>`;
      html += `<div class="sub live-counter-text" style="text-align:center">${cnt} / ${total} haben geantwortet</div>`;
    } else {
      html += buildAnswerInput(g);
      html += `<div class="sub live-counter-text" style="text-align:center; margin-top: 15px;">${cnt} / ${total} haben geantwortet</div>`;
    }
  }
  else if(g.phase === "reveal"){
    html += buildRevealView(g);
  }

  body.innerHTML = html;
  wireAnswerInputs(g);
}

function labelForAnswer(g, ans){
  if(g.type === "guess") return A.teamName(ans);
  if(g.type === "estimate") return g.unit ? `${ans} ${g.unit}` : String(ans);
  return String(ans);
}

function buildAnswerInput(g){
  if(g.type === "guess"){
    // Ein Button pro Teen (das neutrale Team ist keine Antwortmöglichkeit)
    const btns = A.teensOnly().map(t => `
      <button class="teen-btn" data-send="${t.id}" style="--tcol:${t.color}">
        <span class="te">${t.emoji}</span>${t.name}
      </button>`).join("");
    return `<div class="teen-grid" style="margin-top:16px">${btns}</div>`;
  }
  if(g.type === "estimate"){
    return `<input id="estInp" type="number" step="any" placeholder="Deine Schätzung${g.unit?' ('+g.unit+')':''}" autofocus>
      <button class="btn-green" id="estSend">Antwort senden</button>`;
  }
  return "";
}

function wireAnswerInputs(g){
  document.querySelectorAll("[data-send]").forEach(btn=>{
    btn.onclick = async()=>{
      await set(ref(db, `rooms/${A.room}/game/answers/${A.user}`), btn.dataset.send);
    };
  });
  const es = $("estSend");
  if(es) es.onclick = async()=>{
    const v = parseFloat($("estInp").value);
    if(isNaN(v)) return toast("Bitte Zahl eingeben!");
    await set(ref(db, `rooms/${A.room}/game/answers/${A.user}`), v);
  };
  const inp = $("estInp");
  if(inp) inp.onkeydown = e=>{ if(e.key === "Enter") es.click(); };
}

// ═══════════════════════════════════════════════════════════
// AUFLÖSUNG – Batch-Score-Update für viele Gäste
// teamStats pro Team (Teens + neutral); Rundensieg = höchste QUOTE.
// ═══════════════════════════════════════════════════════════
async function revealCurrent() {
  if (!A.isHost) return;
  const g = (await get(ref(db, `rooms/${A.room}/game`))).val();
  if (!g || g.phase !== "answer") return;

  const answers = g.answers || {};
  const players = A.players || {};
  const teamIds = A.allTeams().map(t => t.id);

  // teamStats: für jedes Team correct/total/rate
  const teamStats = {};
  teamIds.forEach(id => teamStats[id] = { correct: 0, total: 0, rate: 0 });
  // breakdown: wie oft wurde welcher Teen getippt (Antwort-Verteilung)
  const breakdown = {};
  const ranking = [];

  const scoreDeltas = {};
  const addScore = (uid, pts) => { scoreDeltas[uid] = (scoreDeltas[uid] || 0) + pts; };

  for (const [uid, ans] of Object.entries(answers)) {
    const p = players[uid];
    if (!p) continue;
    breakdown[ans] = (breakdown[ans] || 0) + 1;
    if (p.team && teamStats[p.team]) teamStats[p.team].total++;

    if (g.type === "estimate") {
      const diff = Math.abs(ans - g.answer);
      ranking.push({ uid, p: p.name || uid.split('_')[0], team: p.team, v: ans, diff });
    }
  }

  let winner = null;
  let finalCorrectAnswer = g.answer;

  if (g.type === "estimate") {
    // ── SCHÄTZFRAGE: Top 3 punkten, Rundensieg = Team des Siegers ──
    ranking.sort((a, b) => a.diff - b.diff);
    let currentPts = 3;
    let lastDiff = ranking.length > 0 ? ranking[0].diff : -1;
    let rankPosition = 0;
    for (let i = 0; i < ranking.length; i++) {
      if (ranking[i].diff > lastDiff) {
        rankPosition++;
        currentPts = 3 - rankPosition;
        lastDiff = ranking[i].diff;
      }
      if (currentPts <= 0) break;
      addScore(ranking[i].uid, currentPts);
      ranking[i].awardedPts = currentPts;
    }
    if (ranking.length > 0) {
      const bestDiff = ranking[0].diff;
      const topWinners = ranking.filter(r => r.diff === bestDiff);
      // Team mit den meisten Top-Tippern gewinnt die Runde (Gleichstand → keiner)
      const byTeam = {};
      topWinners.forEach(r => { if(r.team) byTeam[r.team] = (byTeam[r.team]||0)+1; });
      winner = pickMax(byTeam);
    }
  } else {
    // ── RATEN ("Welcher Teen?"): richtig wenn ans === g.answer ──
    for (const [uid, ans] of Object.entries(answers)) {
      if (ans === g.answer) {
        const p = players[uid];
        if (p) {
          if (p.team && teamStats[p.team]) teamStats[p.team].correct++;
          addScore(uid, 1);
        }
      }
    }
    // Rundensieg = höchste TREFFERQUOTE (relativ, Teamgrösse egal)
    const rates = {};
    teamIds.forEach(id => {
      const ts = teamStats[id];
      ts.rate = ts.total > 0 ? ts.correct / ts.total : 0;
      if (ts.total > 0) rates[id] = ts.rate;
    });
    winner = pickMaxStrict(rates);
  }

  // ── BATCH: alle Punkte in einem einzigen Firebase-Update ──
  if (Object.keys(scoreDeltas).length > 0) {
    const scoreUpdates = {};
    for (const [uid, delta] of Object.entries(scoreDeltas)) {
      scoreUpdates[`${uid}/score`] = (players[uid]?.score || 0) + delta;
    }
    await update(ref(db, `rooms/${A.room}/players`), scoreUpdates);
  }

  if (winner) {
    const tRef = ref(db, `rooms/${A.room}/teams/${winner}`);
    const cur = (await get(tRef)).val() || 0;
    await set(tRef, cur + 1);
  }

  await update(ref(db, `rooms/${A.room}/game`), {
    phase: "reveal",
    answer: finalCorrectAnswer,
    result: { teamStats, breakdown, ranking, roundWinner: winner }
  });
}

// Höchster Wert; bei Gleichstand an der Spitze → null (kein Sieger)
function pickMaxStrict(obj){
  const entries = Object.entries(obj);
  if(!entries.length) return null;
  let best = -Infinity, who = null, tie = false;
  for(const [k,v] of entries){
    if(v > best){ best = v; who = k; tie = false; }
    else if(v === best){ tie = true; }
  }
  return tie ? null : who;
}
function pickMax(obj){ return pickMaxStrict(obj); }

// ═══════════════════════════════════════════════════════════
// AUFLÖSUNGS-ANSICHT (Spieler)
// ═══════════════════════════════════════════════════════════
function buildRevealView(g){
  const r = g.result || {};
  let html = "";

  if (!A.isHost && !A.isBeamer) {
    const myAns = (g.answers || {})[A.user];
    if (g.type === "estimate") {
       const myEntry = (r.ranking || []).find(e => e.uid === A.user);
       if (myEntry && myEntry.awardedPts) {
         html += `<div class="flash gold" style="text-align:center;font-size:1.1rem">🎉 Stark geschätzt! Du holst <b>+${myEntry.awardedPts} Punkte</b>!</div>`;
       } else if (myAns !== undefined) {
         html += `<div class="flash" style="text-align:center">Guter Versuch, aber nicht in den Punkterängen.</div>`;
       }
    } else {
       if (myAns === g.answer) {
         html += `<div class="flash gold" style="text-align:center;font-size:1.1rem">🎉 Richtig! <b>+1 Punkt</b> für dich!</div>`;
       } else if (myAns !== undefined) {
         html += `<div class="flash warn" style="text-align:center;font-size:1.1rem">❌ Leider falsch!</div>`;
       } else {
         html += `<div class="flash" style="text-align:center;opacity:.7">Du hast keine Antwort abgegeben.</div>`;
       }
    }
  }

  if(g.type === "guess"){
    const correct = A.teamById(g.answer) || {};
    html += `<div class="flash gold"><b>✓ Richtig:</b> ${correct.emoji||''} ${correct.name||g.answer}</div>`;
    html += buildDistribution(r.breakdown || {}, g.answer);
    if(r.teamStats){
      html += `<h3>Trefferquote pro Fan-Team:</h3>`;
      A.allTeams().forEach(t=>{
        const ts = r.teamStats[t.id]; if(!ts || ts.total === 0) return;
        const win = r.roundWinner === t.id;
        html += `<div class="score-row ${win?'me':''}">
          <span><span class="tm" style="background:${t.color}">${t.emoji}</span>${t.name}</span>
          <strong>${ts.correct}/${ts.total} (${(ts.rate*100).toFixed(0)}%)</strong>
        </div>`;
      });
    }
  }
  else if(g.type === "estimate"){
    html += `<div class="flash gold"><b>✓ Richtige Antwort:</b> ${g.answer}${g.unit ? ' ' + g.unit : ''}</div>`;
    if(r.ranking && r.ranking.length){
      html += `<h3>Näher dran – besser:</h3>`;
      r.ranking.slice(0, 8).forEach((e) => {
        let medal = "🔹";
        if (e.awardedPts === 3) medal = "🥇";
        if (e.awardedPts === 2) medal = "🥈";
        if (e.awardedPts === 1) medal = "🥉";
        const ptsStr = e.awardedPts ? `+${e.awardedPts}` : '';
        html += `<div class="score-row"><span><span class="tm" style="background:${A.teamColor(e.team)}">${A.teamEmoji(e.team)}</span>${medal} ${e.p}: ${e.v}${g.unit?' '+g.unit:''} <span class="sub">(Δ ${e.diff.toFixed(1)})</span></span><strong>${ptsStr}</strong></div>`;
      });
    } else {
      html += `<div class="flash warn">Niemand hat geantwortet</div>`;
    }
  }

  if(r.roundWinner){
    const t = A.teamById(r.roundWinner) || {};
    html += `<div class="flash gold" style="text-align:center;font-size:1.05rem;margin-top:14px">
      🏆 Rundensieg für ${t.emoji||''} <b>${t.name||r.roundWinner}</b>!
    </div>`;
  } else {
    html += `<div class="flash" style="text-align:center">Unentschieden – keine Rundenpunkte</div>`;
  }

  return html;
}

// Antwort-Verteilung als gestapelter Balken über alle getippten Teens
function buildDistribution(breakdown, correctId){
  const teens = A.teensOnly();
  const total = teens.reduce((s,t)=>s + (breakdown[t.id]||0), 0) || 1;
  const segs = teens.map(t=>{
    const c = breakdown[t.id] || 0;
    const pct = c / total * 100;
    if(pct === 0) return "";
    const ring = t.id === correctId ? "box-shadow:inset 0 0 0 3px var(--gold)" : "";
    return `<div class="rb" style="width:${pct}%;background:${t.color};color:#111;${ring}" title="${t.name}">${c>0?c:''}</div>`;
  }).join("");
  const legend = teens.filter(t=>breakdown[t.id]).map(t=>
    `<span style="white-space:nowrap"><span class="dot" style="background:${t.color}"></span>${t.name} (${breakdown[t.id]||0})</span>`
  ).join(" ");
  return `<div class="result-bar">${segs}</div>
    <div class="legend">${legend || '<span class="sub">Keine Antworten</span>'}</div>`;
}

function renderQuizSummary(){
  const wins = A.teams || {};
  const teamsSorted = A.allTeams().slice().sort((a,b)=>(wins[b.id]||0)-(wins[a.id]||0));
  const topPlayers = Object.entries(A.players || {})
    .sort((a,b)=>(b[1].score||0)-(a[1].score||0)).slice(0, 5);
  const maxWins = Math.max(0, ...teamsSorted.map(t=>wins[t.id]||0));

  let html = `<div class="q-big">🏁 Quiz beendet!</div>`;
  html += `<h3>Rundensiege der Fan-Teams</h3><div class="team-board">`;
  html += teamsSorted.map(t=>{
    const w = wins[t.id]||0;
    const lead = w>0 && w===maxWins;
    return `<div class="team-card ${lead?'team-winning':''}" style="--tcol:${t.color}">
      <div class="nm">${t.emoji} ${t.name}</div>
      <div class="pts" style="color:${t.color}">${w}</div>
      <div class="pts-sub">Rundensiege</div>
    </div>`;
  }).join("");
  html += `</div>`;
  if(topPlayers.length){
    html += `<h3>Top-Tipper</h3>` + topPlayers.map(([n,d],i)=>{
      const medal = ['🥇','🥈','🥉'][i] || ((i+1)+'.');
      const displayName = d.name || n.split('_')[0];
      return `<div class="score-row"><span><span class="tm" style="background:${A.teamColor(d.team)}">${A.teamEmoji(d.team)}</span>${medal} ${displayName}</span><strong>${d.score||0} Pkt</strong></div>`;
    }).join("");
  }
  return html;
}

console.log("✅ games.js loaded (Teens)");
