// Beam Lift — UI. Vanilla JS, hash routes, one delegated click handler (data-act).
import * as DB from './db.js';
import { APP_VERSION, DEFAULT_PROGRAM, DEFAULT_SETTINGS, EXERCISES, KIND_LABEL } from './data.js';
import * as E from './engine.js';
import { readHevy, convertHevy } from './hevy.js';
import { buildBackup, buildCSV, shareOrDownload } from './io.js';

const S = { settings: null, program: null, state: null, coach: {}, custom: {}, workouts: [], active: null };
const UI = { pickDay: null, worse: { knee: false, shoulder: false, back: false }, short: false, edit: null, ci: null, hevy: null, json: null };

const view = document.getElementById('view');
const dock = document.getElementById('dock');
const nav = document.getElementById('nav');
const sheetWrap = document.getElementById('sheet-wrap');
const sheetEl = document.getElementById('sheet');
const fileInput = document.getElementById('file');

// ---------- helpers ----------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = E.fmt;
const clone = (o) => JSON.parse(JSON.stringify(o));
const byStart = (a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0);
const getEx = (id) => EXERCISES[id] || S.custom[id] || { name: id, kind: 'bw', joints: [] };
const ctx = (extra = {}) => ({ workouts: S.workouts, st: S.settings, coach: S.coach, now: Date.now(), ...extra });
const dateStr = (d, o = { weekday: 'short', month: 'short', day: 'numeric' }) => new Date(d).toLocaleDateString(undefined, o);
const mmss = (s) => { s = Math.max(0, Math.round(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const howUrl = (ex) => `https://www.youtube.com/results?search_query=${encodeURIComponent(ex.how || `${ex.name} form`)}`;
const gifUrl = (ex) => `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(`${ex.name} exercise gif`)}`;
const buzz = (p) => { try { navigator.vibrate && navigator.vibrate(p); } catch { /* no vibration */ } };
const restFor = (exId, itemRest) => (S.settings.restOverrides || {})[exId] || itemRest || S.settings.restDefault;

function wLabel(kind, w) {
  if (!E.isWeighted(kind)) return kind === 'bw' && w ? `+${fmt(w)} lb` : 'bodyweight';
  if (w == null || w === '') return 'choose weight';
  if (kind === 'db' || kind === 'carry') return `${fmt(w)} lb/hand`;
  if (kind === 'lm') return `${fmt(w)} lb plates`;
  return `${fmt(w)} lb`;
}
function nextText(kind, s) {
  if (kind === 'time') return `${s.reps} s holds`;
  if (kind === 'carry') return `${wLabel(kind, s.weight)} × ${s.reps} m`;
  if (kind === 'bw') return s.weight ? `+${fmt(s.weight)} lb × ${s.reps} reps` : `${s.reps} reps`;
  return `${wLabel(kind, s.weight)} × ${s.reps}`;
}
function rangeText(sets, range, kind, perSide) {
  const [lo, hi] = range;
  const r = lo === hi ? `${lo}` : `${lo}–${hi}`;
  return `${sets} × ${r}${kind === 'time' ? ' s' : kind === 'carry' ? ' m' : ''}${perSide ? '/side' : ''}`;
}
function toast(msg, ms = 2600) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, ms);
}
function openSheet(html) {
  sheetEl.innerHTML = `<div class="grab"></div>${html}`;
  sheetWrap.hidden = false;
  document.body.classList.add('sheet-open');
}
function closeSheet() {
  sheetWrap.hidden = true; sheetEl.innerHTML = '';
  UI.edit = null; UI.ci = null;
  document.body.classList.remove('sheet-open');
}

// ---------- persistence ----------
async function load() {
  S.settings = { ...DEFAULT_SETTINGS, ...((await DB.get('settings')) || {}) };
  S.program = (await DB.get('program')) || clone(DEFAULT_PROGRAM);
  S.state = (await DB.get('state')) || { phase: 'p1' };
  S.coach = (await DB.get('coach')) || {};
  S.custom = (await DB.get('custom')) || {};
  S.active = (await DB.get('active')) || null;
  S.workouts = ((await DB.allWorkouts()) || []).sort(byStart);
}
const saveActive = () => (S.active ? DB.set('active', S.active) : DB.del('active'));
const saveSettings = () => DB.set('settings', S.settings);

// ---------- wake lock, sound, notifications ----------
let wake = null, actx = null;
async function keepAwake() {
  try {
    if ('wakeLock' in navigator && !wake && document.visibilityState === 'visible') {
      wake = await navigator.wakeLock.request('screen');
      wake.addEventListener('release', () => { wake = null; });
    }
  } catch { wake = null; }
}
function releaseWake() { try { if (wake) wake.release(); } catch { /* ignore */ } wake = null; }
function unlockAudio() {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
  } catch { actx = null; }
}
function beep() {
  if (!actx) return;
  const t = actx.currentTime;
  [0, 0.28, 0.56].forEach((d) => {
    const o = actx.createOscillator(), g = actx.createGain();
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.0001, t + d);
    g.gain.exponentialRampToValueAtTime(0.5, t + d + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.2);
    o.connect(g).connect(actx.destination); o.start(t + d); o.stop(t + d + 0.22);
  });
}
function askNotify() {
  try { if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission(); } catch { /* ignore */ }
}
async function notifyRest(label) {
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted' || !navigator.serviceWorker) return;
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg) reg.showNotification('Rest over — next set', { body: label, tag: 'rest', renotify: true, vibrate: [400, 150, 400, 150, 400], icon: 'icons/icon-192.png', badge: 'icons/icon-192.png' });
  } catch { /* best effort */ }
}

// ---------- rest timer ----------
let restTimeout = null;
function scheduleRest() {
  clearTimeout(restTimeout);
  const r = S.active && S.active.rest;
  if (r) restTimeout = setTimeout(restDone, Math.max(0, r.end - Date.now()));
}
function startRest(sec, label) {
  S.active.rest = { end: Date.now() + sec * 1000, total: sec, label };
  scheduleRest();
}
function restDone() {
  const r = S.active && S.active.rest;
  if (!r) return;
  if (Date.now() < r.end - 250) { scheduleRest(); return; }
  S.active.rest = null; saveActive();
  buzz([400, 150, 400, 150, 400]); beep(); notifyRest(r.label);
  toast('Rest over — next set');
  renderDock(route().name);
}
function tick() {
  if (!S.active) return;
  const el = document.getElementById('elapsed');
  if (el) el.textContent = mmss((Date.now() - new Date(S.active.start)) / 1000);
  const r = S.active.rest, t = document.getElementById('rest-time');
  if (r && t) {
    const left = Math.max(0, (r.end - Date.now()) / 1000);
    t.textContent = mmss(Math.ceil(left));
    const f = document.getElementById('rest-fill');
    if (f) f.style.width = `${Math.min(100, 100 * (1 - left / r.total))}%`;
    if (left <= 0) restDone();
  }
}

