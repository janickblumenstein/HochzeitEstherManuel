// === games.js – Spielmodi ===
const A = window.App, { db, ref, set, onValue, update, get, remove, $, toast, awardScore } = A;

const prevReady = A.listeners.onReady;
A.listeners.onReady = ()=>{
  if(prevReady) prevReady();
  onValue(ref(db, `rooms/${A.room}/game`), snap=>{
    A.state.game = snap.val();
    renderGame();
    renderHostControls();
  });
  bindHostUI();
};

// ═══════════════════════════════════════════════════════════
// HOST: Spiel starten
// ═══════════════════════════════════════════════════════════
function bindHostUI(){
  const typeSel = $("gameTypeSel");
  const presetSel = $("presetSel");

  const refreshPresets = ()=>{
    const type = typeSel.value;
    const presets = (window.HochzeitContent || {})[type] || [];
    presetSel.innerHTML = '<option value="">-- Vorbereitete Frage wählen --</option>' +
      presets.map((p, i)=>`<option value="${i}">${i+1}. ${p.q}</option>`).join("");
    refreshExtraFields();
  };

  const refreshExtraFields = ()=>{
    const type = typeSel.value;
    const extra = $("qExtra");
    if(type === "who"){
      extra.innerHTML = `
        <div class="sub">Richtige Antwort:</div>
        <div class="row">
          <button class="team-btn sel-braut" data-ans="braut">👰 Braut</button>
          <button class="team-btn sel-braeutigam" data-ans="braeutigam">🤵 Bräutigam</button>
        </div>
        <div id="answerIndicator" class="sub" style="text-align:center"></div>
      `;
      setAnswerButtons();
    }
    else if(type === "estimate"){
      extra.innerHTML = `
        <input id="qAnswer" type="number" step="any" placeholder="Richtige Antwort (Zahl)">
        <input id="qUnit" placeholder="Einheit (optional), z.B. Jahre, CHF">
      `;
    }
    else if(type === "photo"){
      extra.innerHTML = `
        <input id="qPhoto" placeholder="Foto-URL (https://...)">
        <div class="sub">Richtige Antwort:</div>
        <div class="row">
          <button class="team-btn sel-braut" data-ans="braut">👰 Braut</button>
          <button class="team-btn sel-braeutigam" data-ans="braeutigam">🤵 Bräutigam</button>
        </div>
        <div id="answerIndicator" class="sub" style="text-align:center"></div>
      `;
      setAnswerButtons();
    }
    else if(type === "prognose"){
      extra.innerHTML = `<div class="sub">💡 Ehe-Prognose = keine richtige Antwort. Gäste stimmen ab, Mehrheit gewinnt für ihr Team 1 Punkt.</div>`;
    }
    else if(type === "family"){
      extra.innerHTML = `
        <div class="row">
          <input id="qOptA" placeholder="Option A">
          <input id="qOptB" placeholder="Option B">
        </div>
        <div class="sub">Richtige Antwort:</div>
        <div class="row">
          <button class="team-btn sel-braut" data-ans="a">A</button>
          <button class="team-btn sel-braeutigam" data-ans="b">B</button>
        </div>
        <div id="answerIndicator" class="sub" style="text-align:center"></div>
      `;
      setAnswerButtons();
    }
  };

  const setAnswerButtons = ()=>{
    let sel = null;
    document.querySelectorAll("[data-ans]").forEach(btn=>{
      btn.onclick = (e)=>{
        e.preventDefault();
        sel = btn.dataset.ans;
        document.querySelectorAll("[data-ans]").forEach(b=>b.style.outline = "");
        btn.style.outline = "3px solid var(--gold)";
        const ind = $("answerIndicator");
        if(ind) ind.innerText = "✓ Ausgewählt: " + btn.innerText;
        $("_tempAnswer") && $("_tempAnswer").remove();
        const hid = document.createElement("input");
        hid.type = "hidden"; hid.id = "_tempAnswer"; hid.value = sel;
        document.body.appendChild(hid);
      };
    });
  };

  typeSel.onchange = refreshPresets;
  refreshPresets();

  $("btnLoadPreset").onclick = ()=>{
    const idx = parseInt(presetSel.value);
    if(isNaN(idx)) return toast("Keine Frage gewählt");
    const type = typeSel.value;
    const p = (window.HochzeitContent || {})[type][idx];
    if(!p) return;
    $("qText").value = p.q || "";
    if(type === "who" || type === "photo" || type === "family"){
      const ansVal = p.answer;
      const btn = document.querySelector(`[data-ans="${ansVal}"]`);
      if(btn) btn.click();
    }
    if(type === "estimate"){
      $("qAnswer").value = p.answer;
      $("qUnit").value = p.unit || "";
    }
    if(type === "photo"){
      $("qPhoto").value = p.photoUrl || "";
    }
    if(type === "family"){
      $("qOptA").value = p.optA || "";
      $("qOptB").value = p.optB || "";
    }
    toast("Frage geladen – du kannst sie noch anpassen");
  };

  $("btnStartGame").onclick = async()=>{
    if(!A.isHost) return;
    const type = typeSel.value;
    const q = $("qText").value.trim();
    if(!q) return toast("Bitte Frage eingeben!");

    const game = {
      type, q,
      phase: "answer",
      answers: {},
      startedAt: Date.now()
    };

    if(type === "who" || type === "photo"){
      const ans = ($("_tempAnswer") || {}).value;
      if(!ans) return toast("Bitte richtige Antwort wählen!");
      game.answer = ans;
      if(type === "photo"){
        const url = $("qPhoto").value.trim();
        if(!url) return toast("Bitte Foto-URL eintragen!");
        game.photoUrl = url;
      }
    }
    else if(type === "estimate"){
      const ans = parseFloat($("qAnswer").value);
      if(isNaN(ans)) return toast("Bitte eine Zahl als Antwort eingeben!");
      game.answer = ans;
      game.unit = $("qUnit").value.trim();
    }
    else if(type === "family"){
      const a = $("qOptA").value.trim(), b = $("qOptB").value.trim();
      const ans = ($("_tempAnswer") || {}).value;
      if(!a || !b) return toast("Bitte beide Optionen eintragen!");
      if(!ans) return toast("Bitte richtige Antwort wählen!");
      game.optA = a; game.optB = b; game.answer = ans;
    }
    // prognose → keine Antwort

    await set(ref(db, `rooms/${A.room}/game`), game);
    $("qText").value = "";
    $("_tempAnswer") && $("_tempAnswer").remove();
    document.querySelectorAll("[data-ans]").forEach(b=>b.style.outline = "");
    toast("🚀 Runde gestartet!");
    A.switchTab("Game");
  };

  $("btnReveal").onclick = reveal;
  $("btnEndGame").onclick = async()=>{
    if(!A.isHost) return;
    await remove(ref(db, `rooms/${A.room}/game`));
    toast("Runde beendet");
  };
}

