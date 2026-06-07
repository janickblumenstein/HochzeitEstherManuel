// === beamer.js – Großbild-Ansicht für den Beamer (Teens) ===
const A = window.App;
if(!A.isBeamer){ console.log("beamer.js: nicht im Beamer-Modus, skip"); }

// URL, auf die der QR-Code zeigt (am besten eure öffentliche App-URL eintragen)
const GAME_URL = location.origin + location.pathname;
let beamerTimerInterval = null;

if(A.isBeamer){
  A.listeners.onBeamerUpdate = render;
  injectQrOverlay();
  render();
}

function injectQrOverlay(){
  const overlay = document.createElement("div");
  overlay.id = "beamerQrOverlay";
  overlay.innerHTML = `
    <div style="background:#fff;padding:7px;border-radius:10px;display:inline-block;box-shadow:0 2px 12px rgba(0,0,0,.5)">
      <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(GAME_URL)}" width="120" height="120" alt="QR">
    </div>
    <div style="font-family:monospace;font-size:.75rem;color:var(--gold);margin-top:5px;text-align:center;opacity:.8">
      Scan mich & mach mit
    </div>`;
  Object.assign(overlay.style, {
    position: "fixed", bottom: "24px", right: "28px", zIndex: "999",
    textAlign: "center", pointerEvents: "none"
  });
  document.body.appendChild(overlay);
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

  if(tap){ renderTapDuel(view, tap); return; }
  if(!g){ stopBeamerTimer(); renderIdle(view); return; }
  if(g.type === "_quizdone"){ stopBeamerTimer(); renderQuizDone(view); return; }
  renderActiveGame(view, g, q);
}

// Kompakte Team-Übersicht (Karten) für den Beamer
function teamCardsBig(){
  const wins = A.teams || {};
  const maxWins = Math.max(0, ...A.allTeams().map(t=>wins[t.id]||0));
  return `<div class="team-score-big">` + A.allTeams().map(t=>{
    const w = wins[t.id]||0;
    const lead = w>0 && w===maxWins;
    return `<div class="tcard ${lead?'team-winning':''}" style="--tcol:${t.color}">
      <div class="label">${t.emoji} ${t.name}</div>
      <div class="value" style="color:${t.color}">${w}</div>
      <div class="sublabel">Rundensiege</div>
    </div>`;
  }).join("") + `</div>`;
}

function renderIdle(view){
  const c = window.TeensContent || {};
  const guestCount = Object.keys(A.players||{}).length;
  view.innerHTML = `
    <h1>✦ ${c.eventTitle || "Teens-Abschluss"} ✦</h1>
    <div class="sub-big">${c.subtitle || ""}</div>
    ${teamCardsBig()}
    <div class="sub-big" style="margin-top:40px;opacity:.5">${guestCount} Gäste bereits verbunden</div>`;
}

function renderQuizDone(view){
  const wins = A.teams || {};
  const teamsSorted = A.allTeams().slice().sort((a,b)=>(wins[b.id]||0)-(wins[a.id]||0));
  const leader = teamsSorted[0];
  const leadWins = wins[leader?.id]||0;
  const topPlayers = Object.entries(A.players || {})
    .sort((a,b)=>(b[1].score||0)-(a[1].score||0)).slice(0, 5);

  let html = `<h1>🏁 Quiz beendet!</h1>`;
  if(leadWins > 0){
    html += `<div class="question" style="color:var(--gold)">🏆 ${leader.emoji} ${leader.name} führt!</div>`;
  }
  html += teamCardsBig();
  if(topPlayers.length){
    html += `<div style="margin-top:40px;max-width:700px;margin-left:auto;margin-right:auto">
      <div class="sub-big">🏆 Top-Tipper</div>`;
    topPlayers.forEach(([n,d],i)=>{
      const medal = ['🥇','🥈','🥉'][i] || ((i+1)+'.');
      const displayName = d.name || n.split('_')[0];
      html += `<div style="padding:12px 24px;margin:8px 0;background:rgba(255,255,255,.04);border-left:5px solid ${A.teamColor(d.team)};border-radius:8px;display:flex;justify-content:space-between;font-size:1.6rem">
        <span>${medal} ${displayName}</span><strong style="color:var(--gold)">${d.score||0} Pkt</strong>
      </div>`;
    });
    html += `</div>`;
  }
  view.innerHTML = html;
}

