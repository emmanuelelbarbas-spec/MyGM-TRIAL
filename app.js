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
const STORAGE_KEY = 'wweUniverseV2';

const CONFIG = {
  brands: ['RAW', 'SMACKDOWN'],
  divisions: {
    RAW: ['World Heavyweight', 'World Womens', 'Intercontinental', 'Womens Intercontinental', 'World Tag Team'],
    SMACKDOWN: ['Undisputed', 'WWE Womens', 'United States', 'Womens United States', 'WWE Tag Team']
  },
  weeklyOrder: {
    RAW: ['Womens Intercontinental', 'World Tag Team', 'Intercontinental', 'World Womens', 'World Heavyweight'],
    SMACKDOWN: ['Womens United States', 'WWE Tag Team', 'United States', 'WWE Womens', 'Undisputed']
  },
  ppvOrder: ['Womens United States', 'Womens Intercontinental', 'World Tag Team', 'WWE Tag Team', 'United States', 'Intercontinental', 'World Womens', 'WWE Womens', 'World Heavyweight', 'Undisputed'],
  equivalent: [
    ['World Heavyweight', 'Undisputed'],
    ['World Womens', 'WWE Womens'],
    ['Intercontinental', 'United States'],
    ['Womens Intercontinental', 'Womens United States'],
    ['World Tag Team', 'WWE Tag Team']
  ]
};

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const byId = (id) => document.getElementById(id);
const nowDate = () => new Date().toISOString().slice(0, 10);

let state = loadState();

function defaultState() {
  return { wrestlers: [], matches: [], shows: [], counters: { RAW: 0, SMACKDOWN: 0, PPV: 0 }, championSinceWeek: {} };
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultState();
  try { return { ...defaultState(), ...JSON.parse(raw) }; }
  catch { return defaultState(); }
}

function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

function allDivisions() {
  return [...CONFIG.divisions.RAW, ...CONFIG.divisions.SMACKDOWN];
}

function divisionBrand(division) {
  return CONFIG.divisions.RAW.includes(division) ? 'RAW' : 'SMACKDOWN';
}

function getDivisionRoster(division) {
  return state.wrestlers.filter(w => w.division === division);
}

function recomputeDivision(division) {
  const divisionW = getDivisionRoster(division).filter(w => !w.esCampeon);
  const sorted = [...divisionW].sort((a, b) => b.puntos - a.puntos || a.nombre.localeCompare(b.nombre));
  sorted.forEach((w, i) => {
    w.posicionAnterior = w.posicion || i + 1;
    w.posicion = i + 1;
  });
}

function recomputeAll() {
  allDivisions().forEach(recomputeDivision);
  saveState();
}

function fillSelect(select, options) {
  select.innerHTML = options.map(o => `<option value="${o}">${o}</option>`).join('');
}

function initFormOptions() {
  fillSelect(byId('brand'), CONFIG.brands);
  fillSelect(byId('rankingBrand'), CONFIG.brands);
  fillSelect(byId('fightBrand'), CONFIG.brands);
  syncDivisionOptions('brand', 'division');
  syncDivisionOptions('rankingBrand', 'rankingDivision');
  syncDivisionOptions('fightBrand', 'fightDivision');
}

function syncDivisionOptions(brandId, divisionId) {
  const brand = byId(brandId).value;
  fillSelect(byId(divisionId), CONFIG.divisions[brand]);
}

function registerWrestler(e) {
  e.preventDefault();
  const isTag = byId('isTag').checked;
  const division = byId('division').value;
  const brand = byId('brand').value;
  const name = (isTag ? byId('tagName').value : byId('name').value).trim();
  if (!name) return alert('Nombre requerido');
  if (state.wrestlers.some(w => w.division === division && w.nombre.toLowerCase() === name.toLowerCase())) return alert('Nombre duplicado en división.');

  const wrestler = {
    id: uid(), nombre: name, marca: brand, division,
    puntos: 0, victorias: 0, derrotas: 0, esCampeon: false,
    mesesUltimoLugar: 0, reinados: 0, posicionAnterior: 0,
    posicion: 0, esTagTeam: isTag, nombreTagTeam: isTag ? name : '',
    integrantes: []
  };

  if (isTag) {
    const a = byId('member1').value.trim();
    const b = byId('member2').value.trim();
    if (!a || !b) return alert('Completa integrantes del tag team.');
    wrestler.integrantes = [a, b].sort((x, y) => x.localeCompare(y));
  }

  state.wrestlers.push(wrestler);
  recomputeDivision(division);
  saveState();
  e.target.reset();
  toggleTagFields();
  renderAll();
}

