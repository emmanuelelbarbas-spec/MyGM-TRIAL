const STORAGE_KEY = "wwe_universe_manager_v2";
const TABS = [
  ["estado", "Estado del Universo"],
  ["gestion", "Gestión de Luchadores"],
  ["rankings", "Rankings"],
  ["combate", "Registrar Combate"],
  ["carteleras", "Carteleras"],
  ["listado", "Listado General"],
  ["historial", "Historial de Shows"]
];

const DIVISIONS = {
  RAW: ["World Heavyweight", "World Womens", "Intercontinental", "Womens Intercontinental", "World Tag Team"],
  SMACKDOWN: ["Undisputed", "WWE Womens", "United States", "Womens United States", "WWE Tag Team"]
};
const RAW_ORDER = ["Womens Intercontinental", "World Tag Team", "Intercontinental", "World Womens", "World Heavyweight"];
const SD_ORDER = ["Womens United States", "WWE Tag Team", "United States", "WWE Womens", "Undisputed"];
const PPV_ORDER = ["Womens United States", "Womens Intercontinental", "World Tag Team", "WWE Tag Team", "United States", "Intercontinental", "World Womens", "WWE Womens", "World Heavyweight", "Undisputed"];
const EQ_DIVISIONS = [
  ["World Heavyweight", "Undisputed"],
  ["World Womens", "WWE Womens"],
  ["Intercontinental", "United States"],
  ["Womens Intercontinental", "Womens United States"],
  ["World Tag Team", "WWE Tag Team"]
];

let state = loadState();

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) return JSON.parse(saved);
  return {
    wrestlers: [],
    matches: [],
    shows: [],
    currentShow: { RAW: 1, SMACKDOWN: 1, PPV: 1 },
    championWeeks: {},
    universeWeek: 1
  };
}
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

function render() {
  renderTabs();
  renderEstado();
  renderGestion();
  renderRankings();
  renderCombate();
  renderCarteleras();
  renderListado();
  renderHistorial();
}

function renderTabs() {
  const nav = document.getElementById("tabs");
  nav.innerHTML = "";
  const active = localStorage.getItem("tab_active") || "estado";
  TABS.forEach(([id, label]) => {
    const b = document.createElement("button");
    b.textContent = label;
    b.className = active === id ? "active" : "";
    b.onclick = () => {
      localStorage.setItem("tab_active", id);
      document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
      document.getElementById(`tab-${id}`).classList.add("active");
      renderTabs();
    };
    nav.appendChild(b);
  });
  document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
  document.getElementById(`tab-${active}`).classList.add("active");
}

function createCard(title, html = "") {
  const tpl = document.getElementById("base-card-template").content.cloneNode(true);
  tpl.querySelector("h3").textContent = title;
  tpl.querySelector(".card-body").innerHTML = html;
  return tpl;
}

function divisionBrand(division) {
  if (DIVISIONS.RAW.includes(division)) return "RAW";
  if (DIVISIONS.SMACKDOWN.includes(division)) return "SMACKDOWN";
  return null;
}
function getDivisionWrestlers(division, includeChampion = false) {
  return state.wrestlers.filter(w => w.division === division && (includeChampion || !w.esCampeon));
}
function getChampion(division) {
  return state.wrestlers.find(w => w.division === division && w.esCampeon);
}
function sortedRanking(division) {
  return getDivisionWrestlers(division, false).sort((a, b) => b.puntos - a.puntos || a.nombre.localeCompare(b.nombre));
}
function recalcDivision(division) {
  const ranking = sortedRanking(division);
  ranking.forEach((w, i) => {
    w.posicionAnterior = w.posicion ?? (i + 1);
    w.posicion = i + 1;
  });
}
function recalcAll() {
  [...DIVISIONS.RAW, ...DIVISIONS.SMACKDOWN].forEach(recalcDivision);
  saveState();
}

