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
renderAll();