function renderHostControls(){
  const g = A.state.game;
  const hasGame = !!g;
  const inAnswer = g && g.phase === "answer";
  $("btnReveal").disabled = !inAnswer;
  $("btnEndGame").disabled = !hasGame;
}

// ═══════════════════════════════════════════════════════════
// PLAYER: Aktuelles Spiel anzeigen
// ═══════════════════════════════════════════════════════════
function renderGame(){
  const g = A.state.game;
  const panel = $("gamePanel");
  const wait = $("gameWait");
  if(!g){
    panel.classList.add("hidden");
    wait.classList.remove("hidden");
    return;
  }
  panel.classList.remove("hidden");
  wait.classList.add("hidden");
  const body = $("gameBody");
  const myAns = (g.answers || {})[A.user];

  let html = `<div class="q-big">${g.q}</div>`;

  // Foto wenn vorhanden
  if(g.type === "photo" && g.photoUrl){
    html += `<div class="photo-box"><img src="${g.photoUrl}" alt="Foto" onerror="this.parentElement.innerHTML='<div class=&quot;ph&quot;>📷</div>'"></div>`;
  }

  // ----- ANSWER PHASE -----
  if(g.phase === "answer"){
    if(myAns !== undefined){
      const label = labelForAnswer(g, myAns);
      html += `<div class="flash">✅ Deine Antwort: <b>${label}</b></div>`;
      const total = Object.keys(A.players).length;
      const cnt = Object.keys(g.answers || {}).length;
      html += `<div class="sub" style="text-align:center">${cnt}/${total} haben geantwortet</div>`;
    } else {
      html += buildAnswerInput(g);
    }
  }
  // ----- REVEAL PHASE -----
  else if(g.phase === "reveal"){
    html += buildRevealView(g);
  }

  body.innerHTML = html;
  wireAnswerInputs(g);
}

