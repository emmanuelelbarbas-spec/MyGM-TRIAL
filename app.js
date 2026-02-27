const CONFIG = {
  brands: ["RAW", "SMACKDOWN"],
  divisions: {
    RAW: ["World Heavyweight", "World Womens", "Intercontinental", "Womens Intercontinental", "World Tag Team"],
    SMACKDOWN: ["Undisputed", "WWE Womens", "United States", "Womens United States", "WWE Tag Team"]
  },
  equivalentDivision: {
    "World Heavyweight": "Undisputed",
    "World Womens": "WWE Womens",
    "Intercontinental": "United States",
    "Womens Intercontinental": "Womens United States",
    "World Tag Team": "WWE Tag Team"
  },
  weeklyOrder: {
    RAW: ["Womens Intercontinental", "World Tag Team", "Intercontinental", "World Womens", "World Heavyweight"],
    SMACKDOWN: ["Womens United States", "WWE Tag Team", "United States", "WWE Womens", "Undisputed"]
  },
  ppvOrder: ["Womens United States", "Womens Intercontinental", "World Tag Team", "WWE Tag Team", "United States", "Intercontinental", "World Womens", "WWE Womens", "World Heavyweight", "Undisputed"]
};

const STORAGE_KEY = "wwe-universe-v2";
const TABS = [
  ["estado", "Estado del Universo"],
  ["luchadores", "Gestión de Luchadores"],
  ["rankings", "Rankings"],
  ["combates", "Registrar Combate"],
  ["carteleras", "Carteleras"],
  ["listado", "Listado General"],
  ["historial", "Historial de Shows"]
];

const state = loadState();

function loadState() {
  const base = {
    wrestlers: [],
    matchHistory: [],
    shows: [],
    counters: { weekly: { RAW: 0, SMACKDOWN: 0 }, ppv: 0 },
    currentCards: { RAW: [], SMACKDOWN: [], PPV: [] },
    lastDraftChanges: []
  };
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return base;
  try { return { ...base, ...JSON.parse(raw) }; }
  catch { return base; }
}

function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
const uid = () => crypto.randomUUID();
const today = () => new Date().toISOString().slice(0, 10);

function divisionGender(name) {
  const low = name.toLowerCase();
  if (low.includes("womens")) return "Mujeres";
  return "Hombres";
}

function allDivisions() {
  return [...CONFIG.divisions.RAW.map(d => ["RAW", d]), ...CONFIG.divisions.SMACKDOWN.map(d => ["SMACKDOWN", d])];
}

function wrestlersBy(brand, division, opts = {}) {
  let list = state.wrestlers.filter(w => w.brand === brand && w.division === division);
  if (opts.excludeChampion) list = list.filter(w => !w.isChampion);
  return list;
}

function recalcDivision(brand, division) {
  const list = wrestlersBy(brand, division, { excludeChampion: true })
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
  list.forEach((w, i) => {
    w.previousPosition = w.position || i + 1;
    w.position = i + 1;
  });
}

function recalcAll() { allDivisions().forEach(([b, d]) => recalcDivision(b, d)); }

function getChampion(brand, division) { return state.wrestlers.find(w => w.brand === brand && w.division === division && w.isChampion); }
function championDays(champion) { return champion?.championSinceWeeks ? champion.championSinceWeeks * 7 : 0; }