function toggleTagFields() {
  const on = byId('isTag').checked;
  ['tagNameWrap', 'member1Wrap', 'member2Wrap'].forEach(id => byId(id).classList.toggle('hidden', !on));
  byId('name').parentElement.classList.toggle('hidden', on);
}

function setChampion(id) {
  const w = state.wrestlers.find(x => x.id === id);
  if (!w) return;
  getDivisionRoster(w.division).forEach(x => x.esCampeon = false);
  w.esCampeon = true;
  w.reinados += 1;
  state.championSinceWeek[w.division] = state.counters.PPV + state.counters.RAW + state.counters.SMACKDOWN;
  recomputeDivision(w.division);
  saveState();
  renderAll();
}

function moveDivision(id) {
  const w = state.wrestlers.find(x => x.id === id);
  const newDivision = prompt('Nueva división', w.division);
  if (!newDivision || !allDivisions().includes(newDivision)) return;
  w.division = newDivision;
  w.marca = divisionBrand(newDivision);
  w.puntos = 0;
  w.esCampeon = false;
  recomputeAll();
  renderAll();
}

function removeWrestler(id) {
  state.wrestlers = state.wrestlers.filter(w => w.id !== id);
  recomputeAll();
  renderAll();
}

function renderWrestlers() {
  const out = byId('wrestlerList');
  out.innerHTML = allDivisions().map(div => {
    const rows = getDivisionRoster(div).map(w => `<div class="card">
      <b>${w.nombre}</b> (${w.marca}) ${w.esCampeon ? '🏆' : ''}<br/>
      Pts: ${w.puntos} | V-D: ${w.victorias}-${w.derrotas} ${w.esTagTeam ? `| Integrantes: ${w.integrantes.join(', ')}` : ''}
      <div class="actions-row">
        <button onclick="setChampion('${w.id}')">Asignar campeón</button>
        <button onclick="moveDivision('${w.id}')">Editar división</button>
        <button onclick="removeWrestler('${w.id}')">Eliminar</button>
      </div>
    </div>`).join('');
    return `<h3>${div}</h3>${rows || '<p>Sin luchadores.</p>'}`;
  }).join('');
}

function movement(w) {
  if (!w.posicionAnterior || !w.posicion) return '-';
  if (w.posicion < w.posicionAnterior) return `<span class="up">↑ ${w.posicionAnterior}</span>`;
  if (w.posicion > w.posicionAnterior) return `<span class="down">↓ ${w.posicionAnterior}</span>`;
  return `= ${w.posicionAnterior}`;
}

function renderRanking() {
  const division = byId('rankingDivision').value;
  const champion = getDivisionRoster(division).find(w => w.esCampeon);
  const totalWeeks = (state.counters.RAW + state.counters.SMACKDOWN + state.counters.PPV) - (state.championSinceWeek[division] || 0);
  byId('rankingHeader').innerHTML = `<p>Campeón actual: <b>${champion ? champion.nombre : 'Vacante'}</b> | Días como campeón: ${Math.max(0, totalWeeks) * 7}</p>`;
  const sorted = getDivisionRoster(division).filter(w => !w.esCampeon).sort((a,b)=>a.posicion-b.posicion);
  const rank11 = sorted[10];
  byId('rankingTable').innerHTML = sorted.map((w, i) => {
    const risk = i < 10 && rank11 && (w.puntos - rank11.puntos < 5);
    return `<tr><td>${w.posicion || i+1}</td><td>${w.nombre}</td><td>${w.puntos}</td><td>${movement(w)}</td><td>${w.victorias}</td><td>${w.derrotas}</td><td>${risk ? '<span class="risk">EN RIESGO DE SALIR DEL TOP 10</span>' : ''}</td></tr>`;
  }).join('');
}

function scoreMatch(win, lose) {
  const wd = (lose.posicion || 99) - (win.posicion || 99);
  const winBonus = wd < 0 ? 5 : Math.abs(wd) <= 2 ? 2 : 0;
  const losePenalty = wd > 0 ? 6 : 2;
  if (!win.esCampeon) win.puntos += 8 + winBonus;
  if (!lose.esCampeon) lose.puntos = Math.max(0, lose.puntos - (lose.esCampeon ? 0 : losePenalty));
  win.victorias += 1;
  lose.derrotas += 1;
}

function updateFightOptions() {
  const division = byId('fightDivision').value;
  const wrestlers = getDivisionRoster(division);
  const options = wrestlers.map(w => w.nombre);
  fillSelect(byId('fighterA'), options);
  fillSelect(byId('fighterB'), options);
  fillSelect(byId('winner'), options);
}

