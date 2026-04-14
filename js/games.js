// === games.js – Quiz-Runner mit Sets, Timer und fairer Team-Wertung ===
const A = window.App, { db, ref, set, onValue, update, get, remove, $, toast, awardScore, shuffle } = A;

const prevReady = A.listeners.onReady;
A.listeners.onReady = ()=>{
  if(prevReady) prevReady();
  
  // 1. Dieser Block bleibt unverändert (wichtig für die Host-Anzeige)
  onValue(ref(db, `rooms/${A.room}/quiz`), snap=>{
    A.state.quiz = snap.val();
    renderHostStatus();
  });
  
  // 2. Das ist unser neuer, schlauer Block für das aktuelle Spiel
  onValue(ref(db, `rooms/${A.room}/game`), snap => {
    const prevGame = A.state.game;
    const newGame = snap.val();
    A.state.game = newGame;
    
    const isNewQuestionOrPhase = newGame && (!prevGame || prevGame.q !== newGame.q || prevGame.phase !== newGame.phase);
    
    // Hat der aktuelle Spieler gerade SEINE EIGENE Antwort abgeschickt?
    const myPrevAns = (prevGame && prevGame.answers) ? prevGame.answers[A.user] : undefined;
    const myNewAns = (newGame && newGame.answers) ? newGame.answers[A.user] : undefined;
    const iJustAnswered = myPrevAns !== myNewAns;

    if (isNewQuestionOrPhase) {
      if (!A.isHost && !A.isBeamer) A.switchTab("Game");
      renderGame();
    } else if (iJustAnswered) {
      // Wenn ich selbst gedrückt habe, muss die Ansicht wechseln (zeigt "✅ Deine Antwort")
      renderGame();
    } else {
      // Wenn andere antworten, während ich noch überlege: Nur den Zähler updaten!
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
  const counterEls = document.querySelectorAll(".live-counter-text");
  counterEls.forEach(el => {
    el.innerText = `${answered} / ${total} haben geantwortet`;
  });
}

// ═══════════════════════════════════════════════════════════
// HOST-UI
// ═══════════════════════════════════════════════════════════
function populateSetDropdown(){
  const sel = $("setSel"); if(!sel) return;
  const sets = (window.HochzeitContent || {}).sets || [];
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
  const sets = (window.HochzeitContent || {}).sets || [];
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
  // A.switchTab("Game"); <-- Wurde entfernt, Host bleibt jetzt sauber im Host-Tab
}

function buildQuestionList(pick){
  const pool = (window.HochzeitContent || {}).questions || {};
  const out = [];
  for(const [type, amount] of Object.entries(pick)){
    if(type === "random"){
      const all = [];
      for(const [t, arr] of Object.entries(pool)){
        (arr || []).forEach(q=>all.push({ ...q, type: t }));
      }
      const picked = shuffle(all).slice(0, amount);
      out.push(...picked);
    } else {
      const arr = pool[type] || [];
      if(amount === "all"){
        out.push(...arr.map(q=>({ ...q, type })));
      } else {
        out.push(...shuffle(arr).slice(0, amount).map(q=>({ ...q, type })));
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
  if(qData.optA) game.optA = qData.optA;
  if(qData.optB) game.optB = qData.optB;

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
      if(A.isHost) revealCurrent();
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

  if(g.type === "photo" && g.photoUrl){
    html += `<div class="photo-box"><img src="${g.photoUrl}" alt="" onerror="this.parentElement.innerHTML='<div class=&quot;ph&quot;>📷</div>'"></div>`;
  }

  // ===== ANSWER PHASE =====
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
  // ===== REVEAL PHASE =====
  else if(g.phase === "reveal"){
    html += buildRevealView(g);
  }

  body.innerHTML = html;
  wireAnswerInputs(g);
}

function labelForAnswer(g, ans){
  const m = A.meta || {};
  if(g.type === "who" || g.type === "photo" || g.type === "prognose"){
    return ans === "braut" ? (m.braut || "Braut") : (m.braeutigam || "Bräutigam");
  }
  if(g.type === "family"){ return ans === "a" ? g.optA : g.optB; }
  if(g.type === "estimate"){ return g.unit ? `${ans} ${g.unit}` : String(ans); }
  return String(ans);
}

function buildAnswerInput(g){
  const m = A.meta || {};
  if(g.type === "who" || g.type === "photo" || g.type === "prognose"){
    return `<div class="grid2" style="margin-top:16px">
      <button class="btn-braut" data-send="braut" style="padding:22px;font-size:1rem">👰<br>${m.braut || "Braut"}</button>
      <button class="btn-braeutigam" data-send="braeutigam" style="padding:22px;font-size:1rem">🤵<br>${m.braeutigam || "Bräutigam"}</button>
    </div>`;
  }
  if(g.type === "family"){
    return `<div class="grid2" style="margin-top:16px">
      <button class="btn-braut" data-send="a" style="padding:22px;font-size:1rem">${g.optA}</button>
      <button class="btn-braeutigam" data-send="b" style="padding:22px;font-size:1rem">${g.optB}</button>
    </div>`;
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
// AUFLÖSUNG: Team-Fairness nach Trefferquote
// ═══════════════════════════════════════════════════════════
async function revealCurrent() {
  if (!A.isHost) return;
  const g = (await get(ref(db, `rooms/${A.room}/game`))).val();
  if (!g || g.phase !== "answer") return;

  const answers = g.answers || {};
  const players = A.players || {};
  
  const teamStats = { 
    braut: { correct: 0, total: 0, rate: 0 }, 
    braeutigam: { correct: 0, total: 0, rate: 0 } 
  };
  const breakdown = { braut: 0, braeutigam: 0, a: 0, b: 0 };
  const ranking = [];

  for (const [uid, ans] of Object.entries(answers)) {
    const p = players[uid];
    if (!p) continue;
    breakdown[ans] = (breakdown[ans] || 0) + 1;
    if (p.team === "braut" || p.team === "braeutigam") teamStats[p.team].total++;
    
    if (g.type === "estimate") {
      const diff = Math.abs(ans - g.answer);
      ranking.push({ uid, p: p.name || uid.split('_')[0], team: p.team, v: ans, diff });
    }
  }

  let winner = null;
  let finalCorrectAnswer = g.answer;

  // 1. EHE-PROGNOSE (mit echtem Gleichstand)
  if (g.type === "prognose") {
    if (breakdown.braut > breakdown.braeutigam) finalCorrectAnswer = "braut";
    else if (breakdown.braeutigam > breakdown.braut) finalCorrectAnswer = "braeutigam";
    else finalCorrectAnswer = "tie"; // 🚀 NEU: Echter Gleichstand

    if (finalCorrectAnswer !== "tie") {
      for (const [uid, ans] of Object.entries(answers)) {
        if (ans === finalCorrectAnswer) {
          const p = players[uid];
          if (p) {
            if (p.team === "braut" || p.team === "braeutigam") teamStats[p.team].correct++;
            await awardScore(uid, 1); 
          }
        }
      }
      for (const k of ["braut", "braeutigam"]) {
        teamStats[k].rate = teamStats[k].total > 0 ? (teamStats[k].correct / teamStats[k].total) : 0;
      }
      if (teamStats.braut.rate > teamStats.braeutigam.rate) winner = "braut";
      else if (teamStats.braeutigam.rate > teamStats.braut.rate) winner = "braeutigam";
    }
  } 
  // 2. SCHÄTZFRAGEN (Faire Punkte bei gleichem Tipp)
  else if (g.type === "estimate") {
    ranking.sort((a, b) => a.diff - b.diff);
    
    let currentPts = 3;
    let lastDiff = ranking.length > 0 ? ranking[0].diff : -1;
    let rankPosition = 0; // 0=Gold, 1=Silber, 2=Bronze

    for (let i = 0; i < ranking.length; i++) {
      if (ranking[i].diff > lastDiff) {
        rankPosition++;
        currentPts = 3 - rankPosition;
        lastDiff = ranking[i].diff;
      }
      if (currentPts <= 0) break; // Nur die besten 3 Abweichungs-Gruppen punkten

      await awardScore(ranking[i].uid, currentPts);
      ranking[i].awardedPts = currentPts; // Speichern fürs UI
    }
    if (ranking.length > 0) winner = ranking[0].team;
  } 
  // 3. NORMALES QUIZ
  else {
    for (const [uid, ans] of Object.entries(answers)) {
      if (ans === g.answer) {
        const p = players[uid];
        if (p) {
          if (p.team === "braut" || p.team === "braeutigam") teamStats[p.team].correct++;
          await awardScore(uid, 1);
        }
      }
    }
    for (const k of ["braut", "braeutigam"]) {
      teamStats[k].rate = teamStats[k].total > 0 ? (teamStats[k].correct / teamStats[k].total) : 0;
    }
    if (teamStats.braut.rate > teamStats.braeutigam.rate) winner = "braut";
    else if (teamStats.braeutigam.rate > teamStats.braut.rate) winner = "braeutigam";
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

function buildRevealView(g){
  const m = A.meta || {};
  const nameB = m.braut || "Braut";
  const nameBr = m.braeutigam || "Bräutigam";
  const r = g.result || {};
  let html = "";

  // Persönliches Feedback
  if (!A.isHost && !A.isBeamer) {
    const myAns = (g.answers || {})[A.user];
    
    if (g.type === "estimate") {
       const myEntry = (r.ranking || []).find(e => e.uid === A.user);
       if (myEntry && myEntry.awardedPts) {
         html += `<div class="flash gold" style="text-align:center; font-size:1.1rem; box-shadow: 0 4px 15px rgba(212,175,55,0.3);">🎉 Stark geschätzt! Du holst <b>+${myEntry.awardedPts} Punkte</b>!</div>`;
       } else if (myAns !== undefined) {
         html += `<div class="flash" style="text-align:center;">Guter Versuch, aber leider nicht in den Punkterängen.</div>`;
       }
    } else if (g.type === "prognose") {
       if (g.answer === "tie") {
         html += `<div class="flash" style="text-align:center;">Gleichstand! Das Orakel ist unentschlossen – niemand punktet.</div>`;
       } else if (myAns === g.answer) {
         html += `<div class="flash gold" style="text-align:center; font-size:1.1rem; box-shadow: 0 4px 15px rgba(78,207,106,0.3);">🎉 Du bist mit der Mehrheit! <b>+1 Punkt</b>!</div>`;
       } else if (myAns !== undefined) {
         html += `<div class="flash warn" style="text-align:center; font-size:1.1rem;">❌ Du lagst daneben!</div>`;
       } else {
         html += `<div class="flash" style="text-align:center; opacity: 0.7;">Du hast nicht abgestimmt.</div>`;
       }
    } else {
       if (myAns === g.answer) {
         html += `<div class="flash gold" style="text-align:center; font-size:1.1rem; box-shadow: 0 4px 15px rgba(78,207,106,0.3);">🎉 Richtig! <b>+1 Punkt</b> für dich!</div>`;
       } else if (myAns !== undefined) {
         html += `<div class="flash warn" style="text-align:center; font-size:1.1rem;">❌ Leider falsch!</div>`;
       } else {
         html += `<div class="flash" style="text-align:center; opacity: 0.7;">Du hast keine Antwort abgegeben.</div>`;
       }
    }
  }

  // Anzeige der richtigen Antwort & Balken
  if(g.type === "who" || g.type === "photo" || g.type === "family"){
    const correctLabel = g.type === "family" ? (g.answer === "a" ? g.optA : g.optB) :
                         (g.answer === "braut" ? nameB : nameBr);
    html += `<div class="flash gold"><b>✓ Richtige Antwort:</b> ${correctLabel}</div>`;

    const counts = r.breakdown || {};
    if(g.type === "family"){
      const a = counts["a"] || 0, b = counts["b"] || 0;
      const total = a + b || 1;
      html += `<div class="result-bar">
        <div class="rb braut" style="width:${a/total*100}%">${a > 0 ? a : ''}</div>
        <div class="rb braeutigam" style="width:${b/total*100}%">${b > 0 ? b : ''}</div>
      </div>
      <div class="row" style="font-size:.75rem;opacity:.7"><span>${g.optA} (${a})</span><span style="text-align:right">${g.optB} (${b})</span></div>`;
    } else {
      const a = counts["braut"] || 0, b = counts["braeutigam"] || 0;
      const total = a + b || 1;
      html += `<div class="result-bar">
        <div class="rb braut" style="width:${a/total*100}%">${a > 0 ? a : ''}</div>
        <div class="rb braeutigam" style="width:${b/total*100}%">${b > 0 ? b : ''}</div>
      </div>
      <div class="row" style="font-size:.75rem;opacity:.7"><span>👰 ${nameB} (${a})</span><span style="text-align:right">${nameBr} 🤵 (${b})</span></div>`;
    }

    if(r.teamStats){
      const ts = r.teamStats;
      html += `<h3>Trefferquote:</h3>
        <div class="score-row">
          <span>👰 ${nameB}</span>
          <strong>${ts.braut.correct}/${ts.braut.total} (${(ts.braut.rate*100).toFixed(0)}%)</strong>
        </div>
        <div class="score-row">
          <span>🤵 ${nameBr}</span>
          <strong>${ts.braeutigam.correct}/${ts.braeutigam.total} (${(ts.braeutigam.rate*100).toFixed(0)}%)</strong>
        </div>`;
    }
  }
  else if(g.type === "estimate"){
    html += `<div class="flash gold"><b>✓ Richtige Antwort:</b> ${g.answer}${g.unit ? ' ' + g.unit : ''}</div>`;
    if(r.ranking && r.ranking.length){
      html += `<h3>Näher dran – besser:</h3>`;
      r.ranking.forEach((e) => {
        let medal = "🔹";
        if (e.awardedPts === 3) medal = "🥇";
        if (e.awardedPts === 2) medal = "🥈";
        if (e.awardedPts === 1) medal = "🥉";
        const ptsStr = e.awardedPts ? `+${e.awardedPts}` : '';
        const tmIcon = e.team === "braut" ? "👰" : "🤵";
        html += `<div class="score-row"><span>${medal} ${tmIcon} ${e.p}: ${e.v}${g.unit?' '+g.unit:''} <span class="sub">(Δ ${e.diff.toFixed(1)})</span></span><strong>${ptsStr}</strong></div>`;
      });
    } else {
      html += `<div class="flash warn">Niemand hat geantwortet</div>`;
    }
  }
  else if(g.type === "prognose"){
    const counts = r.breakdown || { braut: 0, braeutigam: 0 };
    const total = (counts.braut || 0) + (counts.braeutigam || 0) || 1;
    if (g.answer === "tie") {
      html += `<div class="flash rose">💍 Das Orakel sagt: Unentschieden!</div>`;
    } else {
      html += `<div class="flash rose">💍 Das Orakel hat entschieden:</div>`;
    }
    html += `<div class="result-bar">
      <div class="rb braut" style="width:${counts.braut/total*100}%">${counts.braut}</div>
      <div class="rb braeutigam" style="width:${counts.braeutigam/total*100}%">${counts.braeutigam}</div>
    </div>
    <div class="row" style="font-size:.75rem;opacity:.7"><span>👰 ${nameB}</span><span style="text-align:right">${nameBr} 🤵</span></div>`;
  }

  if(r.roundWinner){
    const wName = r.roundWinner === "braut" ? nameB : nameBr;
    const wIcon = r.roundWinner === "braut" ? "👰" : "🤵";
    html += `<div class="flash gold" style="text-align:center;font-size:1.05rem;margin-top:14px">
      🏆 Rundensieg für Team ${wIcon} <b>${wName}</b>!
    </div>`;
  } else {
    html += `<div class="flash" style="text-align:center">Unentschieden – keine Rundenpunkte</div>`;
  }

  return html;
}

function renderQuizSummary(){
  const t = A.teams || { braut: 0, braeutigam: 0 };
  const m = A.meta || {};
  const nameB = m.braut || "Braut";
  const nameBr = m.braeutigam || "Bräutigam";
  const topPlayers = Object.entries(A.players || {})
    .sort((a,b)=>(b[1].score||0)-(a[1].score||0)).slice(0, 5);
  const leadTeam = t.braut > t.braeutigam ? "braut" : t.braeutigam > t.braut ? "braeutigam" : null;

  let html = `<div class="q-big">🏁 Quiz beendet!</div>`;
  html += `<h3>Gesamt-Stand</h3>
    <div class="team-board">
      <div class="team-card braut ${leadTeam==="braut"?"team-winning":""}">
        <div class="nm">👰 Team ${nameB}</div>
        <div class="pts">${t.braut || 0}</div>
        <div class="pts-sub">Rundensiege</div>
      </div>
      <div class="team-card braeutigam ${leadTeam==="braeutigam"?"team-winning":""}">
        <div class="nm">🤵 Team ${nameBr}</div>
        <div class="pts">${t.braeutigam || 0}</div>
        <div class="pts-sub">Rundensiege</div>
      </div>
    </div>`;
  if(topPlayers.length){
    html += `<h3>Top-Tipper</h3>` + topPlayers.map(([n,d],i)=>{
      const medal = ['🥇','🥈','🥉'][i] || ((i+1)+'.');
      const tm = d.team === "braut" ? "👰 B" : "🤵 Br";
      return `<div class="score-row"><span><span class="tm ${d.team}">${tm}</span>${medal} ${n}</span><strong>${d.score||0} Pkt</strong></div>`;
    }).join("");
  }
  return html;
}

console.log("✅ games.js loaded");