const STORAGE_KEY = "wweUniverseManagerV2";
const BRANDS = ["RAW", "SMACKDOWN"];
const DIVISIONS = {
  RAW: ["World Heavyweight", "World Womens", "Intercontinental", "Womens Intercontinental", "World Tag Team"],
  SMACKDOWN: ["Undisputed", "WWE Womens", "United States", "Womens United States", "WWE Tag Team"],
};
const PPV_ORDER = [
  "Womens United States", "Womens Intercontinental", "World Tag Team", "WWE Tag Team", "United States",
  "Intercontinental", "World Womens", "WWE Womens", "World Heavyweight", "Undisputed",
];
const WEEKLY_ORDER = {
  RAW: ["Womens Intercontinental", "World Tag Team", "Intercontinental", "World Womens", "World Heavyweight"],
  SMACKDOWN: ["Womens United States", "WWE Tag Team", "United States", "WWE Womens", "Undisputed"],
};
const EQUIVALENT = [
  ["World Heavyweight", "Undisputed"],
  ["World Womens", "WWE Womens"],
  ["Intercontinental", "United States"],
  ["Womens Intercontinental", "Womens United States"],
  ["World Tag Team", "WWE Tag Team"],
];

const TABS = ["Estado del Universo", "Gestión de Luchadores", "Rankings", "Registrar Combate", "Carteleras", "Listado General de Luchadores", "Historial de Shows"];

let activeTab = TABS[0];
let state = loadState();

function createInitialState() {
  return {
    wrestlers: [],
    matches: [],
    shows: [],
    globalWeek: 0,
    counters: { RAW: 0, SMACKDOWN: 0, PPV: 0 },
    draftLog: [],
  };
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return createInitialState();
  try { return { ...createInitialState(), ...JSON.parse(raw) }; }
  catch { return createInitialState(); }
}
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
function divisionBrand(division) {
  return DIVISIONS.RAW.includes(division) ? "RAW" : "SMACKDOWN";
}
function getRanking(division) {
  const ranking = state.wrestlers.filter(w => w.division === division && !w.esCampeon)
    .sort((a,b) => b.puntos - a.puntos || b.victorias - a.victorias || a.nombre.localeCompare(b.nombre));
  ranking.forEach((w, i) => {
    w.posicionAnterior = w.posicionActual || i + 1;
    w.posicionActual = i + 1;
  });
  return ranking;
}
function championOf(division) { return state.wrestlers.find(w => w.division === division && w.esCampeon); }
function render() {
  renderTabs();
  const c = document.getElementById("content");
  c.innerHTML = "";
  if (activeTab === "Estado del Universo") c.append(renderUniverse());
  if (activeTab === "Gestión de Luchadores") c.append(renderWrestlerMgmt());
  if (activeTab === "Rankings") c.append(renderRankings());
  if (activeTab === "Registrar Combate") c.append(renderMatchRegister());
  if (activeTab === "Carteleras") c.append(renderCardsPanel());
  if (activeTab === "Listado General de Luchadores") c.append(renderGeneralList());
  if (activeTab === "Historial de Shows") c.append(renderShowHistory());
}
function renderTabs() {
  const nav = document.getElementById("tabs");
  nav.innerHTML = "";
  TABS.forEach(tab => {
    const btn = document.getElementById("tab-template").content.firstElementChild.cloneNode(true);
    btn.textContent = tab;
    btn.classList.toggle("active", tab === activeTab);
    btn.onclick = () => { activeTab = tab; render(); };
    nav.append(btn);
  });
}
function brandClass(brand){ return brand === "RAW" ? "brand-raw" : "brand-smackdown"; }

function renderUniverse() {
  const div = document.createElement("div");
  div.className = "grid";
  const summary = document.createElement("section");
  summary.className = "card";
  summary.innerHTML = `<h3>Resumen</h3>
    <p>Semana global: <b>${state.globalWeek}</b> (${state.globalWeek * 7} días acumulados)</p>
    <p>Shows RAW: <b>${state.counters.RAW}</b> | SmackDown: <b>${state.counters.SMACKDOWN}</b> | PPV: <b>${state.counters.PPV}</b></p>
    <p>Total luchadores: <b>${state.wrestlers.length}</b></p>`;
  const champs = document.createElement("section");
  champs.className = "card";
  champs.innerHTML = `<h3>Campeones actuales</h3>${Object.values(DIVISIONS).flat().map(d=>{
    const c = championOf(d);
    return `<p><b>${d}:</b> ${c ? c.nombre : "(sin campeón)"}</p>`;
  }).join("")}`;
  div.append(summary, champs);
  return div;
}