function registerFight(e) {
  e.preventDefault();
  const division = byId('fightDivision').value;
  const aName = byId('fighterA').value;
  const bName = byId('fighterB').value;
  const winnerName = byId('winner').value;
  if (aName === bName) return alert('Selecciona luchadores distintos');
  const a = getDivisionRoster(division).find(w => w.nombre === aName);
  const b = getDivisionRoster(division).find(w => w.nombre === bName);
  const winner = winnerName === aName ? a : b;
  const loser = winner === a ? b : a;

  if (byId('isTitleFight').checked) {
    const champ = getDivisionRoster(division).find(w => w.esCampeon);
    if (winner.id !== champ?.id) {
      champ.esCampeon = false;
      winner.esCampeon = true;
      winner.reinados += 1;
      champ.puntos = 0;
    }
  } else {
    scoreMatch(winner, loser);
  }

  const brand = divisionBrand(division);
  state.counters[brand] += 1;
  state.matches.push({ idCombate: uid(), luchadorA: a.id, luchadorB: b.id, division, fecha: nowDate(), numeroShow: state.counters[brand], esCombatePorCampeonato: byId('isTitleFight').checked });
  recomputeDivision(division);
  saveState();
  renderAll();
}

function recentOpponents(id, division) {
  const last = state.matches.filter(m => m.division === division && (m.luchadorA === id || m.luchadorB === id)).slice(-3);
  return new Set(last.map(m => m.luchadorA === id ? m.luchadorB : m.luchadorA));
}

function pairDivision(division) {
  const pool = getDivisionRoster(division).filter(w => !w.esCampeon).sort((a,b)=>a.posicion-b.posicion).slice(0,10);
  for (const a of pool) {
    const opps = recentOpponents(a.id, division);
    let options = pool.filter(b => b.id !== a.id && Math.abs((a.posicion||0)-(b.posicion||0)) <= 3 && !opps.has(b.id));
    if (!options.length) options = pool.filter(b => b.id !== a.id);
    const b = options[0];
    if (b) return [a,b];
  }
  return null;
}

function generateWeekly(brand) {
  const show = { id: uid(), type: brand, fecha: nowDate(), numeroShow: ++state.counters[brand], nombre: brand, matches: [] };
  CONFIG.weeklyOrder[brand].forEach(div => {
    const pair = pairDivision(div);
    if (pair) show.matches.push({ division: div, fighters: pair.map(x => x.nombre), title: false });
  });
  state.shows.push(show);
  saveState();
  renderCards(show);
}

function generatePPV() {
  const name = byId('ppvName').value.trim();
  if (!name) return alert('Nombre de PPV obligatorio');
  const show = { id: uid(), type: 'PPV', fecha: nowDate(), numeroShow: ++state.counters.PPV, nombre: name, matches: [] };
  CONFIG.ppvOrder.forEach(div => {
    const champ = getDivisionRoster(div).find(w => w.esCampeon);
    const sorted = getDivisionRoster(div).filter(w => !w.esCampeon).sort((a,b)=>b.puntos-a.puntos);
    if (!champ || !sorted[0]) return;
    if (sorted[1] && sorted[0].puntos === sorted[1].puntos) show.matches.push({ division: div, fighters: [champ.nombre, sorted[0].nombre, sorted[1].nombre], title: true });
    else show.matches.push({ division: div, fighters: [champ.nombre, sorted[0].nombre], title: true });
  });
  state.shows.push(show);
  state.wrestlers.forEach(w => w.puntos = 0);
  recomputeAll();
  saveState();
  renderCards(show);
}

function renderCards(show) {
  byId('cardsOutput').innerHTML = `<h3>${show.type} #${show.numeroShow} - ${show.nombre}</h3>` + show.matches.map(m => `<div class="card"><b>${m.division}</b>: ${m.fighters.join(' vs ')} ${m.title ? '(Título)' : ''}</div>`).join('');
}

function runSoftDraft() {
  const moves = [];
  CONFIG.equivalent.forEach(([rawDiv, sdDiv]) => {
    const raw = getDivisionRoster(rawDiv).filter(w => !w.esCampeon);
    const sd = getDivisionRoster(sdDiv).filter(w => !w.esCampeon);
    const pickRaw = raw.sort(()=>Math.random()-.5).slice(0,2);
    const pickSd = sd.sort(()=>Math.random()-.5).slice(0,2);
    pickRaw.forEach(w => { w.marca = 'SMACKDOWN'; w.division = sdDiv; moves.push(`${w.nombre} → SMACKDOWN (${sdDiv})`); });
    pickSd.forEach(w => { w.marca = 'RAW'; w.division = rawDiv; moves.push(`${w.nombre} → RAW (${rawDiv})`); });
  });
  recomputeAll();
  byId('draftResult').textContent = moves.length ? `Soft Draft completado: ${moves.join(' | ')}` : 'Soft Draft sin cambios';
}

