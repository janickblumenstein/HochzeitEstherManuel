// === beamer.js – Großbild-Ansicht für den Beamer ===
const A = window.App;
if(!A.isBeamer){ console.log("beamer.js: nicht im Beamer-Modus, skip"); }

let beamerTimerInterval = null;

if(A.isBeamer){
  A.listeners.onBeamerUpdate = render;
  render();
}

function startBeamerTimer(){
  if(beamerTimerInterval) clearInterval(beamerTimerInterval);
  beamerTimerInterval = setInterval(render, 300);
}
function stopBeamerTimer(){
  if(beamerTimerInterval){ clearInterval(beamerTimerInterval); beamerTimerInterval = null; }
}

function render(){
  const view = document.getElementById("beamerView");
  if(!view) return;
  const g = A.state.game, q = A.state.quiz, tap = A.state.tapduel;
  const m = A.meta || {};
  const nameB = m.braut || "Braut";
  const nameBr = m.braeutigam || "Bräutigam";

  // Tap-Duell hat Priorität
  if(tap){ renderTapDuel(view, tap, nameB, nameBr); return; }

  // Kein Spiel: Team-Stand groß
  if(!g){
    stopBeamerTimer();
    renderIdle(view, nameB, nameBr);
    return;
  }

  // Quiz-Ende Summary
  if(g.type === "_quizdone"){
    stopBeamerTimer();
    renderQuizDone(view, nameB, nameBr);
    return;
  }

  // Aktives Spiel
  renderActiveGame(view, g, q, nameB, nameBr);
}

function renderIdle(view, nameB, nameBr){
  const t = A.teams || { braut: 0, braeutigam: 0 };
  view.innerHTML = `
    <h1>♥ ${nameB} & ${nameBr} ♥</h1>
    <div class="sub-big">Warten auf das nächste Spiel...</div>
    <div class="team-score-big">
      <div class="tcard braut">
        <div class="label">👰 Team ${nameB}</div>
        <div class="value">${t.braut || 0}</div>
        <div class="sublabel">Rundensiege</div>
      </div>
      <div class="tcard braeutigam">
        <div class="label">🤵 Team ${nameBr}</div>
        <div class="value">${t.braeutigam || 0}</div>
        <div class="sublabel">Rundensiege</div>
      </div>
    </div>
    <div class="sub-big" style="margin-top:40px">${Object.keys(A.players||{}).length} Gäste verbunden</div>
  `;
}

function renderQuizDone(view, nameB, nameBr){
  const t = A.teams || { braut: 0, braeutigam: 0 };
  const topPlayers = Object.entries(A.players || {})
    .sort((a,b)=>(b[1].score||0)-(a[1].score||0)).slice(0, 5);
  const winner = t.braut > t.braeutigam ? "braut" : t.braeutigam > t.braut ? "braeutigam" : null;
  const wName = winner === "braut" ? nameB : winner === "braeutigam" ? nameBr : null;

  let html = `<h1>🏁 Quiz beendet!</h1>`;
  if(wName){
    html += `<div class="question" style="color:var(--gold)">🏆 Team ${winner==="braut"?"👰":"🤵"} ${wName} führt!</div>`;
  }
  html += `<div class="team-score-big">
    <div class="tcard braut"><div class="label">👰 ${nameB}</div><div class="value">${t.braut||0}</div><div class="sublabel">Rundensiege</div></div>
    <div class="tcard braeutigam"><div class="label">🤵 ${nameBr}</div><div class="value">${t.braeutigam||0}</div><div class="sublabel">Rundensiege</div></div>
  </div>`;
  if(topPlayers.length){
    html += `<div style="margin-top:40px;max-width:700px;margin-left:auto;margin-right:auto">
      <div class="sub-big">🏆 Top-Tipper</div>`;
    topPlayers.forEach(([n,d],i)=>{
      const medal = ['🥇','🥈','🥉'][i] || ((i+1)+'.');
      const tmColor = d.team === "braut" ? "var(--braut)" : "var(--braeutigam)";
      html += `<div style="padding:12px 24px;margin:8px 0;background:rgba(255,255,255,.04);border-left:5px solid ${tmColor};border-radius:8px;display:flex;justify-content:space-between;font-size:1.6rem">
        <span>${medal} ${n}</span><strong style="color:var(--gold)">${d.score||0} Pkt</strong>
      </div>`;
    });
    html += `</div>`;
  }
  view.innerHTML = html;
}