// ---------- routing ----------
function route() {
  const h = location.hash.slice(1) || 'today';
  const i = h.indexOf('/');
  return i < 0 ? { name: h, arg: null } : { name: h.slice(0, i), arg: decodeURIComponent(h.slice(i + 1)) };
}
const TAB = { today: 'today', workout: 'today', summary: 'today', history: 'history', w: 'history', progress: 'progress', ex: 'progress', settings: 'settings', import: 'settings' };
const VIEWS = {};
function render() {
  const r = route();
  const fn = VIEWS[r.name] || VIEWS.today;
  view.innerHTML = fn(r.arg);
  const inWo = r.name === 'workout' && !!S.active;
  document.body.classList.toggle('in-workout', inWo);
  nav.hidden = inWo;
  nav.querySelectorAll('a').forEach((a) => a.classList.toggle('on', a.dataset.tab === (TAB[r.name] || 'today')));
  renderDock(r.name);
}
function renderDock(name) {
  if (name === 'workout' && S.active) {
    const r = S.active.rest;
    dock.innerHTML = r ? `<div class="rest">
      <div class="rest-fill" id="rest-fill"></div>
      <button class="rbtn" data-act="restAdj" data-d="-15">−15</button>
      <button class="rest-mid" data-act="restSkip"><span class="rest-label">Rest · tap to skip</span><span class="rest-time" id="rest-time">${mmss(Math.ceil((r.end - Date.now()) / 1000))}</span></button>
      <button class="rbtn" data-act="restAdj" data-d="15">+15</button></div>` : '';
    document.body.classList.toggle('has-rest', !!r);
  } else {
    document.body.classList.remove('has-rest');
    dock.innerHTML = S.active ? '<button class="resume" data-act="resume">● Workout in progress — tap to resume</button>' : '';
  }
  tick();
}

// ---------- program helpers ----------
function shortItems(items, short) {
  const list = items.map((i) => ({ ...i }));
  if (!short) return list;
  const acc = list.map((it, i) => (it.main ? -1 : i)).filter((i) => i >= 0);
  if (acc.length && list.length > 3) list.splice(acc[acc.length - 1], 1);
  list.forEach((it) => { if (!it.main) it.sets = Math.max(1, it.sets - 1); });
  return list;
}
function makeEntry(it, c) {
  const ex = getEx(it.ex);
  const sug = E.suggest(it, ex, c);
  const weight = sug.weight ?? it.start ?? null;
  const last = E.lastEntry(it.ex, S.workouts);
  const sets = [];
  if (weight) {
    (it.warmups || []).forEach(([f, r]) => sets.push({
      type: 'warmup', reps: r, done: false,
      weight: f === 0 && ex.kind === 'bb' ? S.settings.bar : E.roundDown(ex.kind, weight * f, S.settings),
    }));
  }
  for (let k = 0; k < it.sets; k++) sets.push({ type: 'normal', weight, reps: sug.reps, done: false });
  return {
    exId: it.ex, name: ex.name, kind: ex.kind, perSide: !!ex.perSide,
    rest: restFor(it.ex, it.rest), range: [...it.reps], note: it.note || '', sug: { ...sug, weight },
    prev: last ? E.workSets(last.e).map((s) => ({ weight: s.weight, reps: s.reps })) : [],
    prevDate: last ? last.w.start : null, sets, effort: null, pain: null, stopped: null,
  };
}
function defaultItem(id) {
  const found = E.findItem(S.program, id, S.state.phase);
  if (found) return { ...found };
  const k = getEx(id).kind;
  return { ex: id, sets: 2, reps: k === 'time' ? [20, 30] : k === 'carry' ? [30, 30] : [8, 12] };
}
function currentIdx() {
  if (!S.active) return -1;
  return S.active.exercises.findIndex((en) => !en.stopped && en.sets.some((s) => !s.done));
}
function exercisePicker(act, i) {
  const known = Object.entries(EXERCISES).map(([id, ex]) => ({ id, name: ex.name }));
  const custom = Object.entries(S.custom).map(([id, ex]) => ({ id, name: ex.name }));
  const btn = (e) => `<button class="li-btn" data-act="${act}" data-i="${i ?? ''}" data-v="${esc(e.id)}">${esc(e.name)}</button>`;
  return `<div class="picker">${known.sort((a, b) => a.name.localeCompare(b.name)).map(btn).join('')}
    ${custom.length ? `<div class="q">From your Hevy history</div>${custom.sort((a, b) => a.name.localeCompare(b.name)).map(btn).join('')}` : ''}</div>`;
}

// ---------- views ----------
VIEWS.today = () => {
  const nd = E.nextDay(S.program, S.state, S.workouts);
  const phase = nd.phase;
  const dayKey = UI.pickDay && phase.days[UI.pickDay] ? UI.pickDay : nd.day;
  const day = phase.days[dayKey];
  const c = ctx({ worse: UI.worse });
  const items = shortItems(day.items, UI.short);
  const wk = E.weekCount(S.workouts), stk = E.streak(S.workouts);
  const nextPhase = S.program.phases[S.program.phases.indexOf(phase) + 1];
  const hadOwn = S.workouts.some((w) => w.source !== 'hevy');
  let h = `<div class="today-head">
    <div><div class="muted">${dateStr(new Date())}</div><h1>${esc(day.name)}</h1>
    <div class="muted small">${esc(phase.name)} · session ${Math.min(nd.done + 1, phase.sessions)} of ${phase.sessions}</div></div>
    <div class="week"><b>${wk}/3</b><span>this week</span>${stk ? `<span>🔥 ${stk} wk streak</span>` : ''}</div></div>`;
  if (nd.done >= phase.sessions && nextPhase) {
    h += `<div class="banner">${esc(phase.name)} complete. <button class="btn small primary" data-act="setPhase" data-v="${esc(nextPhase.id)}">Start ${esc(nextPhase.name)}</button></div>`;
  }
  if (S.active) h += '<button class="btn primary big" data-act="resume">Resume workout in progress</button>';
  h += `<div class="chips">${phase.rotation.map((k) => `<button class="chip ${k === dayKey ? 'on' : ''}" data-act="pickDay" data-v="${esc(k)}">${esc(phase.days[k].name)}${k === nd.day ? ' · next' : ''}</button>`).join('')}</div>`;
  if (hadOwn && !S.active) {
    h += `<div class="card"><div class="q">Anything worse since your last workout?</div><div class="chips">
      ${['knee', 'shoulder', 'back'].map((j) => `<button class="chip ${UI.worse[j] ? 'on bad' : ''}" data-act="worse" data-v="${j}">${j[0].toUpperCase() + j.slice(1)}</button>`).join('')}
      <span class="muted small">${Object.values(UI.worse).some(Boolean) ? 'Related lifts back off ~15%' : 'Leave blank if all good'}</span></div></div>`;
  }
  if (!S.active) {
    h += `<button class="toggle ${UI.short ? 'on' : ''}" data-act="short"><span class="sw"></span>30-min version <span class="muted small">(main lifts keep all sets)</span></button>`;
  }
  h += `<div class="card list">${items.map((it) => {
    const ex = getEx(it.ex);
    const s = E.suggest(it, ex, c);
    const w = s.weight ?? it.start;
    return `<div class="li"><div class="grow"><b>${esc(ex.name)}</b>
      <div class="muted small">${rangeText(it.sets, it.reps, ex.kind, ex.perSide)} · ${esc(wLabel(ex.kind, w))}${s.reps !== it.reps[0] ? ` · aim ${s.reps}` : ''}</div>
      <div class="note ${s.decision}">${esc(s.note)}</div></div>
      <a class="icon" href="${esc(howUrl(ex))}" target="_blank" rel="noopener" aria-label="How-to video">▶</a></div>`;
  }).join('')}</div>`;
  if (!S.active) h += `<div class="cta"><button class="btn primary big" data-act="start" data-v="${esc(dayKey)}">Start ${esc(day.name)}</button></div>`;
  return h;
};