function renderWrestlerMgmt() {
  const wrap = document.createElement("div");
  wrap.className = "grid";
  const formCard = document.createElement("section");
  formCard.className = "card";
  formCard.innerHTML = `<h3>Registrar luchador / tag team</h3>
  <form id="wrestlerForm">
    <label>Nombre o nombre del tag team<input required name="nombre"></label>
    <div class="row">
      <label>Marca<select name="marca">${BRANDS.map(b=>`<option>${b}</option>`).join("")}</select></label>
      <label>División<select name="division"></select></label>
    </div>
    <label><input type="checkbox" id="isTag"> Es Tag Team</label>
    <div id="tagFields" style="display:none">
      <label>Nombre del Tag Team<input name="nombreTagTeam"></label>
      <div class="row">
        <label>Integrante 1<input name="i1"></label>
        <label>Integrante 2<input name="i2"></label>
      </div>
    </div>
    <button>Guardar</button>
  </form>`;

  const list = document.createElement("section");
  list.className = "card";
  list.innerHTML = `<h3>Luchadores</h3><div class="table-wrap"><table><thead><tr><th>Nombre</th><th>Marca</th><th>División</th><th>Puntos</th><th>Campeón</th><th>Tag</th><th>Acciones</th></tr></thead><tbody></tbody></table></div>`;
  const tbody = list.querySelector("tbody");

  [...state.wrestlers].sort((a,b)=>a.nombre.localeCompare(b.nombre)).forEach(w => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${w.nombre}</td><td>${w.marca}</td><td>${w.division}</td><td>${w.puntos}</td><td>${w.esCampeon ? "Sí" : "No"}</td><td>${w.nombreTagTeam || "-"}</td><td><div class="actions"><button data-id="${w.id}" data-a="champ">Campeón</button><button data-id="${w.id}" data-a="move">Mover</button><button data-id="${w.id}" data-a="del">Eliminar</button></div></td>`;
    tbody.append(tr);
  });

  wrap.append(formCard, list);
  const form = formCard.querySelector("form");
  const brandSelect = form.marca;
  const divisionSelect = form.division;
  const fillDivisions = () => {
    divisionSelect.innerHTML = DIVISIONS[brandSelect.value].map(d=>`<option>${d}</option>`).join("");
  };
  fillDivisions();
  brandSelect.onchange = fillDivisions;
  form.querySelector("#isTag").onchange = (e) => {
    form.querySelector("#tagFields").style.display = e.target.checked ? "block" : "none";
  };
  form.onsubmit = (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    const name = String(data.nombre || "").trim();
    if (!name) return;
    const exists = state.wrestlers.some(w => w.division === data.division && w.nombre.toLowerCase() === name.toLowerCase());
    if (exists) return alert("Nombre duplicado en la división.");
    const base = {
      id: uid(), nombre: name, marca: data.marca, division: data.division,
      puntos: 0, victorias: 0, derrotas: 0, esCampeon: false, mesesUltimoLugar: 0, reinados: 0,
      posicionAnterior: 0, posicionActual: 0, isTagTeam: !!form.querySelector("#isTag").checked,
      nombreTagTeam: data.nombreTagTeam ? String(data.nombreTagTeam).trim() : "", championSinceWeek: null,
    };
    if (base.isTagTeam) {
      if (!data.i1 || !data.i2 || !base.nombreTagTeam) return alert("Completa nombre del team e integrantes.");
      const members = [String(data.i1).trim(), String(data.i2).trim()].sort((a,b)=>a.localeCompare(b));
      members.forEach(m => {
        if (!state.wrestlers.some(w => w.nombre.toLowerCase() === m.toLowerCase())) {
          state.wrestlers.push({ ...base, id: uid(), nombre: m, isTagTeam: false, nombreTagTeam: base.nombreTagTeam });
        }
      });
      base.nombre = base.nombreTagTeam;
    }
    state.wrestlers.push(base);
    saveState(); render();
  };

  tbody.onclick = (e) => {
    const btn = e.target.closest("button"); if (!btn) return;
    const id = btn.dataset.id; const act = btn.dataset.a;
    const w = state.wrestlers.find(x => x.id === id); if (!w) return;
    if (act === "del") {
      state.wrestlers = state.wrestlers.filter(x => x.id !== id);
    }
    if (act === "move") {
      const nd = prompt("Nueva división:", w.division);
      if (nd && Object.values(DIVISIONS).flat().includes(nd)) {
        w.division = nd; w.marca = divisionBrand(nd); w.puntos = 0; w.esCampeon = false;
      }
    }
    if (act === "champ") {
      const current = championOf(w.division);
      if (current) { current.esCampeon = false; current.championSinceWeek = null; }
      w.esCampeon = true; w.championSinceWeek = state.globalWeek; w.reinados += 1;
    }
    saveState(); render();
  };
  return wrap;
}

function movementText(w) {
  if (!w.posicionAnterior || !w.posicionActual) return "-";
  if (w.posicionActual < w.posicionAnterior) return `<span class="movement-up">↑ ${w.posicionAnterior}</span>`;
  if (w.posicionActual > w.posicionAnterior) return `<span class="movement-down">↓ ${w.posicionAnterior}</span>`;
  return "→";
}

function renderRankings() {
  const container = document.createElement("div");
  container.className = "grid";
  Object.values(DIVISIONS).flat().forEach(division => {
    const card = document.createElement("section");
    const brand = divisionBrand(division);
    card.className = `card ${brandClass(brand)}`;
    const champion = championOf(division);
    const days = champion ? (state.globalWeek - (champion.championSinceWeek ?? state.globalWeek)) * 7 : 0;
    const ranking = getRanking(division);
    const risk = ranking[9] && ranking[10] && ranking[9].puntos - ranking[10].puntos < 5;
    card.innerHTML = `<h3>${division}</h3>
      <p>Campeón: <b>${champion ? champion.nombre : "(sin campeón)"}</b> | Días como campeón: <b>${days}</b></p>
      ${risk ? `<p class="alert">EN RIESGO DE SALIR DEL TOP 10</p>` : ""}
      <div class="table-wrap"><table><thead><tr><th>#</th><th>Nombre</th><th>Puntos</th><th>Movimiento</th><th>V</th><th>D</th></tr></thead><tbody>${ranking.map(w=>`<tr><td>${w.posicionActual}</td><td>${w.nombre}</td><td>${w.puntos}</td><td>${movementText(w)}</td><td>${w.victorias}</td><td>${w.derrotas}</td></tr>`).join("")}</tbody></table></div>`;
    container.append(card);
  });
  saveState();
  return container;
}