function renderActiveGame(view, g, q){
  const total = Object.keys(A.players).length;
  const cnt = Object.keys(g.answers || {}).length;

  let html = "";
  if(q){
    html += `<div class="qprog">${q.setLabel} · Frage ${q.current + 1} / ${q.total}</div>`;
  } else {
    html += `<div class="qprog">${typeLabel(g.type)}</div>`;
  }
  html += `<div class="question">${g.q}</div>`;

  if(g.type === "guess" && g.photoUrl){
    html += `<div class="photo-box" style="margin:20px auto;max-width:500px;aspect-ratio:1"><img src="${g.photoUrl}" alt=""></div>`;
  }

  if(g.phase === "answer"){
    if(g.endsAt){
      const left = Math.max(0, Math.ceil((g.endsAt - Date.now()) / 1000));
      const cls = left <= 5 ? "crit" : left <= 10 ? "warn" : "";
      html += `<div class="big-timer ${cls}">${left}s</div>`;
      startBeamerTimer();
    }
    html += `<div class="big-counter">${cnt} / ${total}</div>`;
    html += `<div class="sub-big">haben geantwortet</div>`;
    if(g.type === "guess"){
      // Die wählbaren Teens als Hinweis gross zeigen
      html += `<div class="teen-row-big">` + A.teensOnly().map(t=>
        `<div class="tchip" style="--tcol:${t.color}">${t.emoji} ${t.name}</div>`
      ).join("") + `</div>`;
    } else if(g.type === "estimate" && g.unit){
      html += `<div class="sub-big" style="margin-top:20px;opacity:.5">Tipp in ${g.unit}</div>`;
    }
  }
  else if(g.phase === "reveal"){
    stopBeamerTimer();
    html += renderRevealBeamer(g);
  }

  view.innerHTML = html;
}

function renderRevealBeamer(g){
  const r = g.result || {};
  let html = "";

  if(g.type === "guess"){
    const correct = A.teamById(g.answer) || {};
    html += `<div class="question" style="color:var(--green);font-size:3.5rem">✓ ${correct.emoji||''} ${correct.name||g.answer}</div>`;
    html += bigDistribution(r.breakdown || {}, g.answer);
    if(r.teamStats){
      const parts = A.allTeams().map(t=>{
        const ts = r.teamStats[t.id];
        if(!ts || ts.total === 0) return "";
        return `<span style="color:${t.color}">${t.emoji} ${(ts.rate*100).toFixed(0)}%</span>`;
      }).filter(Boolean).join(" · ");
      html += `<div class="sub-big" style="margin-top:20px">${parts}</div>`;
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
        html += `<div style="padding:10px 20px;margin:8px 0;background:rgba(255,255,255,.04);border-left:4px solid ${A.teamColor(e.team)};border-radius:8px;display:flex;justify-content:space-between">
          <span>${medal} ${e.p}: ${e.v}${g.unit?' '+g.unit:''}</span>
          <strong style="color:var(--gold)">${ptsStr}</strong>
        </div>`;
      });
      html += `</div>`;
    }
  }

  if(r.roundWinner){
    const t = A.teamById(r.roundWinner) || {};
    html += `<div class="question" style="color:var(--gold);margin-top:30px">🏆 +1 Runde: ${t.emoji||''} ${t.name||r.roundWinner}</div>`;
  } else {
    html += `<div class="sub-big" style="margin-top:30px">Unentschieden – keine Rundenpunkte</div>`;
  }
  return html;
}