VIEWS.workout = () => {
  const w = S.active;
  if (!w) { setTimeout(() => { location.hash = '#today'; }); return ''; }
  const cur = currentIdx();
  const done = w.exercises.reduce((a, en) => a + en.sets.filter((s) => s.done).length, 0);
  const total = w.exercises.reduce((a, en) => a + en.sets.length, 0);
  let h = `<div class="wo-head"><div><h1>${esc(w.title)}</h1>
    <div class="muted"><span id="elapsed">0:00</span> · ${done}/${total} sets</div></div>
    <button class="icon" data-act="woMenu" aria-label="Workout options">⋯</button></div>`;
  w.exercises.forEach((en, i) => { h += exCard(en, i, i === cur); });
  h += '<button class="btn ghost wide" data-act="addEx">+ Add exercise</button>';
  h += '<button class="btn primary big" data-act="finishAsk">Finish workout</button>';
  return h;
};

function exCard(en, i, isCur) {
  const ex = getEx(en.exId);
  const unit = { db: 'LB', db1: 'LB', bb: 'LB', kb: 'LB', carry: 'LB', lm: 'PLATES', bw: 'ADDED', time: '' }[en.kind] ?? 'LB';
  const repsHead = en.kind === 'time' ? 'SEC' : en.kind === 'carry' ? 'M' : 'REPS';
  const normal = en.sets.filter((s) => s.type !== 'warmup').length;
  let n = 0;
  const rows = en.sets.map((s, j) => {
    const warm = s.type === 'warmup';
    const label = warm ? 'W' : String(++n);
    const p = warm ? null : en.prev[n - 1];
    const prev = p ? E.formatSet(p, en.kind, false).replace(' reps', '') : '—';
    const wCell = en.kind === 'time'
      ? '<span class="cell dim">—</span>'
      : `<button class="cell" data-act="edit" data-i="${i}" data-j="${j}" data-f="weight">${s.weight == null || (en.kind === 'bw' && !s.weight) ? (en.kind === 'bw' ? 'BW' : '–') : fmt(s.weight)}</button>`;
    return `<div class="set ${s.done ? 'done' : ''} ${warm ? 'warm' : ''}">
      <span class="sn">${label}</span><span class="prev">${esc(prev)}</span>${wCell}
      <button class="cell" data-act="edit" data-i="${i}" data-j="${j}" data-f="reps">${s.reps ?? '–'}</button>
      <button class="check ${s.done ? 'on' : ''}" data-act="done" data-i="${i}" data-j="${j}" aria-label="Complete set">✓</button></div>`;
  }).join('');
  const nextSet = en.sets.find((s) => !s.done && s.type !== 'warmup') || en.sets[0];
  const plates = nextSet && (en.kind === 'bb' || en.kind === 'lm') ? E.plateMath(en.kind, nextSet.weight, S.settings) : '';
  const allDone = en.sets.length && en.sets.every((s) => s.done);
  return `<section class="card ex ${isCur ? 'cur' : ''} ${allDone ? 'complete' : ''} ${en.stopped ? 'stopped' : ''}" id="ex-${i}">
    <div class="ex-head"><div class="grow"><h2>${esc(en.name)}</h2>
      <div class="muted small">${rangeText(normal, en.range, en.kind, en.perSide)} · ${esc(KIND_LABEL[en.kind] || '')} · rest ${mmss(en.rest)}</div></div>
      <a class="icon" href="${esc(howUrl(ex))}" target="_blank" rel="noopener" aria-label="How-to video">▶</a>
      <button class="icon" data-act="exMenu" data-i="${i}" aria-label="Exercise options">⋯</button></div>
    ${en.stopped
      ? `<div class="flag">🛑 Stopped: ${esc(en.stopped)}. Next time this backs off ~20%${ex.swap ? ` — or swap to ${esc(ex.swap)}` : ''}. If it keeps happening, get it checked.</div>`
      : `<div class="note ${en.sug.decision}">${esc(en.sug.note)}</div>`}
    ${isCur && ex.cue ? `<div class="cue">${esc(ex.cue)}</div>` : ''}
    ${en.note ? `<div class="cue">${esc(en.note)}</div>` : ''}
    ${plates ? `<div class="plates">${esc(plates)}</div>` : ''}
    <div class="set head"><span>SET</span><span>PREVIOUS</span><span>${unit}</span><span>${repsHead}</span><span>✓</span></div>
    ${rows}
    <div class="ex-foot">
      <button class="btn ghost small" data-act="addSet" data-i="${i}">+ Set</button>
      <button class="btn ghost small" data-act="addWarm" data-i="${i}">+ Warm-up</button>
      <button class="btn small ${en.effort ? 'ghost' : 'attn'}" data-act="checkin" data-i="${i}">${en.effort ? `Effort ${en.effort} · pain ${E.maxPain(en.pain)}` : 'Check-in'}</button>
    </div></section>`;
}

VIEWS.summary = (id) => {
  const w = S.workouts.find((x) => x.id === id);
  if (!w) return VIEWS.history();
  const prs = E.prsFor(w, S.workouts);
  const mins = w.end ? Math.round((new Date(w.end) - new Date(w.start)) / 60000) : null;
  const sets = w.exercises.reduce((a, en) => a + E.workSets(en).length, 0);
  const c = ctx();
  const next = w.exercises.map((en) => {
    const item = E.findItem(S.program, en.exId, w.phase) || { ex: en.exId, sets: E.workSets(en).length || 2, reps: en.range || [8, 12] };
    const ex = getEx(en.exId);
    const s = E.suggest(item, ex, c);
    return `<div class="li"><div class="grow"><b>${esc(en.name)}</b><div class="muted small">${E.workSets(en).map((x) => E.formatSet(x, en.kind, en.perSide)).join(' · ') || 'stopped'}</div>
      <div class="note ${s.decision}">Next time: ${esc(nextText(ex.kind, s))}. ${esc(s.note)}</div></div></div>`;
  }).join('');
  return `<h1>Workout done 💪</h1>
    <div class="tiles"><div class="tile"><b>${mins ?? '–'}</b><span>min</span></div><div class="tile"><b>${sets}</b><span>sets</span></div><div class="tile"><b>${E.workoutVolume(w).toLocaleString()}</b><span>lb volume</span></div></div>
    ${prs.length ? `<div class="card"><div class="q">🏆 Personal records</div>${prs.map((p) => `<div class="pr"><b>${esc(p.ex)}</b> — ${esc(p.what)} ${esc(p.val)}</div>`).join('')}</div>` : ''}
    <div class="card list">${next}</div>
    <button class="btn ghost wide" data-act="exportJSON">Back up now (JSON)</button>
    <a class="btn primary big" href="#today">Done</a>`;
};

VIEWS.history = () => {
  const list = [...S.workouts].reverse();
  if (!list.length) return '<h1>History</h1><div class="card empty">No workouts yet. Import your Hevy history in <a href="#settings">Settings</a>.</div>';
  let month = '';
  return `<h1>History</h1>${list.map((w) => {
    const m = dateStr(w.start, { month: 'long', year: 'numeric' });
    const head = m !== month ? `<div class="month">${esc((month = m))}</div>` : '';
    const mins = w.end ? Math.round((new Date(w.end) - new Date(w.start)) / 60000) : null;
    const sets = w.exercises.reduce((a, en) => a + E.workSets(en).length, 0);
    return `${head}<a class="card li link" href="#w/${encodeURIComponent(w.id)}"><div class="grow"><b>${esc(w.title)}</b>
      <div class="muted small">${dateStr(w.start)}${mins ? ` · ${mins} min` : ''} · ${sets} sets · ${E.workoutVolume(w).toLocaleString()} lb</div>
      <div class="small ex-names">${esc(w.exercises.map((e) => e.name).join(', '))}</div></div>${w.source === 'hevy' ? '<span class="tag">Hevy</span>' : ''}</a>`;
  }).join('')}`;
};