function calcPoints(winner, loser) {
  const rank = getRanking(winner.division);
  const wPos = rank.find(x=>x.id===winner.id)?.posicionActual ?? 99;
  const lPos = rank.find(x=>x.id===loser.id)?.posicionActual ?? 99;
  let winGain = 8;
  if (lPos < wPos) winGain += 5;
  else if (Math.abs(lPos - wPos) <= 2) winGain += 2;
  let losePenalty = lPos > wPos ? 6 : 2;
  winner.puntos += winGain; winner.victorias += 1;
  loser.puntos = Math.max(0, loser.puntos - losePenalty); loser.derrotas += 1;
}

function renderMatchRegister() {
  const card = document.createElement("section");
  card.className = "card";
  card.innerHTML = `<h3>Registrar combate</h3>
    <form id="matchForm">
      <label>División<select name="division">${Object.values(DIVISIONS).flat().map(d=>`<option>${d}</option>`).join("")}</select></label>
      <div class="row"><label>Luchador A<select name="a"></select></label><label>Luchador B<select name="b"></select></label></div>
      <label>Ganador<select name="winner"></select></label>
      <label><input type="checkbox" name="title"> Combate por campeonato</label>
      <button>Registrar</button>
    </form>`;
  const form = card.querySelector("form");
  const fill = () => {
    const division = form.division.value;
    const pool = state.wrestlers.filter(w => w.division === division);
    const opt = pool.map(w=>`<option value="${w.id}">${w.nombre}${w.esCampeon ? " (C)" : ""}</option>`).join("");
    form.a.innerHTML = opt; form.b.innerHTML = opt; form.winner.innerHTML = opt;
  };
  form.division.onchange = fill; fill();
  form.onsubmit = (e) => {
    e.preventDefault();
    if (form.a.value === form.b.value) return alert("Selecciona rivales distintos.");
    const A = state.wrestlers.find(w=>w.id===form.a.value);
    const B = state.wrestlers.find(w=>w.id===form.b.value);
    const winner = state.wrestlers.find(w=>w.id===form.winner.value);
    const loser = winner.id === A.id ? B : A;
    if (!A || !B || !winner || !loser) return;
    if (!(winner.esCampeon || loser.esCampeon)) calcPoints(winner, loser);
    else { winner.victorias += 1; loser.derrotas += 1; }
    if (form.title.checked && loser.esCampeon) {
      loser.esCampeon = false; loser.championSinceWeek = null;
      winner.esCampeon = true; winner.reinados += 1; winner.championSinceWeek = state.globalWeek;
      loser.puntos = 0;
    }
    state.matches.push({
      idCombate: uid(), luchadorA: A.id, luchadorB: B.id, division: form.division.value,
      fecha: new Date().toISOString(), numeroShow: state.globalWeek, esCombatePorCampeonato: form.title.checked,
    });
    saveState(); render();
  };
  return card;
}