function runAnnualDraft() {
  const moves = [];
  CONFIG.equivalent.forEach(([rawDiv, sdDiv]) => {
    const raw = getDivisionRoster(rawDiv);
    const sd = getDivisionRoster(sdDiv);
    const pickRaw = raw.sort(()=>Math.random()-.5).slice(0,5);
    const pickSd = sd.sort(()=>Math.random()-.5).slice(0,5);
    pickRaw.forEach(w => { w.marca = 'SMACKDOWN'; w.division = sdDiv; moves.push(`${w.nombre} → SMACKDOWN`); });
    pickSd.forEach(w => { w.marca = 'RAW'; w.division = rawDiv; moves.push(`${w.nombre} → RAW`); });
  });
  recomputeAll();
  byId('draftResult').textContent = `Draft anual completado: ${moves.join(' | ')}`;
}

function renderGeneralList() {
  const grouped = { RAW: [], SMACKDOWN: [] };
  state.wrestlers.forEach(w => grouped[w.marca].push(w));
  byId('generalList').innerHTML = CONFIG.brands.map(b => {
    const men = grouped[b].filter(w => !/women/i.test(w.division)).sort((a,b)=>a.nombre.localeCompare(b.nombre));
    const women = grouped[b].filter(w => /women/i.test(w.division)).sort((a,b)=>a.nombre.localeCompare(b.nombre));
    const render = (arr) => arr.map(w => `<div class="card">${w.nombre} | ${w.division} | Pos: ${w.posicion || '-'} | Pts: ${w.puntos} | Campeón: ${w.esCampeon ? 'Sí':'No'} ${w.esTagTeam ? `| Tag: ${w.nombreTagTeam}`:''}</div>`).join('') || '<p>Sin registros</p>';
    return `<h3 class="brand-title">${b} (Total: ${grouped[b].length})</h3><h4>Hombres</h4>${render(men)}<h4>Mujeres</h4>${render(women)}`;
  }).join('');
}

function renderHistory() {
  byId('historyOutput').innerHTML = ['RAW','SMACKDOWN','PPV'].map(type => {
    const shows = state.shows.filter(s => s.type === type).sort((a,b)=>a.numeroShow-b.numeroShow);
    return `<h3>${type}</h3>` + (shows.map(s => `<div class="card"><b>${s.nombre}</b> (${s.fecha}) #${s.numeroShow}<br/>${s.matches.map(m => `${m.division}: ${m.fighters.join(' vs ')}`).join('<br/>')}</div>`).join('') || '<p>Sin shows.</p>');
  }).join('');
}

function renderStats() {
  const champions = allDivisions().map(div => {
    const c = getDivisionRoster(div).find(w => w.esCampeon);
    return `<div class="card"><b>${div}</b><br/>${c ? c.nombre : 'Vacante'}</div>`;
  }).join('');
  byId('universeStats').innerHTML = champions;
}

function setupTabs() {
  byId('mainTabs').addEventListener('click', (e) => {
    if (e.target.tagName !== 'BUTTON') return;
    document.querySelectorAll('#mainTabs button').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    byId(`tab-${e.target.dataset.tab}`).classList.add('active');
  });
}

function wireEvents() {
  byId('brand').addEventListener('change', () => syncDivisionOptions('brand', 'division'));
  byId('rankingBrand').addEventListener('change', () => { syncDivisionOptions('rankingBrand', 'rankingDivision'); renderRanking(); });
  byId('rankingDivision').addEventListener('change', renderRanking);
  byId('fightBrand').addEventListener('change', () => { syncDivisionOptions('fightBrand', 'fightDivision'); updateFightOptions(); });
  byId('fightDivision').addEventListener('change', updateFightOptions);
  byId('wrestlerForm').addEventListener('submit', registerWrestler);
  byId('fightForm').addEventListener('submit', registerFight);
  byId('isTag').addEventListener('change', toggleTagFields);
  byId('genRawBtn').addEventListener('click', () => generateWeekly('RAW'));
  byId('genSdBtn').addEventListener('click', () => generateWeekly('SMACKDOWN'));
  byId('genPpvBtn').addEventListener('click', generatePPV);
  byId('runSoftDraftBtn').addEventListener('click', runSoftDraft);
  byId('runAnnualDraftBtn').addEventListener('click', runAnnualDraft);
}

function renderAll() {
  renderWrestlers();
  renderRanking();
  updateFightOptions();
  renderGeneralList();
  renderHistory();
  renderStats();
}

window.setChampion = setChampion;
window.moveDivision = moveDivision;
window.removeWrestler = removeWrestler;

initFormOptions();
setupTabs();
wireEvents();
recomputeAll();
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