VIEWS.w = (id) => {
  const w = S.workouts.find((x) => x.id === id);
  if (!w) return VIEWS.history();
  return `<a class="back" href="#history">‹ History</a><h1>${esc(w.title)}</h1>
    <div class="muted">${dateStr(w.start, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}${w.short ? ' · 30-min version' : ''}</div>
    ${w.exercises.map((en) => `<div class="card"><a class="ex-link" href="#ex/${encodeURIComponent(en.exId)}"><b>${esc(en.name)}</b></a>
      <div class="small">${en.sets.map((s) => `<span class="pill ${s.type === 'warmup' ? 'warm' : ''}">${esc(E.formatSet(s, en.kind, en.perSide))}</span>`).join(' ')}</div>
      ${en.effort || en.pain ? `<div class="muted small">Effort ${en.effort ?? '–'} · knee ${en.pain?.knee ?? 0} · shoulder ${en.pain?.shoulder ?? 0} · back ${en.pain?.back ?? 0}</div>` : ''}
      ${en.stopped ? `<div class="flag">Stopped: ${esc(en.stopped)}</div>` : ''}
      ${en.note ? `<div class="muted small">${esc(en.note)}</div>` : ''}</div>`).join('')}
    <button class="btn danger wide" data-act="deleteW" data-v="${esc(w.id)}">Delete this workout</button>`;
};

VIEWS.progress = () => {
  const last = new Map();
  for (const w of S.workouts) for (const en of w.exercises) if (E.workSets(en).length) last.set(en.exId, w.start);
  if (!last.size) return '<h1>Progress</h1><div class="card empty">Log a workout or import Hevy history to see progress.</div>';
  const rows = [...last.entries()].sort((a, b) => (a[1] < b[1] ? 1 : -1)).map(([id, when]) => {
    const ex = getEx(id);
    const pts = E.series(id, S.workouts);
    const b = E.bests(pts);
    const metric = E.isWeighted(ex.kind) ? `e1RM ${Math.round(b.e1rm)} lb` : ex.kind === 'time' ? `best ${b.maxReps} s` : `best ${b.maxReps} reps`;
    return `<a class="card li link" data-name="${esc(ex.name.toLowerCase())}" href="#ex/${encodeURIComponent(id)}"><div class="grow"><b>${esc(ex.name)}</b>
      <div class="muted small">${pts.length} sessions · last ${dateStr(when, { month: 'short', day: 'numeric', year: '2-digit' })}</div></div><span class="metric">${metric}</span></a>`;
  }).join('');
  return `<h1>Progress</h1><input class="search" id="ex-filter" placeholder="Filter exercises…" autocomplete="off">${rows}`;
};

VIEWS.ex = (id) => {
  const ex = getEx(id);
  const pts = E.series(id, S.workouts);
  const b = E.bests(pts);
  const weighted = E.isWeighted(ex.kind);
  const my = (S.settings.videoLinks || {})[id] || '';
  const tiles = weighted
    ? `<div class="tile"><b>${Math.round(b.e1rm)}</b><span>best e1RM</span></div><div class="tile"><b>${fmt(b.maxW)}</b><span>heaviest</span></div><div class="tile"><b>${Math.round(b.volume).toLocaleString()}</b><span>best volume</span></div>`
    : `<div class="tile"><b>${b.maxReps}</b><span>${ex.kind === 'time' ? 'longest (s)' : 'most reps'}</span></div><div class="tile"><b>${pts.length}</b><span>sessions</span></div>`;
  const chartPts = pts.map((p) => ({ t: p.t, v: weighted ? p.e1rm : p.maxReps, low: weighted && p.low }));
  return `<a class="back" href="#progress">‹ Progress</a><h1>${esc(ex.name)}</h1>
    <div class="muted small">${esc(KIND_LABEL[ex.kind] || '')}${weighted ? ' · e1RM = Epley' : ''}</div>
    <div class="tiles">${tiles}</div>
    <div class="card">${chart(chartPts, weighted ? 'Est. 1RM (lb)' : ex.kind === 'time' ? 'Best hold (s)' : 'Best reps')}</div>
    ${ex.cue ? `<div class="card cue">${esc(ex.cue)}</div>` : ''}
    <div class="row-btns"><a class="btn ghost" href="${esc(howUrl(ex))}" target="_blank" rel="noopener">▶ Video</a><a class="btn ghost" href="${esc(gifUrl(ex))}" target="_blank" rel="noopener">GIF</a>${my ? `<a class="btn ghost" href="${esc(my)}" target="_blank" rel="noopener">★ My link</a>` : ''}</div>
    <div class="card"><div class="q">Your own how-to link (YouTube, GIF…)</div><div class="inline"><input id="vlink" type="url" value="${esc(my)}" placeholder="https://"><button class="btn small" data-act="saveLink" data-v="${esc(id)}">Save</button></div></div>
    <div class="q">History</div>
    ${[...pts].reverse().map((p) => `<a class="card li link" href="#w/${encodeURIComponent(p.wid)}"><div class="grow"><div class="muted small">${dateStr(p.date, { month: 'short', day: 'numeric', year: 'numeric' })}${p.effort ? ` · effort ${p.effort}` : ''}${p.pain && E.maxPain(p.pain) ? ` · pain ${E.maxPain(p.pain)}` : ''}${p.stopped ? ' · stopped' : ''}</div>
      <div class="small">${p.sets.map((s) => esc(E.formatSet(s, ex.kind, ex.perSide))).join(' · ')}</div></div>${weighted ? `<span class="metric">${Math.round(p.e1rm)}</span>` : ''}</a>`).join('')}`;
};