function canFight(a, b, division) {
  const recent = state.matches.filter(m => m.division===division).slice(-50).reverse();
  let weeklySeen = 0;
  for (const m of recent) {
    const show = state.shows.find(s=>s.id===m.showId);
    if (!show || show.type === "PPV") continue;
    weeklySeen += 1;
    if (weeklySeen > 15) break;
    if ((m.luchadorA===a.id && m.luchadorB===b.id) || (m.luchadorA===b.id && m.luchadorB===a.id)) {
      const delta = state.globalWeek - m.numeroShow;
      if (delta <= 3) return false;
    }
  }
  return true;
}
function generateWeekly(brand) {
  const fights = [];
  const used = new Set();
  WEEKLY_ORDER[brand].forEach(division => {
    const ranking = getRanking(division).slice(0,10);
    let pair = null;
    for (const a of ranking) {
      if (used.has(a.id)) continue;
      const candidates = ranking.filter(b => b.id!==a.id && !used.has(b.id) && Math.abs((a.posicionActual||99)-(b.posicionActual||99))<=3);
      pair = candidates.find(b=>canFight(a,b,division)) || candidates[0];
      if (pair) { pair = [a, pair]; break; }
    }
    if (pair) { used.add(pair[0].id); used.add(pair[1].id); fights.push({ division, participants: pair.map(x=>x.id) }); }
  });
  const show = { id: uid(), type: brand, number: ++state.counters[brand], week: ++state.globalWeek, fights, results: [], date: new Date().toISOString() };
  state.shows.push(show);
  saveState();
  return show;
}
function generatePPV(name) {
  if (!name.trim()) return alert("Nombre de PPV obligatorio.");
  const fights = PPV_ORDER.map(division => {
    const champ = championOf(division);
    const rank = getRanking(division);
    const p1 = rank[0]; const p2 = rank[1];
    if (!champ || !p1) return null;
    const tie = p2 && p1.puntos === p2.puntos;
    return { division, participants: tie ? [champ.id, p1.id, p2.id] : [champ.id, p1.id], title: true };
  }).filter(Boolean);
  const show = { id: uid(), type: "PPV", name, number: ++state.counters.PPV, week: ++state.globalWeek, fights, results: [], date: new Date().toISOString() };
  state.shows.push(show);
  saveState();
  return show;
}
function applyPPVReset() {
  state.wrestlers.forEach(w => { w.puntos = 0; });
}

function executeSoftDraft() {
  const changes = [];
  EQUIVALENT.forEach(([rawDiv, sdDiv]) => {
    const rawPool = state.wrestlers.filter(w => w.division===rawDiv && !w.esCampeon);
    const sdPool = state.wrestlers.filter(w => w.division===sdDiv && !w.esCampeon);
    const pick = (arr, n) => [...arr].sort(()=>Math.random()-0.5).slice(0, Math.min(n, arr.length));
    const fromRaw = pick(rawPool, 2);
    const fromSd = pick(sdPool, 2);
    fromRaw.forEach(w => { w.division = sdDiv; w.marca = "SMACKDOWN"; changes.push(`${w.nombre} → SMACKDOWN (${sdDiv})`); });
    fromSd.forEach(w => { w.division = rawDiv; w.marca = "RAW"; changes.push(`${w.nombre} → RAW (${rawDiv})`); });
  });
  state.draftLog = changes;
  saveState(); render();
}