function renderActiveGame(view, g, q, nameB, nameBr){
  const total = Object.keys(A.players).length;
  const cnt = Object.keys(g.answers || {}).length;

  let html = "";
  if(q){
    html += `<div class="qprog">${q.setLabel} · Frage ${q.current + 1} / ${q.total}</div>`;
  } else {
    html += `<div class="qprog">${typeLabel(g.type)}</div>`;
  }
  html += `<div class="question">${g.q}</div>`;

  // Foto
  if(g.type === "photo" && g.photoUrl){
    html += `<div class="photo-box" style="margin:20px auto;max-width:500px;aspect-ratio:1"><img src="${g.photoUrl}" alt=""></div>`;
  }

  if(g.phase === "answer"){
    // Timer groß
    if(g.endsAt){
      const left = Math.max(0, Math.ceil((g.endsAt - Date.now()) / 1000));
      const cls = left <= 5 ? "crit" : left <= 10 ? "warn" : "";
      html += `<div class="big-timer ${cls}">${left}s</div>`;
      startBeamerTimer();
    }
    html += `<div class="big-counter">${cnt} / ${total}</div>`;
    html += `<div class="sub-big">haben geantwortet</div>`;
    if(g.type === "family"){
      html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:30px;max-width:900px;margin:30px auto">
        <div style="padding:30px;background:rgba(232,164,184,.15);border:3px solid var(--braut);border-radius:20px;font-size:2rem">${g.optA}</div>
        <div style="padding:30px;background:rgba(107,163,199,.15);border:3px solid var(--braeutigam);border-radius:20px;font-size:2rem">${g.optB}</div>
      </div>`;
    } else if(g.type === "estimate" && g.unit){
      html += `<div class="sub-big" style="margin-top:20px;opacity:.5">Tipp in ${g.unit}</div>`;
    }
  }
  else if(g.phase === "reveal"){
    stopBeamerTimer();
    html += renderRevealBeamer(g, nameB, nameBr);
  }

  view.innerHTML = html;
}

function renderRevealBeamer(g, nameB, nameBr){
  const r = g.result || {};
  let html = "";

  if(g.type === "who" || g.type === "photo" || g.type === "family"){
    const correctLabel = g.type === "family" ? (g.answer === "a" ? g.optA : g.optB) :
                         (g.answer === "braut" ? nameB : nameBr);
    html += `<div class="question" style="color:var(--green);font-size:3.5rem">✓ ${correctLabel}</div>`;
    const counts = r.breakdown || {};
    if(g.type === "family"){
      html += buildBigBar(counts["a"]||0, counts["b"]||0, g.optA, g.optB, g.answer === "a" ? "a" : "b");
    } else {
      html += buildBigBar(counts["braut"]||0, counts["braeutigam"]||0, "👰 "+nameB, nameBr+" 🤵", g.answer);
    }
    if(r.teamStats){
      const ts = r.teamStats;
      html += `<div class="sub-big" style="margin-top:20px">
        👰 ${(ts.braut.rate*100).toFixed(0)}% Quote · 🤵 ${(ts.braeutigam.rate*100).toFixed(0)}% Quote
      </div>`;
    }
  }
  else if(g.type === "estimate"){
    html += `<div class="question" style="color:var(--green);font-size:3.5rem">✓ ${g.answer}${g.unit?' '+g.unit:''}</div>`;
    if(r.ranking && r.ranking.length){
      html += `<div style="max-width:700px;margin:0 auto;text-align:left;font-size:1.5rem">`;
      r.ranking.slice(0, 5).forEach((e) => {
        let medal = "🔹";
        if (e.awardedPts === 3) medal = "🥇";
        if (e.awardedPts === 2) medal = "🥈";
        if (e.awardedPts === 1) medal = "🥉";
        const ptsStr = e.awardedPts ? `+${e.awardedPts}` : '';
        const tmColor = e.team === "braut" ? "var(--braut)" : "var(--braeutigam)";
        html += `<div style="padding:10px 20px;margin:8px 0;background:rgba(255,255,255,.04);border-left:4px solid ${tmColor};border-radius:8px;display:flex;justify-content:space-between">
          <span>${medal} ${e.p}: ${e.v}${g.unit?' '+g.unit:''}</span>
          <strong style="color:var(--gold)">${ptsStr}</strong>
        </div>`;
      });
      html += `</div>`;
    }
  }
  else if(g.type === "prognose"){
    const counts = r.breakdown || { braut: 0, braeutigam: 0 };
    if (g.answer === "tie") {
        html += `<div class="sub-big" style="color:var(--rose)">💍 Das Orakel ist unentschlossen (Gleichstand)!</div>`;
    } else {
        html += `<div class="sub-big" style="color:var(--rose)">💍 Das Orakel sagt:</div>`;
    }
    html += buildBigBar(counts.braut, counts.braeutigam, "👰 "+nameB, nameBr+" 🤵", r.roundWinner);
  }

  // Rundensieger
  if(r.roundWinner){
    const wName = r.roundWinner === "braut" ? nameB : nameBr;
    const wIcon = r.roundWinner === "braut" ? "👰" : "🤵";
    html += `<div class="question" style="color:var(--gold);margin-top:30px">🏆 +1 Runde: ${wIcon} ${wName}</div>`;
  } else {
    html += `<div class="sub-big" style="margin-top:30px">Unentschieden – keine Rundenpunkte</div>`;
  }
  return html;
}

function renderTapDuel(view, d, nameB, nameBr){
  if(d.phase === "countdown"){
    const left = Math.max(0, Math.ceil((d.startsAt - Date.now()) / 1000));
    view.innerHTML = `<h1>⚡ Tap-Duell</h1>
      <div class="question">Bereit machen!</div>
      <div class="big-timer crit">${left}</div>
      <div class="sub-big">Team ${nameB} 👰 vs 🤵 Team ${nameBr}</div>`;
    startBeamerTimer();
    return;
  }
  if(d.phase === "running"){
    const leftMs = Math.max(0, d.endsAt - Date.now());
    const leftSec = Math.ceil(leftMs / 1000);
    const cls = leftSec <= 5 ? "crit" : leftSec <= 10 ? "warn" : "";
    const taps = d.taps || {};
    const ts = { braut: { sum:0, n:0 }, braeutigam: { sum:0, n:0 } };
    for(const [p, c] of Object.entries(taps)){
      const t = (A.players[p] || {}).team;
      if(!t || !ts[t]) continue;
      ts[t].sum += c; ts[t].n++;
    }
    const avgB = ts.braut.n ? (ts.braut.sum / ts.braut.n).toFixed(1) : "0";
    const avgBr = ts.braeutigam.n ? (ts.braeutigam.sum / ts.braeutigam.n).toFixed(1) : "0";
    view.innerHTML = `<h1>⚡ TAP-DUELL</h1>
      <div class="big-timer ${cls}">${leftSec}s</div>
      <div class="team-score-big" style="margin-top:20px">
        <div class="tcard braut">
          <div class="label">👰 ${nameB}</div>
          <div class="value tap-live">${ts.braut.sum}</div>
          <div class="sublabel">Ø ${avgB} pro Person (${ts.braut.n} dabei)</div>
        </div>
        <div class="tcard braeutigam">
          <div class="label">🤵 ${nameBr}</div>
          <div class="value tap-live">${ts.braeutigam.sum}</div>
          <div class="sublabel">Ø ${avgBr} pro Person (${ts.braeutigam.n} dabei)</div>
        </div>
      </div>`;
    startBeamerTimer();
    return;
  }
  if(d.phase === "done"){
    stopBeamerTimer();
    const ts = d.teamStats || { braut: {}, braeutigam: {} };
    const winner = d.winner;
    const wName = winner === "braut" ? nameB : winner === "braeutigam" ? nameBr : null;
    let html = `<h1>⚡ Tap-Duell beendet!</h1>`;
    html += `<div class="team-score-big">
      <div class="tcard braut ${winner==="braut"?"team-winning":""}">
        <div class="label">👰 ${nameB}</div>
        <div class="value">${(ts.braut.avg||0).toFixed(1)}</div>
        <div class="sublabel">Ø pro Person</div>
      </div>
      <div class="tcard braeutigam ${winner==="braeutigam"?"team-winning":""}">
        <div class="label">🤵 ${nameBr}</div>
        <div class="value">${(ts.braeutigam.avg||0).toFixed(1)}</div>
        <div class="sublabel">Ø pro Person</div>
      </div>
    </div>`;
    if(wName){
      html += `<div class="question" style="color:var(--gold);margin-top:30px">🏆 +1 Runde: ${winner==="braut"?"👰":"🤵"} ${wName}</div>`;
    } else {
      html += `<div class="sub-big" style="margin-top:30px">Unentschieden</div>`;
    }
    view.innerHTML = html;
  }
}

function buildBigBar(a, b, labelA, labelB, winnerKey){
  const total = a + b || 1;
  const pctA = Math.round(a / total * 100);
  const pctB = 100 - pctA;
  const winStyleA = (winnerKey === "braut" || winnerKey === "a") ? "box-shadow:inset 0 0 0 5px var(--gold)" : "";
  const winStyleB = (winnerKey === "braeutigam" || winnerKey === "b") ? "box-shadow:inset 0 0 0 5px var(--gold)" : "";
  return `<div style="display:flex;height:80px;max-width:900px;margin:30px auto;border-radius:14px;overflow:hidden;font-size:2rem;font-weight:bold">
    <div style="width:${pctA}%;background:var(--braut);color:#2a1a20;display:flex;align-items:center;justify-content:center;${winStyleA}">${a > 0 ? a : ''}</div>
    <div style="width:${pctB}%;background:var(--braeutigam);display:flex;align-items:center;justify-content:center;${winStyleB}">${b > 0 ? b : ''}</div>
  </div>
  <div style="display:flex;justify-content:space-between;max-width:900px;margin:0 auto;font-size:1.4rem;opacity:.8">
    <span>${labelA} (${a})</span><span>${labelB} (${b})</span>
  </div>`;
}

function typeLabel(t){
  return { who:"Wer von beiden?", estimate:"Schätzfrage", photo:"Kindheitsfoto",
           prognose:"Ehe-Prognose", family:"Familie" }[t] || "";
}

console.log("✅ beamer.js loaded");