function chart(points, label) {
  if (points.length < 2) return `<div class="muted small">${esc(label)} — chart appears after 2 sessions.</div>`;
  const W = 340, H = 170, P = { l: 36, r: 10, t: 14, b: 22 };
  const xs = points.map((p) => p.t), ys = points.map((p) => p.v);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  let y0 = Math.min(...ys), y1 = Math.max(...ys);
  const pad = (y1 - y0) * 0.12 || 5; y0 = Math.max(0, y0 - pad); y1 += pad;
  const X = (t) => P.l + ((t - x0) / (x1 - x0 || 1)) * (W - P.l - P.r);
  const Y = (v) => H - P.b - ((v - y0) / (y1 - y0 || 1)) * (H - P.t - P.b);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${X(p.t).toFixed(1)},${Y(p.v).toFixed(1)}`).join('');
  const dots = points.map((p) => `<circle cx="${X(p.t).toFixed(1)}" cy="${Y(p.v).toFixed(1)}" r="3.5" class="${p.low ? 'low' : ''}"/>`).join('');
  const ticks = [y0, (y0 + y1) / 2, y1].map((v) => `<line x1="${P.l}" x2="${W - P.r}" y1="${Y(v)}" y2="${Y(v)}" class="grid"/><text x="${P.l - 6}" y="${Y(v) + 4}" text-anchor="end">${Math.round(v)}</text>`).join('');
  const dl = (t) => new Date(t).toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
  return `<div class="q">${esc(label)}</div><svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)} over time">${ticks}
    <path d="${d}" class="line"/>${dots}
    <text x="${P.l}" y="${H - 4}">${dl(x0)}</text><text x="${W - P.r}" y="${H - 4}" text-anchor="end">${dl(x1)}</text></svg>
    ${points.some((p) => p.low) ? '<div class="muted small">Hollow dots: sets over 12 reps — rougher estimate.</div>' : ''}`;
}

VIEWS.settings = () => {
  const st = S.settings;
  const plates = Object.entries(st.plates).sort((a, b) => b[0] - a[0]).map(([p, c]) => `${p}×${c}`).join(', ');
  const coach = Object.entries(S.coach);
  const perm = 'Notification' in window ? Notification.permission : 'unsupported';
  return `<h1>Settings</h1>
  <div class="card"><div class="q">Your data</div>
    <div class="row-btns"><button class="btn" data-act="exportJSON">Export backup (JSON)</button><button class="btn" data-act="exportCSV">Export CSV</button></div>
    <button class="btn ghost wide" data-act="importFile">Import: Hevy CSV or Beam Lift JSON</button>
    <div class="muted small">${S.workouts.length} workouts stored on this phone. Back up after workouts until cloud sync lands (v1.1).</div></div>
  <div class="card"><div class="q">Program phase</div><div class="chips">${S.program.phases.map((p) => `<button class="chip ${p.id === S.state.phase ? 'on' : ''}" data-act="setPhase" data-v="${esc(p.id)}">${esc(p.name)}</button>`).join('')}</div>
    ${coach.length ? `<div class="q">Coach targets (used once, next time)</div>${coach.map(([id, t]) => `<div class="li"><div class="grow">${esc(getEx(id).name)}: ${esc(wLabel(getEx(id).kind, t.weight))}${t.reps ? ` × ${t.reps}` : ''}</div><button class="btn small ghost" data-act="clearCoach" data-v="${esc(id)}">Clear</button></div>`).join('')}` : ''}
    <details><summary>Edit program (JSON)</summary><textarea id="progjson" spellcheck="false">${esc(JSON.stringify(S.program, null, 2))}</textarea>
    <div class="row-btns"><button class="btn" data-act="saveProgram">Save program</button><button class="btn ghost" data-act="resetProgram">Reset to default</button></div></details></div>
  <div class="card"><div class="q">Equipment</div>
    <label class="fld">Dumbbell settings (lb)<input id="dbw" value="${esc(st.dbWeights.join(', '))}"></label>
    <label class="fld">Kettlebells (lb)<input id="kbw" value="${esc(st.kbWeights.join(', '))}"></label>
    <label class="fld">Plates you own (weight×count)<input id="plates" value="${esc(plates)}"></label>
    <label class="fld">Bar (lb)<input id="bar" inputmode="decimal" value="${esc(st.bar)}"></label>
    <label class="fld">Default rest (seconds)<input id="restd" inputmode="numeric" value="${esc(st.restDefault)}"></label>
    <button class="btn wide" data-act="saveEquip">Save equipment</button></div>
  <div class="card"><div class="q">Rest alerts</div>
    <div class="muted small">The screen stays awake during workouts so the timer and vibration are reliable. Notifications when the phone is locked are best-effort. Status: ${esc(perm)}.</div>
    ${perm === 'default' ? '<button class="btn wide" data-act="notify">Allow notifications</button>' : ''}
    <button class="btn ghost wide" data-act="testAlert">Test vibration + beep</button></div>
  <div class="card"><div class="q">About</div><div class="muted small">Beam Lift ${APP_VERSION}. Dumbbells logged per hand; barbell = total incl. bar; landmine = plates added. e1RM = Epley (w × (1 + reps/30)).</div></div>
  <button class="btn danger wide" data-act="wipe">Delete all data on this phone</button>`;
};

VIEWS.import = () => {
  const p = UI.hevy;
  if (!p) return VIEWS.settings();
  return `<a class="back" href="#settings">‹ Settings</a><h1>Import Hevy</h1>
    <div class="card"><b>${p.workouts} workouts · ${p.recs.length} sets</b><div class="muted small">${p.first ? dateStr(p.first, { month: 'short', day: 'numeric', year: 'numeric' }) : ''} → ${p.last ? dateStr(p.last, { month: 'short', day: 'numeric', year: 'numeric' }) : ''}</div>
    <div class="muted small">Ticked = Hevy weight was the total of two dumbbells → halved to per hand. Landmine lifts drop the 45 lb bar so only plates remain. Re-importing replaces the same workouts, so it's safe to redo.</div></div>
    <div class="card list">${p.list.map((e, k) => `<label class="li imp"><input type="checkbox" data-change="halve" data-k="${k}" ${e.halve ? 'checked' : ''}>
      <div class="grow"><b>${esc(e.name)}</b><div class="muted small">${e.sets} sets · max ${fmt(e.maxW) || '–'}${e.halve && e.maxW ? ` → ${fmt(e.maxW / 2)}/hand` : ''}${e.landmine ? ` · plates ${fmt(Math.max(0, e.maxW - 45))}` : ''}${e.mapped ? ` · → ${esc(EXERCISES[e.mapped].name)}` : ''}</div></div></label>`).join('')}</div>
    <div class="cta"><button class="btn primary big" data-act="hevyImport">Import ${p.workouts} workouts</button></div>`;
};

// ---------- actions ----------
async function startWorkout(dayKey) {
  askNotify(); unlockAudio();
  const phase = E.currentPhase(S.program, S.state);
  const day = phase.days[dayKey];
  const now = new Date();
  const c = ctx({ worse: UI.worse });
  S.active = {
    id: `w-${now.toISOString()}`, title: day.name, phase: phase.id, day: dayKey, source: 'beamlift',
    start: now.toISOString(), end: null, short: UI.short, checkin: { worse: { ...UI.worse } }, rest: null,
    exercises: shortItems(day.items, UI.short).map((it) => makeEntry(it, c)),
  };
  UI.pickDay = null; UI.worse = { knee: false, shoulder: false, back: false }; UI.short = false;
  await saveActive();
  keepAwake();
  location.hash = '#workout';
}

function toggleDone(i, j) {
  const en = S.active.exercises[i];
  const s = en.sets[j];
  s.done = !s.done;
  if (s.done) {
    if (s.reps == null) s.reps = en.range[0];
    buzz(30); unlockAudio(); keepAwake();
    const moreHere = en.sets.some((x) => !x.done);
    const moreAnywhere = S.active.exercises.some((x) => !x.stopped && x.sets.some((y) => !y.done));
    if (moreAnywhere) startRest(s.type === 'warmup' ? 45 : en.rest, `Next: ${moreHere ? en.name : (S.active.exercises[currentIdx()] || {}).name || ''}`);
    else { S.active.rest = null; clearTimeout(restTimeout); }
    if (!moreHere && en.effort == null) openCheckin(i);
  }
  saveActive(); render();
}

function openEdit(i, j, f) {
  const en = S.active.exercises[i];
  const s = en.sets[j];
  UI.edit = { i, j, f };
  const val = s[f] ?? (f === 'reps' ? en.range[0] : en.sug.weight ?? '');
  const label = f === 'weight' ? KIND_LABEL[en.kind] : en.kind === 'time' ? 'seconds' : en.kind === 'carry' ? 'meters' : `reps${en.perSide ? ' per side' : ''}`;
  const later = en.sets.slice(j + 1).some((x) => !x.done && x.type === s.type);
  const setNo = s.type === 'warmup' ? 'warm-up' : `set ${en.sets.slice(0, j + 1).filter((x) => x.type !== 'warmup').length}`;
  openSheet(`<h3>${esc(en.name)} · ${setNo}</h3><div class="muted">${esc(label)}</div>
    <div class="stepper"><button class="step" data-act="step" data-d="-1" aria-label="Decrease">−</button>
    <input id="ed" type="number" inputmode="decimal" step="any" value="${esc(val)}">
    <button class="step" data-act="step" data-d="1" aria-label="Increase">+</button></div>
    <div class="hint" id="ed-hint">${f === 'weight' ? esc(E.plateMath(en.kind, +val, S.settings)) : ''}</div>
    ${later ? '<label class="check-line"><input type="checkbox" id="ed-all" checked> Also change the remaining sets</label>' : ''}
    <button class="btn primary big" data-act="edSave">Done</button>`);
}
function stepEdit(d) {
  const inp = document.getElementById('ed');
  const en = S.active.exercises[UI.edit.i];
  let v = parseFloat(inp.value); if (isNaN(v)) v = 0;
  if (UI.edit.f === 'weight') v = E.isWeighted(en.kind) ? E.stepWeight(en.kind, v, d, S.settings) : Math.max(0, v + d * 5);
  else v = Math.max(0, v + d * (en.kind === 'time' || en.kind === 'carry' ? 5 : 1));
  inp.value = v;
  edHint();
}
function edHint() {
  const h = document.getElementById('ed-hint');
  if (!h || !UI.edit || UI.edit.f !== 'weight') return;
  const en = S.active.exercises[UI.edit.i];
  h.textContent = E.plateMath(en.kind, parseFloat(document.getElementById('ed').value), S.settings);
}
function saveEdit() {
  const { i, j, f } = UI.edit;
  const en = S.active.exercises[i];
  const raw = document.getElementById('ed').value;
  const v = raw === '' ? null : parseFloat(raw);
  const all = document.getElementById('ed-all');
  en.sets[j][f] = v;
  if (all && all.checked) en.sets.forEach((x, k) => { if (k > j && !x.done && x.type === en.sets[j].type) x[f] = v; });
  closeSheet(); saveActive(); render();
}

function openCheckin(i) {
  const en = S.active.exercises[i];
  UI.ci = { i, effort: en.effort, pain: { knee: 0, shoulder: 0, back: 0, ...(en.pain || {}) } };
  renderCheckin();
}
function renderCheckin() {
  const { i, effort, pain } = UI.ci;
  const en = S.active.exercises[i];
  const eff = Array.from({ length: 10 }, (_, k) => k + 1).map((v) => `<button class="echip ${effort === v ? 'on' : ''}" data-act="ciEffort" data-v="${v}">${v}</button>`).join('');
  const row = (j, label) => `<div class="q">${label}</div><div class="pain">${Array.from({ length: 11 }, (_, v) => `<button class="pchip ${v <= 2 ? 'ok' : v <= 4 ? 'mid' : 'bad'} ${pain[j] === v ? 'on' : ''}" data-act="ciPain" data-j="${j}" data-v="${v}">${v}</button>`).join('')}</div>`;
  const mp = Math.max(pain.knee, pain.shoulder, pain.back);
  openSheet(`<h3>Check-in · ${esc(en.name)}</h3>
    <div class="q">Effort <span class="muted small">— 10 = nothing left, 7 = ~3 reps left</span></div><div class="effort">${eff}</div>
    ${row('knee', 'Knee pain')}${row('shoulder', 'Shoulder pain')}${row('back', 'Back pain')}
    ${mp >= 5 ? '<div class="flag">Pain 5+ → next time this backs off. Sharp pain, the knee giving way or a shoulder slipping = stop this exercise (⋯ → Stop).</div>' : mp >= 3 ? '<div class="note hold">Pain 3–4 → next time holds the weight.</div>' : ''}
    <button class="btn primary big" data-act="ciSave" ${effort ? '' : 'disabled'}>Save check-in</button>
    <button class="btn ghost wide" data-act="closeSheet">Later</button>`);
}

function openExMenu(i) {
  const en = S.active.exercises[i];
  const ex = getEx(en.exId);
  const my = (S.settings.videoLinks || {})[en.exId];
  openSheet(`<h3>${esc(en.name)}</h3>${ex.cue ? `<p class="cue">${esc(ex.cue)}</p>` : ''}
    <div class="row-btns"><a class="btn ghost" href="${esc(howUrl(ex))}" target="_blank" rel="noopener">▶ Video</a><a class="btn ghost" href="${esc(gifUrl(ex))}" target="_blank" rel="noopener">GIF</a>${my ? `<a class="btn ghost" href="${esc(my)}" target="_blank" rel="noopener">★ My link</a>` : ''}</div>
    <div class="q">Rest between sets <span class="muted small">(remembered for this exercise)</span></div>
    <div class="chips">${[60, 90, 120, 150, 180].map((v) => `<button class="chip ${en.rest === v ? 'on' : ''}" data-act="setRest" data-i="${i}" data-v="${v}">${mmss(v)}</button>`).join('')}</div>
    <button class="btn ghost wide" data-act="removeSet" data-i="${i}">− Remove last unfinished set</button>
    <button class="btn ghost wide" data-act="swapAsk" data-i="${i}">⇄ Swap exercise${ex.swap ? ` <span class="muted small">(try: ${esc(ex.swap)})</span>` : ''}</button>
    <button class="btn ghost wide" data-act="removeEx" data-i="${i}">✕ Remove from this workout</button>
    <button class="btn danger wide" data-act="stopAsk" data-i="${i}">🛑 Stop — red flag</button>`);
}

const STOP_REASONS = ['Knee gave way / caught', 'Shoulder slipped', 'Sharp or radiating back pain', 'Other sharp pain'];

const A = {
  closeSheet,
  resume: () => { location.hash = '#workout'; },
  pickDay: (el) => { UI.pickDay = el.dataset.v; render(); },
  worse: (el) => { UI.worse[el.dataset.v] = !UI.worse[el.dataset.v]; render(); },
  short: () => { UI.short = !UI.short; render(); },
  start: (el) => startWorkout(el.dataset.v),
  setPhase: async (el) => { S.state.phase = el.dataset.v; UI.pickDay = null; await DB.set('state', S.state); toast('Phase set'); render(); },
  done: (el) => toggleDone(+el.dataset.i, +el.dataset.j),
  edit: (el) => openEdit(+el.dataset.i, +el.dataset.j, el.dataset.f),
  step: (el) => stepEdit(+el.dataset.d),
  edSave: saveEdit,
  addSet: (el) => {
    const en = S.active.exercises[+el.dataset.i];
    const last = [...en.sets].reverse().find((s) => s.type !== 'warmup') || { weight: en.sug.weight, reps: en.range[0] };
    en.sets.push({ type: 'normal', weight: last.weight, reps: last.reps, done: false });
    saveActive(); render();
  },
  addWarm: (el) => {
    const en = S.active.exercises[+el.dataset.i];
    const first = en.sets.find((s) => s.type !== 'warmup');
    const w = first && first.weight ? (en.kind === 'bb' ? Math.max(S.settings.bar, E.roundDown('bb', first.weight * 0.5, S.settings)) : E.roundDown(en.kind, first.weight * 0.5, S.settings)) : first ? first.weight : null;
    const at = en.sets.findIndex((s) => s.type !== 'warmup' && !s.done);
    en.sets.splice(at < 0 ? 0 : at, 0, { type: 'warmup', weight: w, reps: 8, done: false });
    saveActive(); render();
  },
  removeSet: (el) => {
    const en = S.active.exercises[+el.dataset.i];
    for (let k = en.sets.length - 1; k >= 0; k--) if (!en.sets[k].done) { en.sets.splice(k, 1); break; }
    closeSheet(); saveActive(); render();
  },
  checkin: (el) => openCheckin(+el.dataset.i),
  ciEffort: (el) => { UI.ci.effort = +el.dataset.v; renderCheckin(); },
  ciPain: (el) => { UI.ci.pain[el.dataset.j] = +el.dataset.v; renderCheckin(); },
  ciSave: () => {
    const en = S.active.exercises[UI.ci.i];
    en.effort = UI.ci.effort; en.pain = { ...UI.ci.pain };
    closeSheet(); saveActive(); render();
    const c = currentIdx();
    if (c >= 0) setTimeout(() => document.getElementById(`ex-${c}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  },
  exMenu: (el) => openExMenu(+el.dataset.i),
  setRest: async (el) => {
    const i = +el.dataset.i, v = +el.dataset.v;
    const en = S.active.exercises[i];
    en.rest = v;
    S.settings.restOverrides = { ...(S.settings.restOverrides || {}), [en.exId]: v };
    await saveSettings(); saveActive(); openExMenu(i); render();
  },
  swapAsk: (el) => {
    const en = S.active.exercises[+el.dataset.i];
    const ex = getEx(en.exId);
    openSheet(`<h3>Swap ${esc(en.name)}</h3>${ex.swap ? `<div class="muted small">Suggested: ${esc(ex.swap)}</div>` : ''}${exercisePicker('swapTo', el.dataset.i)}`);
  },
  swapTo: (el) => {
    const i = +el.dataset.i;
    const old = S.active.exercises[i];
    const it = { ...defaultItem(el.dataset.v), sets: old.sets.filter((s) => s.type !== 'warmup').length || 2 };
    const entry = makeEntry(it, ctx());
    if (old.sets.some((s) => s.done)) {
      old.sets = old.sets.filter((s) => s.done);
      S.active.exercises.splice(i + 1, 0, entry);
    } else S.active.exercises.splice(i, 1, entry);
    closeSheet(); saveActive(); render();
  },
  removeEx: (el) => {
    const i = +el.dataset.i;
    if (!confirm(`Remove ${S.active.exercises[i].name} from this workout?`)) return;
    S.active.exercises.splice(i, 1);
    closeSheet(); saveActive(); render();
  },
  stopAsk: (el) => {
    const i = el.dataset.i;
    openSheet(`<h3>🛑 Stop this exercise</h3><div class="muted small">What happened?</div>
      ${STOP_REASONS.map((r, k) => `<button class="btn danger wide" data-act="stopWith" data-i="${i}" data-v="${k}">${esc(r)}</button>`).join('')}
      <button class="btn ghost wide" data-act="closeSheet">Cancel</button>`);
  },
  stopWith: (el) => {
    const en = S.active.exercises[+el.dataset.i];
    en.stopped = STOP_REASONS[+el.dataset.v];
    en.sets = en.sets.filter((s) => s.done);
    S.active.rest = null; clearTimeout(restTimeout);
    saveActive(); render();
    openSheet(`<h3>Stopped — good call</h3><p>Done with ${esc(en.name)} for today. Next time it backs off ~20% or you can swap it.</p>
      <p class="flag">If the knee gives way, a shoulder slips, or back pain is sharp or travels down the leg again, get it checked by a clinician before loading it again.</p>
      <button class="btn primary big" data-act="closeSheet">OK</button>`);
  },
  addEx: () => openSheet(`<h3>Add exercise</h3>${exercisePicker('addExTo')}`),
  addExTo: (el) => {
    S.active.exercises.push(makeEntry(defaultItem(el.dataset.v), ctx()));
    closeSheet(); saveActive(); render();
    setTimeout(() => document.getElementById(`ex-${S.active.exercises.length - 1}`)?.scrollIntoView({ behavior: 'smooth' }), 60);
  },
  restAdj: (el) => {
    const r = S.active && S.active.rest;
    if (!r) return;
    const d = +el.dataset.d;
    r.end += d * 1000; r.total = Math.max(1, r.total + d);
    if (r.end <= Date.now()) { S.active.rest = null; clearTimeout(restTimeout); renderDock('workout'); }
    else scheduleRest();
    saveActive(); tick();
  },
  restSkip: () => { S.active.rest = null; clearTimeout(restTimeout); saveActive(); renderDock('workout'); },
  woMenu: () => openSheet(`<h3>Workout</h3><button class="btn danger wide" data-act="discard">Discard this workout</button><button class="btn ghost wide" data-act="closeSheet">Cancel</button>`),
  discard: async () => {
    if (!confirm('Discard this workout? Nothing from it will be saved.')) return;
    S.active = null; clearTimeout(restTimeout); releaseWake();
    await DB.del('active'); closeSheet(); location.hash = '#today'; render();
  },
  finishAsk: () => {
    const w = S.active;
    const done = w.exercises.reduce((a, en) => a + en.sets.filter((s) => s.done).length, 0);
    const total = w.exercises.reduce((a, en) => a + en.sets.length, 0);
    const missing = w.exercises.filter((en) => en.sets.some((s) => s.done) && en.effort == null).map((en) => en.name);
    openSheet(`<h3>Finish workout?</h3><p>${done} of ${total} sets done. Unfinished sets are dropped.</p>
      ${missing.length ? `<div class="note hold">No check-in yet for: ${esc(missing.join(', '))}. Progression assumes effort 7 and no pain.</div>` : ''}
      <button class="btn primary big" data-act="finish">Finish & save</button><button class="btn ghost wide" data-act="closeSheet">Keep going</button>`);
  },
  finish: async () => {
    const w = clone(S.active);
    w.end = new Date().toISOString();
    delete w.rest;
    w.exercises = w.exercises.map((en) => { const { prev, ...rest } = en; return { ...rest, sets: en.sets.filter((s) => s.done) }; })
      .filter((en) => en.sets.length || en.stopped);
    for (const en of w.exercises) if (S.coach[en.exId] && en.sets.length) delete S.coach[en.exId];
    await DB.putWorkout(w);
    await DB.set('coach', S.coach);
    await DB.del('active');
    S.workouts.push(w); S.workouts.sort(byStart);
    S.active = null; clearTimeout(restTimeout); releaseWake();
    closeSheet();
    location.hash = `#summary/${encodeURIComponent(w.id)}`;
  },
  deleteW: async (el) => {
    if (!confirm('Delete this workout permanently?')) return;
    await DB.delWorkout(el.dataset.v);
    S.workouts = S.workouts.filter((w) => w.id !== el.dataset.v);
    location.hash = '#history';
  },
  saveLink: async (el) => {
    const v = document.getElementById('vlink').value.trim();
    S.settings.videoLinks = { ...(S.settings.videoLinks || {}) };
    if (v && !/^https?:\/\//i.test(v)) { toast('Link must start with https://'); return; }
    if (v) S.settings.videoLinks[el.dataset.v] = v; else delete S.settings.videoLinks[el.dataset.v];
    await saveSettings(); toast('Saved'); render();
  },
  exportJSON: async () => {
    const name = `beamlift-backup-${new Date().toISOString().slice(0, 10)}.json`;
    const r = await shareOrDownload(name, JSON.stringify(buildBackup(S, getEx), null, 1), 'application/json');
    if (r !== 'cancelled') toast(r === 'shared' ? 'Backup shared' : 'Backup downloaded');
  },
  exportCSV: async () => {
    const name = `beamlift-sets-${new Date().toISOString().slice(0, 10)}.csv`;
    const r = await shareOrDownload(name, buildCSV(S), 'text/csv');
    if (r !== 'cancelled') toast(r === 'shared' ? 'CSV shared' : 'CSV downloaded');
  },
  importFile: () => { fileInput.value = ''; fileInput.click(); },
  hevyImport: async () => {
    const halve = new Set(UI.hevy.list.filter((e) => e.halve).map((e) => e.name));
    const { workouts, custom } = convertHevy(UI.hevy, halve);
    S.custom = { ...S.custom, ...custom };
    await DB.set('custom', S.custom);
    await DB.putWorkouts(workouts);
    const ids = new Set(workouts.map((w) => w.id));
    S.workouts = [...S.workouts.filter((w) => !ids.has(w.id)), ...workouts].sort(byStart);
    UI.hevy = null;
    toast(`Imported ${workouts.length} Hevy workouts`);
    location.hash = '#progress';
  },
  jsonImport: async () => {
    const o = UI.json;
    if (!o) return;
    if (Array.isArray(o.workouts) && o.workouts.length) {
      await DB.putWorkouts(o.workouts);
      const ids = new Set(o.workouts.map((w) => w.id));
      S.workouts = [...S.workouts.filter((w) => !ids.has(w.id)), ...o.workouts].sort(byStart);
    }
    if (o.coachTargets) { S.coach = { ...S.coach, ...o.coachTargets }; await DB.set('coach', S.coach); }
    if (o.customExercises) { S.custom = { ...S.custom, ...o.customExercises }; await DB.set('custom', S.custom); }
    if (o.program && Array.isArray(o.program.phases)) { S.program = o.program; await DB.set('program', S.program); }
    if (o.settings) { S.settings = { ...S.settings, ...o.settings }; await saveSettings(); }
    if (o.state) { S.state = { ...S.state, ...o.state }; await DB.set('state', S.state); }
    UI.json = null; closeSheet();
    toast('Imported');
    if (o.hevyCsv) { UI.hevy = readHevy(o.hevyCsv); location.hash = '#import'; render(); } else { location.hash = '#history'; }
  },
  clearCoach: async (el) => { delete S.coach[el.dataset.v]; await DB.set('coach', S.coach); render(); },
  saveProgram: async () => {
    try {
      const p = JSON.parse(document.getElementById('progjson').value);
      if (!Array.isArray(p.phases) || !p.phases.every((ph) => ph.id && ph.days && Array.isArray(ph.rotation))) throw new Error('Needs phases with id, rotation and days');
      for (const ph of p.phases) for (const k of ph.rotation) if (!ph.days[k]) throw new Error(`Phase ${ph.id}: missing day ${k}`);
      S.program = p; await DB.set('program', p); toast('Program saved'); render();
    } catch (e) { toast(`Not saved: ${e.message}`, 5000); }
  },
  resetProgram: async () => {
    if (!confirm('Reset the program to the default? Your workout history is kept.')) return;
    S.program = clone(DEFAULT_PROGRAM); await DB.del('program'); toast('Program reset'); render();
  },
  saveEquip: async () => {
    const nums = (id) => document.getElementById(id).value.split(/[,\s]+/).map(Number).filter((n) => n > 0).sort((a, b) => a - b);
    const plates = {};
    for (const part of document.getElementById('plates').value.split(',')) {
      const m = /([\d.]+)\s*[x×*]\s*(\d+)/i.exec(part);
      if (m) plates[+m[1]] = +m[2];
    }
    const db = nums('dbw'), kb = nums('kbw');
    const bar = parseFloat(document.getElementById('bar').value), rest = parseInt(document.getElementById('restd').value, 10);
    if (!db.length || !Object.keys(plates).length || !(bar > 0) || !(rest > 0)) { toast('Check the equipment fields'); return; }
    Object.assign(S.settings, { dbWeights: db, kbWeights: kb, plates, bar, restDefault: rest });
    await saveSettings(); toast('Equipment saved'); render();
  },
  notify: async () => { try { await Notification.requestPermission(); } catch { /* ignore */ } render(); },
  testAlert: () => { unlockAudio(); setTimeout(() => { buzz([400, 150, 400]); beep(); }, 150); },
  wipe: async () => {
    if (!confirm('Delete ALL Beam Lift data on this phone? Export a backup first.')) return;
    if (!confirm('Really delete everything? This cannot be undone.')) return;
    await DB.clearAll(); location.hash = '#today'; location.reload();
  },
};