function renderEstado() {
  const el = document.getElementById("tab-estado");
  el.innerHTML = "";
  const rawCount = state.wrestlers.filter(w => w.marca === "RAW").length;
  const sdCount = state.wrestlers.filter(w => w.marca === "SMACKDOWN").length;
  const champs = state.wrestlers.filter(w => w.esCampeon).length;

  const card = createCard("Estado del Universo", `
    <p>Semana del universo: <strong>${state.universeWeek}</strong></p>
    <p>RAW: <span class="badge raw">${rawCount} luchadores</span> | SmackDown: <span class="badge sd">${sdCount} luchadores</span></p>
    <p>Campeones actuales: <strong>${champs}/10</strong></p>
    <div class="actions">
      <button id="soft-draft">Ejecutar Soft Draft</button>
      <button id="reset-season">Reiniciar puntos (post PPV)</button>
      <button id="wipe-data">Borrar universo</button>
    </div>
  `);
  el.appendChild(card);

  document.getElementById("soft-draft").onclick = executeSoftDraft;
  document.getElementById("reset-season").onclick = () => {
    state.wrestlers.forEach(w => { w.puntos = 0; w.posicionAnterior = w.posicion || 0; });
    recalcAll();
    alert("Puntos reiniciados.");
  };
  document.getElementById("wipe-data").onclick = () => {
    if (confirm("¿Seguro?")) {
      localStorage.removeItem(STORAGE_KEY);
      state = loadState();
      render();
    }
  };
}

function renderGestion() {
  const el = document.getElementById("tab-gestion");
  el.innerHTML = "";
  const grid = document.createElement("div");
  grid.className = "grid";
  grid.appendChild(createCard("Registrar Luchador", `
    <label>Nombre<input id="g-nombre" /></label>
    <label>Marca<select id="g-marca"><option>RAW</option><option>SMACKDOWN</option></select></label>
    <label>División<select id="g-division"></select></label>
    <label><input type="checkbox" id="g-tag" /> Es Tag Team</label>
    <div id="tag-fields" class="hidden">
      <label>Nombre del Tag Team<input id="g-tag-name" /></label>
      <label>Integrante 1<input id="g-member1" /></label>
      <label>Integrante 2<input id="g-member2" /></label>
    </div>
    <button id="g-add">Registrar</button>
  `));

  const rows = state.wrestlers.map(w => `
    <tr>
      <td>${w.nombre}</td><td>${w.marca}</td><td>${w.division}</td><td>${w.puntos}</td>
      <td>${w.esCampeon ? "Sí" : "No"}</td>
      <td class="actions">
        <button data-act="champ" data-id="${w.id}">Campeón</button>
        <button data-act="move" data-id="${w.id}">Editar división</button>
        <button data-act="del" data-id="${w.id}">Eliminar</button>
      </td>
    </tr>`).join("");
  grid.appendChild(createCard("Plantilla", `<table><tr><th>Nombre</th><th>Marca</th><th>División</th><th>Puntos</th><th>Campeón</th><th>Acciones</th></tr>${rows}</table>`));
  el.appendChild(grid);

  const marcaSel = document.getElementById("g-marca");
  const divSel = document.getElementById("g-division");
  const reloadDivs = () => {
    divSel.innerHTML = DIVISIONS[marcaSel.value].map(d => `<option>${d}</option>`).join("");
  };
  marcaSel.onchange = reloadDivs;
  reloadDivs();

  document.getElementById("g-tag").onchange = (e) => document.getElementById("tag-fields").classList.toggle("hidden", !e.target.checked);
  document.getElementById("g-add").onclick = () => {
    const marca = marcaSel.value;
    const division = divSel.value;
    const isTag = document.getElementById("g-tag").checked;
    const nombre = isTag ? document.getElementById("g-tag-name").value.trim() : document.getElementById("g-nombre").value.trim();
    if (!nombre) return alert("Nombre obligatorio");
    const duplicate = state.wrestlers.find(w => w.division === division && w.nombre.toLowerCase() === nombre.toLowerCase());
    if (duplicate) return alert("Nombre duplicado en la división.");
    const base = { id: uid(), nombre, marca, division, puntos: 0, victorias: 0, derrotas: 0, esCampeon: false, mesesUltimoLugar: 0, reinados: 0, posicionAnterior: 0, posicion: 0, esTagTeam: isTag, nombreTagTeam: isTag ? nombre : "", miembros: [] };
    if (isTag) {
      const m1 = document.getElementById("g-member1").value.trim();
      const m2 = document.getElementById("g-member2").value.trim();
      base.miembros = [m1, m2].filter(Boolean).sort((a, b) => a.localeCompare(b));
    }
    state.wrestlers.push(base);
    recalcDivision(division);
    saveState();
    render();
  };

  el.querySelectorAll("button[data-act]").forEach(b => b.onclick = () => handleRosterAction(b.dataset.act, b.dataset.id));
}