// Gestapelter Balken über alle getippten Teens (Beamer-Grösse)
function bigDistribution(breakdown, correctId){
  const teens = A.teensOnly();
  const total = teens.reduce((s,t)=>s+(breakdown[t.id]||0),0) || 1;
  const segs = teens.map(t=>{
    const c = breakdown[t.id]||0;
    const pct = c/total*100;
    if(pct===0) return "";
    const ring = t.id === correctId ? "box-shadow:inset 0 0 0 6px var(--gold)" : "";
    return `<div style="width:${pct}%;background:${t.color};color:#111;display:flex;align-items:center;justify-content:center;font-size:2rem;font-weight:bold;${ring}">${c>0?c:''}</div>`;
  }).join("");
  const legend = teens.filter(t=>breakdown[t.id]).map(t=>
    `<span style="white-space:nowrap;margin:0 10px"><span class="dot" style="background:${t.color}"></span>${t.name} (${breakdown[t.id]||0})</span>`
  ).join("");
  return `<div style="display:flex;height:80px;max-width:1000px;margin:30px auto;border-radius:14px;overflow:hidden">${segs}</div>
    <div style="font-size:1.3rem;opacity:.85;display:flex;flex-wrap:wrap;justify-content:center;gap:6px">${legend}</div>`;
}

function renderTapDuel(view, d){
  if(d.phase === "countdown"){
    const left = Math.max(0, Math.ceil((d.startsAt - Date.now()) / 1000));
    view.innerHTML = `<h1>⚡ Tap-Duell</h1>
      <div class="question">Bereit machen!</div>
      <div class="big-timer crit">${left}</div>
      <div class="sub-big">Welches Fan-Team tippt am schnellsten?</div>`;
    startBeamerTimer();
    return;
  }
  if(d.phase === "running"){
    const leftMs = Math.max(0, d.endsAt - Date.now());
    const leftSec = Math.ceil(leftMs / 1000);
    const cls = leftSec <= 5 ? "crit" : leftSec <= 10 ? "warn" : "";
    const ts = {};
    A.allTeams().forEach(t=>ts[t.id]={sum:0,n:0});
    for(const [p,c] of Object.entries(d.taps||{})){
      const team = (A.players[p]||{}).team;
      if(!team || !ts[team]) continue;
      ts[team].sum += c; ts[team].n++;
    }
    view.innerHTML = `<h1>⚡ TAP-DUELL</h1>
      <div class="big-timer ${cls}">${leftSec}s</div>
      <div class="team-score-big" style="margin-top:20px">` +
      A.allTeams().map(t=>{
        const s = ts[t.id];
        const avg = s.n ? (s.sum/s.n).toFixed(1) : "0";
        return `<div class="tcard" style="--tcol:${t.color}">
          <div class="label">${t.emoji} ${t.name}</div>
          <div class="value tap-live" style="color:${t.color}">${s.sum}</div>
          <div class="sublabel">Ø ${avg} pro Person (${s.n})</div>
        </div>`;
      }).join("") + `</div>`;
    startBeamerTimer();
    return;
  }
  if(d.phase === "done"){
    stopBeamerTimer();
    const ts = d.teamStats || {};
    const winner = d.winner;
    let html = `<h1>⚡ Tap-Duell beendet!</h1>`;
    html += `<div class="team-score-big">` + A.allTeams().map(t=>{
      const s = ts[t.id] || {};
      const win = winner === t.id;
      return `<div class="tcard ${win?'team-winning':''}" style="--tcol:${t.color}">
        <div class="label">${t.emoji} ${t.name}</div>
        <div class="value" style="color:${t.color}">${(s.avg||0).toFixed(1)}</div>
        <div class="sublabel">Ø pro Person</div>
      </div>`;
    }).join("") + `</div>`;
    if(winner){
      const t = A.teamById(winner) || {};
      html += `<div class="question" style="color:var(--gold);margin-top:30px">🏆 +1 Runde: ${t.emoji||''} ${t.name||winner}</div>`;
    } else {
      html += `<div class="sub-big" style="margin-top:30px">Unentschieden</div>`;
    }
    view.innerHTML = html;
  }
}

function typeLabel(t){
  return { guess:"Welcher Teen ist das?", estimate:"Schätzfrage" }[t] || "";
}

console.log("✅ beamer.js loaded (Teens)");