function renderTabs() {
  const nav = document.getElementById("tabs");
  nav.innerHTML = TABS.map(([id, label], i) => `<button data-tab="${id}" class="${i === 0 ? "active" : ""}">${label}</button>`).join("");
  nav.addEventListener("click", e => {
    const btn = e.target.closest("button[data-tab]");
    if (!btn) return;
    document.querySelectorAll("#tabs button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    document.querySelectorAll(".tab-panel").forEach(p => p.classList.add("hidden"));
    document.getElementById(`tab-${btn.dataset.tab}`).classList.remove("hidden");
  });
}

function renderEstado() {
  const el = document.getElementById("tab-estado");
  const rawCount = state.wrestlers.filter(w => w.brand === "RAW").length;
  const sdCount = state.wrestlers.filter(w => w.brand === "SMACKDOWN").length;
  el.innerHTML = `
  <div class="grid two">
    <article class="card">
      <h3>Estado General</h3>
      <p>RAW: <strong>${rawCount}</strong> luchadores</p>
      <p>SMACKDOWN: <strong>${sdCount}</strong> luchadores</p>
      <p>Shows RAW: <strong>${state.counters.weekly.RAW}</strong></p>
      <p>Shows SmackDown: <strong>${state.counters.weekly.SMACKDOWN}</strong></p>
      <p>PPV registrados: <strong>${state.counters.ppv}</strong></p>
      <button id="btn-soft-draft" class="secondary">Ejecutar Soft Draft</button>
      <div class="small" id="draft-log">${state.lastDraftChanges.map(c => `${c.name}: ${c.from} → ${c.to}`).join("<br>") || "Sin cambios recientes de draft."}</div>
    </article>
    <article class="card">
      <h3>Campeones por división</h3>
      ${allDivisions().map(([brand, div]) => {
        const c = getChampion(brand, div);
        return `<p><span class="badge ${brand === "RAW" ? "raw" : "sd"}">${brand}</span> ${div}: <strong>${c ? c.name : "Sin campeón"}</strong> ${c ? `(${championDays(c)} días)` : ""}</p>`;
      }).join("")}
    </article>
  </div>`;
  document.getElementById("btn-soft-draft").onclick = softDraft;
}

function buildDivisionOptions() {
  return allDivisions().map(([b, d]) => `<option value="${b}|${d}">${b} - ${d}</option>`).join("");
}

function renderWrestlersTab() {
  const el = document.getElementById("tab-luchadores");
  el.innerHTML = `
  <div class="grid two">
    <article class="card">
      <h3>Registrar luchador / tag team</h3>
      <form id="wrestler-form">
        <label>Nombre<input name="name" required /></label>
        <label>Marca<select name="brand"><option>RAW</option><option>SMACKDOWN</option></select></label>
        <label>División<select name="division"></select></label>
        <label><input type="checkbox" name="isTag" /> Es Tag Team</label>
        <div id="tag-extra" class="hidden">
          <label>Nombre del Tag Team<input name="tagName" /></label>
          <label>Integrante 1<input name="tag1" /></label>
          <label>Integrante 2<input name="tag2" /></label>
        </div>
        <button type="submit">Guardar</button>
      </form>
    </article>
    <article class="card">
      <h3>Luchadores registrados</h3>
      <div class="table-wrap"><table><thead><tr><th>Nombre</th><th>Marca</th><th>División</th><th>Campeón</th><th>Acciones</th></tr></thead><tbody id="wrestlers-table"></tbody></table></div>
    </article>
  </div>`;
  const form = document.getElementById("wrestler-form");
  const divSel = form.elements.division;
  divSel.innerHTML = buildDivisionOptions();
  const syncDiv = () => {
    const b = form.elements.brand.value;
    divSel.innerHTML = CONFIG.divisions[b].map(d => `<option>${d}</option>`).join("");
  };
  form.elements.brand.onchange = syncDiv; syncDiv();
  form.elements.isTag.onchange = e => document.getElementById("tag-extra").classList.toggle("hidden", !e.target.checked);
  form.onsubmit = e => {
    e.preventDefault();
    const f = new FormData(form);
    const brand = f.get("brand"), division = f.get("division");
    const isTag = !!f.get("isTag");
    const name = String(f.get("name")).trim();
    if (!name) return;
    if (state.wrestlers.some(w => w.brand === brand && w.division === division && w.name.toLowerCase() === name.toLowerCase())) return alert("Nombre duplicado en división.");
    const base = { id: uid(), name, brand, division, points: 0, wins: 0, losses: 0, isChampion: false, monthsLastPlace: 0, reigns: 0, previousPosition: 0, position: 0, isTagTeam: isTag, tagTeamName: null, championSinceWeeks: 0 };
    if (isTag) {
      const tagName = String(f.get("tagName") || "").trim();
      const members = [String(f.get("tag1") || "").trim(), String(f.get("tag2") || "").trim()].filter(Boolean).sort();
      if (!tagName || members.length < 2) return alert("Completa nombre y 2 integrantes.");
      base.name = tagName;
      base.tagTeamName = tagName;
      members.forEach(m => state.wrestlers.push({ ...base, id: uid(), name: m, isTagTeam: false, tagTeamName: tagName }));
    }
    state.wrestlers.push(base);
    recalcDivision(brand, division); saveState(); renderAll(); form.reset();
  };
  const tbody = document.getElementById("wrestlers-table");
  tbody.innerHTML = state.wrestlers.sort((a, b) => a.name.localeCompare(b.name)).map(w => `
    <tr>
      <td>${w.name} ${w.tagTeamName && !w.isTagTeam ? `<span class="small">(${w.tagTeamName})</span>` : ""}</td>
      <td>${w.brand}</td><td>${w.division}</td><td>${w.isChampion ? "Sí" : "No"}</td>
      <td class="row-actions">
        <button data-a="champ" data-id="${w.id}">Campeón</button>
        <button data-a="move" data-id="${w.id}">Cambiar División</button>
        <button data-a="del" data-id="${w.id}">Eliminar</button>
      </td>
    </tr>`).join("");
  tbody.onclick = e => {
    const btn = e.target.closest("button"); if (!btn) return;
    const w = state.wrestlers.find(x => x.id === btn.dataset.id); if (!w) return;
    if (btn.dataset.a === "del") { state.wrestlers = state.wrestlers.filter(x => x.id !== w.id); }
    if (btn.dataset.a === "move") {
      const nd = prompt("Nueva división", w.division); if (!nd) return;
      w.division = nd; w.points = 0;
    }
    if (btn.dataset.a === "champ") {
      state.wrestlers.forEach(x => { if (x.brand === w.brand && x.division === w.division) x.isChampion = false; });
      w.isChampion = true; w.reigns += 1; w.championSinceWeeks = 0;
    }
    recalcAll(); saveState(); renderAll();
  };
}

function rankingMovement(w) {
  if (!w.previousPosition || !w.position) return "-";
  if (w.position < w.previousPosition) return `<span class='rank-up'>↑ ${w.previousPosition}</span>`;
  if (w.position > w.previousPosition) return `<span class='rank-down'>↓ ${w.previousPosition}</span>`;
  return `= ${w.previousPosition}`;
}

function renderRankings() {
  const el = document.getElementById("tab-rankings");
  el.innerHTML = allDivisions().map(([brand, division]) => {
    const champ = getChampion(brand, division);
    const rank = wrestlersBy(brand, division, { excludeChampion: true }).sort((a, b) => a.position - b.position);
    const p10 = rank[9], p11 = rank[10];
    const risk = p10 && p11 && Math.abs(p10.points - p11.points) < 5;
    return `<article class='card'>
      <h3 class='brand-title ${brand === "RAW" ? "raw" : "smackdown"}'>${brand} - ${division}</h3>
      <p>Campeón: <strong>${champ ? champ.name : "Sin campeón"}</strong> ${champ ? `(${championDays(champ)} días)` : ""}</p>
      ${risk ? `<p class='risk'>EN RIESGO DE SALIR DEL TOP 10</p>` : ""}
      <div class='table-wrap'><table><thead><tr><th>#</th><th>Nombre</th><th>Puntos</th><th>Mov.</th><th>V</th><th>D</th></tr></thead><tbody>
      ${rank.map(w => `<tr><td>${w.position}</td><td>${w.name}</td><td>${w.points}</td><td>${rankingMovement(w)}</td><td>${w.wins}</td><td>${w.losses}</td></tr>`).join("")}
      </tbody></table></div>
    </article>`;
  }).join("");
}

function scoreWeekly(winner, loser) {
  const diff = (loser.position || 99) - (winner.position || 99);
  let winPoints = 8;
  if (diff < 0) winPoints += 5;
  else if (Math.abs(diff) <= 2) winPoints += 2;
  winner.points += winPoints;

  let losePenalty = 3;
  if ((winner.position || 99) > (loser.position || 99)) losePenalty = 6;
  else losePenalty = 2;
  loser.points = Math.max(0, loser.points - losePenalty);
  winner.wins += 1;
  loser.losses += 1;
}

function canFace(a, b, showType) {
  const recent = state.matchHistory
    .filter(m => m.showType === showType && !m.isTitle)
    .sort((x, y) => y.showNumber - x.showNumber)
    .filter(m => (m.wrestlerA === a.id && m.wrestlerB === b.id) || (m.wrestlerA === b.id && m.wrestlerB === a.id))
    .slice(0, 3);
  return recent.length === 0;
}

function renderCombates() {
  const el = document.getElementById("tab-combates");
  el.innerHTML = `<article class='card'><h3>Registrar Combate</h3><form id='fight-form'>
    <label>División<select name='div'>${buildDivisionOptions()}</select></label>
    <label>Luchador A<select name='a'></select></label>
    <label>Luchador B<select name='b'></select></label>
    <label>Ganador<select name='winner'><option value='A'>A</option><option value='B'>B</option></select></label>
    <label><input type='checkbox' name='title' /> Combate por campeonato</label>
    <label>Show RAW/SMACKDOWN/PPV<select name='showType'><option>RAW</option><option>SMACKDOWN</option><option>PPV</option></select></label>
    <button type='submit'>Guardar resultado</button>
  </form></article>`;
  const form = document.getElementById("fight-form");
  const sync = () => {
    const [brand, div] = form.elements.div.value.split("|");
    const list = wrestlersBy(brand, div).map(w => `<option value='${w.id}'>${w.name}</option>`).join("");
    form.elements.a.innerHTML = list; form.elements.b.innerHTML = list;
  };
  form.elements.div.onchange = sync; sync();
  form.onsubmit = e => {
    e.preventDefault();
    const [brand, division] = form.elements.div.value.split("|");
    const a = state.wrestlers.find(w => w.id === form.elements.a.value);
    const b = state.wrestlers.find(w => w.id === form.elements.b.value);
    if (!a || !b || a.id === b.id) return alert("Selecciona 2 luchadores distintos.");
    const isTitle = form.elements.title.checked;
    const winner = form.elements.winner.value === "A" ? a : b;
    const loser = winner.id === a.id ? b : a;
    if (isTitle) {
      if (!winner.isChampion) {
        state.wrestlers.forEach(w => { if (w.brand === brand && w.division === division) w.isChampion = false; });
        winner.isChampion = true; winner.reigns += 1; winner.championSinceWeeks = 0;
        loser.isChampion = false; loser.points = 0;
      }
    } else if (!winner.isChampion && !loser.isChampion) {
      scoreWeekly(winner, loser);
    }
    state.matchHistory.push({ id: uid(), wrestlerA: a.id, wrestlerB: b.id, division, date: today(), showNumber: state.counters.weekly[brand] || state.counters.ppv, isTitle, showType: form.elements.showType.value });
    recalcDivision(brand, division); saveState(); renderAll();
  };
}

function pairDivision(brand, division, usedIds) {
  const top10 = wrestlersBy(brand, division, { excludeChampion: true }).sort((a, b) => a.position - b.position).slice(0, 10);
  for (let i = 0; i < top10.length; i++) {
    for (let j = i + 1; j < top10.length; j++) {
      const a = top10[i], b = top10[j];
      if (usedIds.has(a.id) || usedIds.has(b.id)) continue;
      if (Math.abs((a.position || 99) - (b.position || 99)) > 3) continue;
      if (!canFace(a, b, brand)) continue;
      return [a, b];
    }
  }
  if (top10.length >= 2) return [top10[0], top10[1]];
  return null;
}

function generateWeeklyCard(brand) {
  const used = new Set();
  const bouts = [];
  CONFIG.weeklyOrder[brand].forEach(div => {
    const pair = pairDivision(brand, div, used);
    if (pair && bouts.length < 5) {
      used.add(pair[0].id); used.add(pair[1].id);
      bouts.push({ division: div, contenders: pair.map(p => p.id), brand, isTitle: false });
    }
  });
  state.currentCards[brand] = bouts;
  state.counters.weekly[brand] += 1;
  state.shows.push({ id: uid(), showType: brand, showName: `${brand} #${state.counters.weekly[brand]}`, date: today(), bouts: JSON.parse(JSON.stringify(bouts)), results: [] });
  saveState(); renderAll();
}

function generatePpv() {
  const name = prompt("Nombre del PPV");
  if (!name) return;
  const bouts = [];
  CONFIG.ppvOrder.forEach(div => {
    const brand = CONFIG.divisions.RAW.includes(div) ? "RAW" : "SMACKDOWN";
    const champ = getChampion(brand, div);
    const rank = wrestlersBy(brand, div, { excludeChampion: true }).sort((a, b) => a.position - b.position);
    if (!champ || rank.length === 0) return;
    let contenders = [rank[0].id];
    if (rank[1] && rank[1].points === rank[0].points) contenders.push(rank[1].id);
    bouts.push({ division: div, contenders: [champ.id, ...contenders], brand, isTitle: true });
  });
  state.currentCards.PPV = bouts;
  state.counters.ppv += 1;
  state.shows.push({ id: uid(), showType: "PPV", showName: name, date: today(), bouts: JSON.parse(JSON.stringify(bouts)), results: [] });
  saveState(); renderAll();
}

function renderCardList(showType) {
  const card = state.currentCards[showType] || [];
  return `<ol class='list'>${card.map((m, i) => {
    const names = m.contenders.map(id => state.wrestlers.find(w => w.id === id)?.name || "?").join(" vs ");
    return `<li>${i + 1}. <strong>${m.division}</strong>: ${names}${m.isTitle ? " (Título)" : ""}</li>`;
  }).join("") || "<li>Sin cartelera generada.</li>"}</ol>`;
}

function runDraft(amountEach = 5, includeChampions = true) {
  const changes = [];
  Object.entries(CONFIG.equivalentDivision).forEach(([rawDiv, sdDiv]) => {
    const rawPool = wrestlersBy("RAW", rawDiv).filter(w => includeChampions || !w.isChampion);
    const sdPool = wrestlersBy("SMACKDOWN", sdDiv).filter(w => includeChampions || !w.isChampion);
    shuffle(rawPool).slice(0, Math.min(amountEach, rawPool.length)).forEach(w => { w.brand = "SMACKDOWN"; w.division = sdDiv; changes.push({ name: w.name, from: "RAW", to: "SMACKDOWN" }); });
    shuffle(sdPool).slice(0, Math.min(amountEach, sdPool.length)).forEach(w => { w.brand = "RAW"; w.division = rawDiv; changes.push({ name: w.name, from: "SMACKDOWN", to: "RAW" }); });
  });
  state.lastDraftChanges = changes;
  recalcAll(); saveState(); renderAll();
}

function softDraft() { runDraft(2, false); }

function shuffle(arr) {
  const c = [...arr];
  for (let i = c.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [c[i], c[j]] = [c[j], c[i]];
  }
  return c;
}

function renderCarteleras() {
  const el = document.getElementById("tab-carteleras");
  el.innerHTML = `<div class='grid two'>
    <article class='card'><h3>RAW</h3><button id='gen-raw' class='raw'>Generar RAW</button>${renderCardList("RAW")}</article>
    <article class='card'><h3>SMACKDOWN</h3><button id='gen-sd' class='sd'>Generar SmackDown</button>${renderCardList("SMACKDOWN")}</article>
    <article class='card'><h3>PPV</h3><button id='gen-ppv'>Generar PPV</button>${renderCardList("PPV")}</article>
    <article class='card'><h3>Draft</h3><button id='hard-draft'>Ejecutar Draft Anual</button><p class='small'>Intercambia 5 por división equivalente.</p></article>
  </div>`;
  document.getElementById("gen-raw").onclick = () => generateWeeklyCard("RAW");
  document.getElementById("gen-sd").onclick = () => generateWeeklyCard("SMACKDOWN");
  document.getElementById("gen-ppv").onclick = generatePpv;
  document.getElementById("hard-draft").onclick = () => runDraft(5, true);
}

function renderListado() {
  const el = document.getElementById("tab-listado");
  const byBrand = brand => state.wrestlers.filter(w => w.brand === brand).sort((a, b) => a.name.localeCompare(b.name));
  const block = (brand) => {
    const all = byBrand(brand);
    const men = all.filter(w => divisionGender(w.division) === "Hombres");
    const women = all.filter(w => divisionGender(w.division) === "Mujeres");
    const table = arr => `<div class='table-wrap'><table><thead><tr><th>Nombre</th><th>División</th><th>Pos</th><th>Puntos</th><th>Campeón</th><th>Tag Team</th></tr></thead><tbody>${arr.map(w => `<tr><td>${w.name}</td><td>${w.division}</td><td>${w.position || "-"}</td><td>${w.points}</td><td>${w.isChampion ? "Sí" : "No"}</td><td>${w.tagTeamName || "-"}</td></tr>`).join("")}</tbody></table></div>`;
    return `<article class='card'><h3 class='brand-title ${brand === "RAW" ? "raw" : "smackdown"}'>${brand} (${all.length})</h3><h4>Hombres</h4>${table(men)}<h4>Mujeres</h4>${table(women)}</article>`;
  };
  el.innerHTML = `<div class='grid two'>${block("RAW")}${block("SMACKDOWN")}</div>`;
}

function renderHistorial() {
  const el = document.getElementById("tab-historial");
  const section = type => state.shows.filter(s => s.showType === type).sort((a, b) => b.date.localeCompare(a.date)).map(s => `<li><strong>${s.showName}</strong> (${s.date}) - ${s.bouts.length} luchas</li>`).join("") || "<li>Sin shows</li>";
  el.innerHTML = `<div class='grid two'>
    <article class='card'><h3>RAW</h3><ul class='list'>${section("RAW")}</ul></article>
    <article class='card'><h3>SMACKDOWN</h3><ul class='list'>${section("SMACKDOWN")}</ul></article>
    <article class='card'><h3>PPV</h3><ul class='list'>${section("PPV")}</ul></article>
  </div>`;
}

function advanceChampionWeeks() { state.wrestlers.filter(w => w.isChampion).forEach(w => w.championSinceWeeks += 1); }

function renderAll() {
  advanceChampionWeeks();
  saveState();
  renderEstado();
  renderWrestlersTab();
  renderRankings();
  renderCombates();
  renderCarteleras();
  renderListado();
  renderHistorial();
}

renderTabs();
recalcAll();
renderAll();