// ---------- events ----------
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const f = A[el.dataset.act];
  if (!f) return;
  e.preventDefault();
  Promise.resolve(f(el, e)).catch((err) => { console.error(err); toast(`Something went wrong: ${err.message}`, 5000); });
});
document.addEventListener('change', (e) => {
  const el = e.target;
  if (el.dataset && el.dataset.change === 'halve' && UI.hevy) { UI.hevy.list[+el.dataset.k].halve = el.checked; render(); }
});
document.addEventListener('input', (e) => {
  if (e.target.id === 'ed') edHint();
  if (e.target.id === 'ex-filter') {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('[data-name]').forEach((n) => { n.hidden = q && !n.dataset.name.includes(q); });
  }
});
fileInput.addEventListener('change', async () => {
  const f = fileInput.files && fileInput.files[0];
  if (!f) return;
  try {
    const text = await f.text();
    if (/^\s*\{/.test(text)) {
      const o = JSON.parse(text);
      UI.json = o;
      const parts = [
        Array.isArray(o.workouts) ? `${o.workouts.length} workouts (same IDs are replaced)` : '',
        o.coachTargets ? `coach targets for ${Object.keys(o.coachTargets).length} exercises` : '',
        o.program ? 'a program (replaces your current one)' : '', o.settings ? 'settings' : '',
        o.hevyCsv ? 'Hevy history (you\'ll review it next)' : '',
      ].filter(Boolean);
      openSheet(`<h3>Import ${esc(f.name)}</h3><p>This file contains:</p><ul>${parts.map((p) => `<li>${esc(p)}</li>`).join('') || '<li>nothing recognizable</li>'}</ul>
        <button class="btn primary big" data-act="jsonImport" ${parts.length ? '' : 'disabled'}>Import</button><button class="btn ghost wide" data-act="closeSheet">Cancel</button>`);
    } else {
      UI.hevy = readHevy(text);
      location.hash = '#import'; render();
    }
  } catch (err) { toast(`Couldn't read that file: ${err.message}`, 5000); }
});
document.getElementById('sheet-wrap').addEventListener('click', (e) => { if (e.target.classList.contains('backdrop')) closeSheet(); });
window.addEventListener('hashchange', () => {
  closeSheet(); render();
  const r = route();
  if (r.name === 'workout' && currentIdx() > 0) setTimeout(() => document.querySelector('.ex.cur')?.scrollIntoView({ block: 'start' }), 30);
  else window.scrollTo(0, 0);
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && S.active) { keepAwake(); tick(); }
});

// ---------- boot ----------
async function init() {
  await load();
  DB.persist();
  if (S.active) { scheduleRest(); keepAwake(); }
  render();
  setInterval(tick, 500);
  const local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && !location.search.includes('sw');
  if ('serviceWorker' in navigator && !local) {
    const had = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register('sw.js').then((r) => r.update()).catch(() => {});
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (had) toast('Beam Lift updated — close and reopen to load it', 6000); });
  }
}
init().catch((e) => { view.innerHTML = `<div class="card flag">Beam Lift couldn't start: ${esc(e.message)}</div>`; });