function labelForAnswer(g, ans){
  const m = A.meta || {};
  if(g.type === "who" || g.type === "photo"){
    return ans === "braut" ? (m.braut || "Braut") : (m.braeutigam || "Bräutigam");
  }
  if(g.type === "family"){
    return ans === "a" ? g.optA : g.optB;
  }
  if(g.type === "prognose"){
    return ans === "braut" ? (m.braut || "Braut") : (m.braeutigam || "Bräutigam");
  }
  if(g.type === "estimate"){
    return g.unit ? `${ans} ${g.unit}` : String(ans);
  }
  return String(ans);
}

function buildAnswerInput(g){
  const m = A.meta || {};
  if(g.type === "who" || g.type === "photo" || g.type === "prognose"){
    return `<div class="grid2" style="margin-top:20px">
      <button class="btn-braut" data-send="braut" style="padding:24px;font-size:1.1rem">👰<br>${m.braut || "Braut"}</button>
      <button class="btn-braeutigam" data-send="braeutigam" style="padding:24px;font-size:1.1rem">🤵<br>${m.braeutigam || "Bräutigam"}</button>
    </div>`;
  }
  if(g.type === "family"){
    return `<div class="grid2" style="margin-top:20px">
      <button class="btn-braut" data-send="a" style="padding:24px;font-size:1rem">${g.optA}</button>
      <button class="btn-braeutigam" data-send="b" style="padding:24px;font-size:1rem">${g.optB}</button>
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
// REVEAL LOGIC (Host-Trigger)
// ═══════════════════════════════════════════════════════════
async function reveal(){
  if(!A.isHost) return;
  const g = (await get(ref(db, `rooms/${A.room}/game`))).val();
  if(!g) return;

  const answers = g.answers || {};
  let result = { correctPlayers: [], teamPoints: { braut: 0, braeutigam: 0 }, breakdown: null };

  // ----- WHO / PHOTO / FAMILY: Direkte richtige Antwort -----
  if(g.type === "who" || g.type === "photo" || g.type === "family"){
    for(const [player, ans] of Object.entries(answers)){
      if(ans === g.answer){
        await awardScore(player, 1);
        result.correctPlayers.push(player);
        const t = (A.players[player] || {}).team;
        if(t) result.teamPoints[t]++;
      }
    }
    const counts = {};
    Object.values(answers).forEach(a=>{ counts[a] = (counts[a] || 0) + 1; });
    result.breakdown = counts;
  }
  // ----- ESTIMATE: Nächstdran gewinnt -----
  else if(g.type === "estimate"){
    const entries = Object.entries(answers).map(([p, v])=>({ p, v, diff: Math.abs(v - g.answer) }));
    entries.sort((a, b)=>a.diff - b.diff);
    if(entries.length){
      // Top 3 bekommen 3/2/1 Punkt
      const awards = [3, 2, 1];
      for(let i = 0; i < Math.min(3, entries.length); i++){
        const pts = awards[i];
        const { p } = entries[i];
        await awardScore(p, pts);
        result.correctPlayers.push({ p, pts, diff: entries[i].diff, v: entries[i].v });
        const t = (A.players[p] || {}).team;
        if(t) result.teamPoints[t] += pts;
      }
      result.ranking = entries.slice(0, 8);
    }
  }
  // ----- PROGNOSE: Mehrheit = +1 für Team -----
  else if(g.type === "prognose"){
    const counts = { braut: 0, braeutigam: 0 };
    Object.values(answers).forEach(a=>{ if(counts[a] !== undefined) counts[a]++; });
    const winner = counts.braut > counts.braeutigam ? "braut" :
                   counts.braeutigam > counts.braut ? "braeutigam" : null;
    if(winner){
      // Alle die AUF DEM Gewinner-Team sind und dafür gestimmt haben → +1
      for(const [p, a] of Object.entries(answers)){
        if(a === winner && (A.players[p] || {}).team === winner){
          await awardScore(p, 1);
          result.correctPlayers.push(p);
        }
      }
      result.majorityWinner = winner;
    }
    result.breakdown = counts;
  }

  await update(ref(db, `rooms/${A.room}/game`), {
    phase: "reveal",
    result
  });
}

function buildRevealView(g){
  const m = A.meta || {};
  const nameB = m.braut || "Braut";
  const nameBr = m.braeutigam || "Bräutigam";
  const r = g.result || {};
  let html = "";

  if(g.type === "who" || g.type === "photo" || g.type === "family"){
    const correctLabel = labelForAnswer(g, g.answer);
    html += `<div class="flash gold"><b>✓ Richtige Antwort:</b> ${correctLabel}</div>`;
    // Vote-Verteilung
    const counts = r.breakdown || {};
    const total = Object.values(counts).reduce((s, c)=>s + c, 0) || 1;
    if(g.type === "family"){
      const a = counts["a"] || 0, b = counts["b"] || 0;
      html += `<div class="result-bar">
        <div class="rb braut" style="width:${a/total*100}%">${a > 0 ? a : ''}</div>
        <div class="rb braeutigam" style="width:${b/total*100}%">${b > 0 ? b : ''}</div>
      </div>
      <div class="row" style="font-size:.8rem;opacity:.8"><span>${g.optA} (${a})</span><span style="text-align:right">${g.optB} (${b})</span></div>`;
    } else {
      const a = counts["braut"] || 0, b = counts["braeutigam"] || 0;
      html += `<div class="result-bar">
        <div class="rb braut" style="width:${a/total*100}%">${a > 0 ? a : ''}</div>
        <div class="rb braeutigam" style="width:${b/total*100}%">${b > 0 ? b : ''}</div>
      </div>
      <div class="row" style="font-size:.8rem;opacity:.8"><span>👰 ${nameB} (${a})</span><span style="text-align:right">${nameBr} 🤵 (${b})</span></div>`;
    }
    // Richtig-Liste
    if(r.correctPlayers && r.correctPlayers.length){
      html += `<div class="flash">🎉 Richtig: ${r.correctPlayers.join(", ")} <br>Je +1 Punkt fürs Team!</div>`;
    } else {
      html += `<div class="flash warn">Keiner hatte es richtig...</div>`;
    }
  }
  else if(g.type === "estimate"){
    html += `<div class="flash gold"><b>✓ Richtige Antwort:</b> ${g.answer}${g.unit ? ' ' + g.unit : ''}</div>`;
    if(r.ranking && r.ranking.length){
      html += `<h3>Näher dran – besser:</h3>`;
      r.ranking.forEach((e, i)=>{
        const medal = ['🥇','🥈','🥉'][i] || ((i+1)+'.');
        const pts = i < 3 ? ['+3','+2','+1'][i] : '';
        const tm = (A.players[e.p] || {}).team;
        const tmIcon = tm === "braut" ? "👰" : tm === "braeutigam" ? "🤵" : "";
        html += `<div class="score-row"><span>${medal} ${tmIcon} ${e.p}: ${e.v}${g.unit?' '+g.unit:''} <span class="sub">(Δ ${e.diff.toFixed(1)})</span></span><strong>${pts}</strong></div>`;
      });
    } else {
      html += `<div class="flash warn">Niemand hat geantwortet</div>`;
    }
  }
  else if(g.type === "prognose"){
    const counts = r.breakdown || { braut: 0, braeutigam: 0 };
    const total = (counts.braut || 0) + (counts.braeutigam || 0) || 1;
    const winner = r.majorityWinner;
    html += `<div class="flash rose">💍 Das Orakel sagt:</div>`;
    html += `<div class="result-bar">
      <div class="rb braut" style="width:${counts.braut/total*100}%">${counts.braut}</div>
      <div class="rb braeutigam" style="width:${counts.braeutigam/total*100}%">${counts.braeutigam}</div>
    </div>
    <div class="row" style="font-size:.8rem;opacity:.8"><span>👰 ${nameB}</span><span style="text-align:right">${nameBr} 🤵</span></div>`;
    if(winner){
      const wName = winner === "braut" ? nameB : nameBr;
      html += `<div class="flash gold">Mehrheit sagt: <b>${wName}</b>! Team ${wName} bekommt +1 je Tipp.</div>`;
    } else {
      html += `<div class="flash">Unentschieden – das Orakel ist gespalten!</div>`;
    }
  }

  html += `<hr><div class="sub" style="text-align:center">Der Host startet gleich die nächste Runde...</div>`;
  return html;
}

console.log("✅ games.js loaded");