function handleRosterAction(action, id) {
  const w = state.wrestlers.find(x => x.id === id);
  if (!w) return;
  if (action === "del") {
    state.wrestlers = state.wrestlers.filter(x => x.id !== id);
  }
  if (action === "move") {
    const newDivision = prompt("Nueva división", w.division);
    if (!newDivision) return;
    const brand = divisionBrand(newDivision);
    if (!brand) return alert("División inválida");
    w.division = newDivision;
    w.marca = brand;
    w.puntos = 0;
  }
  if (action === "champ") {
    const prev = getChampion(w.division);
    if (prev && prev.id !== w.id) prev.esCampeon = false;
    w.esCampeon = true;
    state.championWeeks[w.id] = state.universeWeek;
  }
  recalcAll();
  render();
}

function renderRankings() {
  const el = document.getElementById("tab-rankings");
  el.innerHTML = "";
  const all = [...DIVISIONS.RAW, ...DIVISIONS.SMACKDOWN];
  const select = `<label>División<select id="r-division">${all.map(d => `<option>${d}</option>`).join("")}</select></label><div id="r-body"></div>`;
  el.appendChild(createCard("Ranking por división", select));
  const draw = () => {
    const division = document.getElementById("r-division").value;
    recalcDivision(division);
    const champ = getChampion(division);
    const ranking = sortedRanking(division);
    const p10 = ranking[9], p11 = ranking[10];
    const risk = p10 && p11 && Math.abs((p10.puntos || 0) - (p11.puntos || 0)) < 5;
    const html = `
      <p>Campeón: <strong>${champ ? champ.nombre : "Sin campeón"}</strong> ${champ ? `<span class="small">(${(state.universeWeek - (state.championWeeks[champ.id] || state.universeWeek)) * 7} días como campeón)</span>` : ""}</p>
      ${risk ? `<p class="risk">⚠ EN RIESGO DE SALIR DEL TOP 10: ${p10.nombre}</p>` : ""}
      <table>
        <tr><th>#</th><th>Nombre</th><th>Puntos</th><th>Movimiento</th><th>Victorias</th><th>Derrotas</th></tr>
        ${ranking.map(w => {
          const dif = (w.posicionAnterior || w.posicion) - w.posicion;
          const mov = dif > 0 ? `↑ (${w.posicionAnterior})` : dif < 0 ? `↓ (${w.posicionAnterior})` : `= (${w.posicionAnterior || w.posicion})`;
          return `<tr><td>${w.posicion}</td><td>${w.nombre}</td><td>${w.puntos}</td><td>${mov}</td><td>${w.victorias}</td><td>${w.derrotas}</td></tr>`;
        }).join("")}
      </table>`;
    document.getElementById("r-body").innerHTML = html;
    saveState();
  };
  document.getElementById("r-division").onchange = draw;
  draw();
}

function getPointDelta(winner, loser) {
  const posW = winner.posicion || 99;
  const posL = loser.posicion || 99;
  let win = 8;
  if (posL < posW) win += 5;
  else if (Math.abs(posL - posW) <= 2) win += 2;

  let lose = -3;
  if (posW > posL) lose = -6;
  if (posW < posL) lose = -2;
  return { win, lose };
}

function renderCombate() {
  const el = document.getElementById("tab-combate");
  el.innerHTML = "";
  const all = [...DIVISIONS.RAW, ...DIVISIONS.SMACKDOWN];
  el.appendChild(createCard("Registrar combate", `
    <label>División<select id="c-division">${all.map(d => `<option>${d}</option>`).join("")}</select></label>
    <label>Luchador A<select id="c-a"></select></label>
    <label>Luchador B<select id="c-b"></select></label>
    <label>Ganador<select id="c-winner"></select></label>
    <label><input type="checkbox" id="c-title" /> Combate por campeonato</label>
    <button id="c-save">Guardar resultado</button>
  `));

  const sync = () => {
    const d = document.getElementById("c-division").value;
    const opts = getDivisionWrestlers(d, true).map(w => `<option value="${w.id}">${w.nombre}${w.esCampeon ? " (C)" : ""}</option>`).join("");
    ["c-a", "c-b", "c-winner"].forEach(id => document.getElementById(id).innerHTML = opts);
  };
  document.getElementById("c-division").onchange = sync;
  sync();

  document.getElementById("c-save").onclick = () => {
    const division = document.getElementById("c-division").value;
    const a = state.wrestlers.find(w => w.id === document.getElementById("c-a").value);
    const b = state.wrestlers.find(w => w.id === document.getElementById("c-b").value);
    const winner = state.wrestlers.find(w => w.id === document.getElementById("c-winner").value);
    if (!a || !b || a.id === b.id) return alert("Participantes inválidos");
    const loser = winner.id === a.id ? b : a;
    const title = document.getElementById("c-title").checked;
    applyMatchResult({ division, winner, loser, title, source: divisionBrand(division) });
    render();
  };
}