function renderCardsPanel() {
  const card = document.createElement("section");
  card.className = "card";
  const latestRaw = [...state.shows].reverse().find(s=>s.type==="RAW");
  const latestSD = [...state.shows].reverse().find(s=>s.type==="SMACKDOWN");
  const latestPPV = [...state.shows].reverse().find(s=>s.type==="PPV");
  card.innerHTML = `<h3>Carteleras</h3>
    <div class="row"><button id="genRaw">Generar RAW</button><button id="genSd">Generar SmackDown</button></div>
    <label>Nombre PPV<input id="ppvName" placeholder="Ej: WrestleMania"></label>
    <button id="genPpv">Generar PPV</button>
    <button id="softDraft">Ejecutar Soft Draft</button>
    <h4>Últimas carteleras</h4>
    <p><b>RAW:</b> ${latestRaw ? latestRaw.fights.map(f=>`${f.division}`).join(", ") : "-"}</p>
    <p><b>SMACKDOWN:</b> ${latestSD ? latestSD.fights.map(f=>`${f.division}`).join(", ") : "-"}</p>
    <p><b>PPV:</b> ${latestPPV ? `${latestPPV.name} (${latestPPV.fights.length} luchas)` : "-"}</p>
    ${state.draftLog.length ? `<h4>Cambios Soft Draft</h4><ul>${state.draftLog.map(c=>`<li>${c}</li>`).join("")}</ul>` : ""}`;
  card.querySelector("#genRaw").onclick = () => { generateWeekly("RAW"); render(); };
  card.querySelector("#genSd").onclick = () => { generateWeekly("SMACKDOWN"); render(); };
  card.querySelector("#genPpv").onclick = () => {
    const name = card.querySelector("#ppvName").value;
    generatePPV(name);
    render();
  };
  card.querySelector("#softDraft").onclick = executeSoftDraft;
  return card;
}

function renderGeneralList() {
  const container = document.createElement("div");
  container.className = "grid";
  BRANDS.forEach(brand => {
    const card = document.createElement("section");
    card.className = `card ${brandClass(brand)}`;
    const list = state.wrestlers.filter(w => w.marca === brand).sort((a,b)=>a.nombre.localeCompare(b.nombre));
    card.innerHTML = `<h3>${brand} (Total ${list.length})</h3>
      <div class="table-wrap"><table><thead><tr><th>Nombre</th><th>División</th><th>Pos.</th><th>Puntos</th><th>Campeón</th><th>Tag Team</th></tr></thead><tbody>${list.map(w=>`<tr><td>${w.nombre}</td><td>${w.division}</td><td>${w.posicionActual || "-"}</td><td>${w.puntos}</td><td>${w.esCampeon ? "Sí" : "No"}</td><td>${w.nombreTagTeam || "-"}</td></tr>`).join("")}</tbody></table></div>`;
    container.append(card);
  });
  return container;
}

function renderShowHistory() {
  const container = document.createElement("div");
  container.className = "grid";
  ["RAW","SMACKDOWN","PPV"].forEach(type => {
    const card = document.createElement("section");
    card.className = `card ${type==="RAW" ? "brand-raw" : type==="SMACKDOWN" ? "brand-smackdown" : ""}`;
    const shows = [...state.shows].filter(s=>s.type===type).reverse();
    card.innerHTML = `<h3>${type}</h3>${shows.map(show => `<div class="show-card"><p><b>${type}${type==='PPV' ? ` - ${show.name}` : ` #${show.number}`}</b> | Semana ${show.week}</p><ul>${show.fights.map(f => `<li>${f.division}: ${f.participants.map(id => state.wrestlers.find(w=>w.id===id)?.nombre || "?").join(" vs ")}</li>`).join("")}</ul></div>`).join("") || "<p class='muted'>Sin shows.</p>"}`;
    container.append(card);
  });
  return container;
}

render();
