// === beamer.js – Großbild-Ansicht für den Beamer ===
// Wird nur aktiv wenn ?beamer=1 in der URL ist.
const A = window.App;

if(A.isBeamer){
  A.listeners.onBeamerUpdate = render;
  A.listeners.onMeta = render;
  render();
}

function render(){
  const view = document.getElementById("beamerView");
  if(!view) return;
  const g = A.state.game;
  const m = A.meta || {};
  const nameB = m.braut || "Braut";
  const nameBr = m.braeutigam || "Bräutigam";

  // Team-Scores berechnen
  const teams = { braut: 0, braeutigam: 0 };
  Object.values(A.players || {}).forEach(p=>{
    if(p.team && teams[p.team] !== undefined) teams[p.team] += (p.score || 0);
  });

  // ----- Kein aktives Spiel: Zeige Team-Stand groß -----
  if(!g){
    view.innerHTML = `
      <h1>♥ ${nameB} & ${nameBr} ♥</h1>
      <div class="sub-big">Warten auf das nächste Spiel...</div>
      <div class="team-score-big">
        <div class="tcard braut">
          <div class="label">👰 Team ${nameB}</div>
          <div class="value">${teams.braut}</div>
        </div>
        <div class="tcard braeutigam">
          <div class="label">🤵 Team ${nameBr}</div>
          <div class="value">${teams.braeutigam}</div>
        </div>
      </div>
      <div class="sub-big" style="margin-top:40px">${Object.keys(A.players||{}).length} Gäste verbunden</div>
    `;
    return;
  }

  // ----- Aktives Spiel -----
  const total = Object.keys(A.players).length;
  const cnt = Object.keys(g.answers || {}).length;

  let html = `<div class="sub-big">${typeLabel(g.type)}</div>`;
  html += `<div class="question">${g.q}</div>`;

  // Foto
  if(g.type === "photo" && g.photoUrl){
    html += `<div class="photo-box" style="margin:20px auto;max-width:500px;aspect-ratio:1"><img src="${g.photoUrl}" alt=""></div>`;
  }

  // Phase-abhängige Anzeige
  if(g.phase === "answer"){
    html += `<div class="big-counter">${cnt} / ${total}</div>`;
    html += `<div class="sub-big">haben geantwortet</div>`;
    // Bei Estimate: zeige Einheit groß
    if(g.type === "estimate" && g.unit){
      html += `<div class="sub-big" style="margin-top:20px;opacity:.5">Tipp in ${g.unit}</div>`;
    }
    // Bei Family: zeige Optionen groß
    if(g.type === "family"){
      html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:30px;max-width:900px;margin:30px auto">
        <div style="padding:30px;background:rgba(232,164,184,.15);border:3px solid var(--braut);border-radius:20px;font-size:2rem">${g.optA}</div>
        <div style="padding:30px;background:rgba(107,163,199,.15);border:3px solid var(--braeutigam);border-radius:20px;font-size:2rem">${g.optB}</div>
      </div>`;
    }
  }
  else if(g.phase === "reveal"){
    const r = g.result || {};
    if(g.type === "who" || g.type === "photo" || g.type === "family"){
      const correctLabel = g.type === "family" ? (g.answer === "a" ? g.optA : g.optB) :
                           (g.answer === "braut" ? nameB : nameBr);
      html += `<div class="question" style="color:var(--green)">✓ ${correctLabel}</div>`;
      const counts = r.breakdown || {};
      if(g.type === "family"){
        html += buildBigBar(counts["a"] || 0, counts["b"] || 0, g.optA, g.optB, g.answer === "a" ? "a" : "b");
      } else {
        html += buildBigBar(counts["braut"] || 0, counts["braeutigam"] || 0,
                            "👰 " + nameB, nameBr + " 🤵", g.answer);
      }
      if(r.correctPlayers && r.correctPlayers.length){
        html += `<div class="sub-big" style="margin-top:30px;color:var(--gold)">🎉 Richtig: ${r.correctPlayers.join(", ")}</div>`;
      }
    }
    else if(g.type === "estimate"){
      html += `<div class="question" style="color:var(--green)">✓ ${g.answer}${g.unit?' '+g.unit:''}</div>`;
      if(r.ranking && r.ranking.length){
        html += `<div style="max-width:700px;margin:0 auto;text-align:left;font-size:1.5rem">`;
        r.ranking.slice(0, 5).forEach((e, i)=>{
          const medal = ['🥇','🥈','🥉'][i] || ((i+1)+'.');
          const pts = i < 3 ? ['+3','+2','+1'][i] : '';
          const tm = (A.players[e.p] || {}).team;
          const tmColor = tm === "braut" ? "var(--braut)" : "var(--braeutigam)";
          html += `<div style="padding:10px 20px;margin:8px 0;background:rgba(255,255,255,.04);border-left:4px solid ${tmColor};border-radius:8px;display:flex;justify-content:space-between">
            <span>${medal} ${e.p}: ${e.v}${g.unit?' '+g.unit:''}</span>
            <strong style="color:var(--gold)">${pts}</strong>
          </div>`;
        });
        html += `</div>`;
      }
    }
    else if(g.type === "prognose"){
      const counts = r.breakdown || { braut: 0, braeutigam: 0 };
      const winner = r.majorityWinner;
      html += `<div class="sub-big" style="color:var(--rose)">💍 Das Orakel sagt:</div>`;
      html += buildBigBar(counts.braut, counts.braeutigam, "👰 " + nameB, nameBr + " 🤵", winner);
      if(winner){
        const wName = winner === "braut" ? nameB : nameBr;
        html += `<div class="question" style="color:var(--gold);margin-top:30px">➜ ${wName}</div>`;
      }
    }
  }

  view.innerHTML = html;
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
  return {
    who: "Wer von beiden?",
    estimate: "Schätzfrage",
    photo: "Kindheitsfoto",
    prognose: "Ehe-Prognose",
    family: "Familie"
  }[t] || "";
}

console.log("✅ beamer.js loaded");