function applyMatchResult({ division, winner, loser, title, source = "RAW" }) {
  if (!winner.esCampeon && !loser.esCampeon) {
    const delta = getPointDelta(winner, loser);
    winner.puntos += delta.win;
    loser.puntos = Math.max(0, loser.puntos + delta.lose);
  }
  winner.victorias += 1;
  loser.derrotas += 1;

  if (title) {
    const champ = getChampion(division);
    if (champ && champ.id === loser.id) {
      champ.esCampeon = false;
      winner.esCampeon = true;
      winner.reinados += 1;
      champ.puntos = 0;
      state.championWeeks[winner.id] = state.universeWeek;
    }
  }

  state.matches.push({
    idCombate: uid(),
    luchadorA: winner.id,
    luchadorB: loser.id,
    division,
    fecha: new Date().toISOString(),
    numeroShow: state.currentShow[source] || 1,
    esCombatePorCampeonato: title
  });

  recalcDivision(division);
  saveState();
}

function eligiblePair(division, used) {
  const ranking = sortedRanking(division).filter(w => w.posicion <= 10 && !used.has(w.id));
  for (let i = 0; i < ranking.length; i++) {
    for (let j = i + 1; j < ranking.length; j++) {
      const a = ranking[i], b = ranking[j];
      if (Math.abs(a.posicion - b.posicion) > 3) continue;
      const recent = state.matches.filter(m => m.division === division).slice(-50).find(m => {
        const involved = [m.luchadorA, m.luchadorB];
        return involved.includes(a.id) && involved.includes(b.id) && ((state.currentShow[divisionBrand(division)] - m.numeroShow) <= 3);
      });
      if (!recent) return [a, b];
    }
  }
  return ranking.length >= 2 ? [ranking[0], ranking[1]] : null;
}

function renderCarteleras() {
  const el = document.getElementById("tab-carteleras");
  el.innerHTML = "";
  el.appendChild(createCard("Generar shows", `
    <div class="actions">
      <button id="gen-raw">Generar RAW</button>
      <button id="gen-sd">Generar SmackDown</button>
      <button id="gen-ppv">Generar PPV</button>
    </div>
    <label>Nombre PPV (obligatorio para generar PPV)<input id="ppv-name" /></label>
    <div id="cards-view"></div>
  `));

  document.getElementById("gen-raw").onclick = () => generateWeekly("RAW", RAW_ORDER);
  document.getElementById("gen-sd").onclick = () => generateWeekly("SMACKDOWN", SD_ORDER);
  document.getElementById("gen-ppv").onclick = generatePPV;

  const lastShows = state.shows.slice(-3).reverse().map(showToHtml).join("");
  document.getElementById("cards-view").innerHTML = lastShows || "<p class='small'>Sin carteleras aún.</p>";
}

function showToHtml(show) {
  const items = show.matches.map((m, i) => `<div class="match-item"><strong>${i + 1}. ${m.division}</strong><br>${m.names.join(" vs ")} ${m.resultado ? `<br><span class='badge ok'>Ganó: ${m.resultado}</span>` : ""}</div>`).join("");
  return `<div class="card"><h3>${show.tipo} #${show.numero}${show.ppvName ? ` - ${show.ppvName}` : ""}</h3><div class="card-body">${items}</div></div>`;
}

function generateWeekly(brand, order) {
  const used = new Set();
  const matches = [];
  order.forEach(division => {
    const pair = eligiblePair(division, used);
    if (!pair) return;
    used.add(pair[0].id); used.add(pair[1].id);
    matches.push({ division, ids: [pair[0].id, pair[1].id], names: [pair[0].nombre, pair[1].nombre] });
  });
  const show = { id: uid(), tipo: brand, numero: state.currentShow[brand], fecha: new Date().toISOString(), matches };
  state.shows.push(show);
  state.currentShow[brand] += 1;
  state.universeWeek += 1;
  saveState();
  renderCarteleras();
}

function generatePPV() {
  const name = document.getElementById("ppv-name").value.trim();
  if (!name) return alert("Nombre del PPV obligatorio");
  const matches = [];
  PPV_ORDER.forEach(division => {
    const champ = getChampion(division);
    const ranking = sortedRanking(division);
    if (!champ || ranking.length === 0) return;
    if (ranking[1] && ranking[0].puntos === ranking[1].puntos) {
      matches.push({ division, ids: [champ.id, ranking[0].id, ranking[1].id], names: [champ.nombre, ranking[0].nombre, ranking[1].nombre] });
    } else {
      matches.push({ division, ids: [champ.id, ranking[0].id], names: [champ.nombre, ranking[0].nombre] });
    }
  });
  state.shows.push({ id: uid(), tipo: "PPV", numero: state.currentShow.PPV, ppvName: name, fecha: new Date().toISOString(), matches });
  state.currentShow.PPV += 1;
  state.universeWeek += 1;
  state.wrestlers.forEach(w => w.puntos = 0);
  recalcAll();
  saveState();
  renderCarteleras();
}

function executeSoftDraft() {
  const changes = [];
  EQ_DIVISIONS.forEach(([rawDiv, sdDiv]) => {
    const rawPool = getDivisionWrestlers(rawDiv).filter(w => !w.esCampeon);
    const sdPool = getDivisionWrestlers(sdDiv).filter(w => !w.esCampeon);
    const pick = (arr, n) => arr.sort(() => Math.random() - 0.5).slice(0, Math.min(n, arr.length));
    const rawPick = pick(rawPool, 2);
    const sdPick = pick(sdPool, 2);
    rawPick.forEach(w => {
      w.marca = "SMACKDOWN";
      w.division = sdDiv;
      changes.push(`${w.nombre} → SMACKDOWN (${sdDiv})`);
    });
    sdPick.forEach(w => {
      w.marca = "RAW";
      w.division = rawDiv;
      changes.push(`${w.nombre} → RAW (${rawDiv})`);
    });
  });
  recalcAll();
  alert(changes.length ? `Soft Draft completado:\n${changes.join("\n")}` : "No hubo cambios disponibles.");
  render();
}

function renderListado() {
  const el = document.getElementById("tab-listado");
  el.innerHTML = "";
  ["RAW", "SMACKDOWN"].forEach(brand => {
    const all = state.wrestlers.filter(w => w.marca === brand).sort((a, b) => a.nombre.localeCompare(b.nombre));
    const men = all.filter(w => !w.division.toLowerCase().includes("womens"));
    const women = all.filter(w => w.division.toLowerCase().includes("womens"));
    const mkTable = arr => `<table><tr><th>Nombre</th><th>División</th><th>Ranking</th><th>Puntos</th><th>Campeón</th><th>Tag Team</th></tr>${arr.map(w => `<tr><td>${w.nombre}</td><td>${w.division}</td><td>${w.esCampeon ? "-" : (w.posicion || "-")}</td><td>${w.puntos}</td><td>${w.esCampeon ? "Sí" : "No"}</td><td>${w.esTagTeam ? `${w.nombreTagTeam} (${w.miembros.join(", ")})` : "-"}</td></tr>`).join("")}</table>`;
    el.appendChild(createCard(`${brand} (${all.length}) - Hombres`, mkTable(men)));
    el.appendChild(createCard(`${brand} (${all.length}) - Mujeres`, mkTable(women)));
  });
}

function renderHistorial() {
  const el = document.getElementById("tab-historial");
  el.innerHTML = `
    <div class="subtabs">
      <button data-sub="RAW">RAW</button>
      <button data-sub="SMACKDOWN">SMACKDOWN</button>
      <button data-sub="PPV">PPV</button>
    </div>
    <div id="historial-body"></div>`;
  const draw = (type) => {
    const shows = state.shows.filter(s => s.tipo === type).reverse();
    document.getElementById("historial-body").innerHTML = shows.map(showToHtml).join("") || "<p class='small'>Sin shows guardados.</p>";
  };
  el.querySelectorAll("[data-sub]").forEach(b => b.onclick = () => draw(b.dataset.sub));
  draw("RAW");
}

recalcAll();
render();
