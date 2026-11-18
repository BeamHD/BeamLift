// Beam Lift — Hevy CSV import.
// Hevy logged two-dumbbell lifts as the TOTAL of both dumbbells; those are halved to per-hand on import.
// Landmine numbers in Hevy were bar + plates; the 45 lb bar is subtracted so only plates added remain.
import { EXERCISES } from './data.js';

export const HEVY_HALVE = [
  'Incline Bench Press (Dumbbell)', 'Lateral Raise (Dumbbell)', 'Hammer Curl (Dumbbell)', 'Front Raise (Dumbbell)',
  'Bicep Curl (Dumbbell)', 'Bulgarian Split Squat', 'Romanian Deadlift (Dumbbell)', 'Chest Supported Reverse Fly (Dumbbell)',
  'Standing Calf Raise (Dumbbell)', 'Seated Incline Curl (Dumbbell)', 'Triceps Kickback (Dumbbell)',
  'Chest Supported Incline Row (Dumbbell)', 'Dumbbell Step Up', 'Shrug (Dumbbell)', 'Bent Over Row (Dumbbell)',
  'Cross Body Hammer Curl', 'Shoulder Press (Dumbbell)', 'Spider Curl (Dumbbell)', 'Overhead Press (Dumbbell)',
  'Bench Press (Dumbbell)', 'Incline Chest Fly (Dumbbell)', 'Floor Press (Dumbbell)', 'Seated Overhead Press (Dumbbell)',
  'Skullcrusher (Dumbbell)', 'Split Squat (Dumbbell)',
];
export const HEVY_LANDMINE = ['Single Arm Landmine Press (Barbell)', 'Landmine Row', 'Landmine Squat and Press'];

const MONTHS = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
const num = (v) => (v === '' || v == null || isNaN(+v) ? null : +v);
export const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function parseCSV(text) {
  text = text.replace(/^﻿/, '');
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(f); rows.push(row); row = []; f = '';
    } else f += c;
  }
  if (f !== '' || row.length) { row.push(f); rows.push(row); }
  return rows.filter((r) => r.length > 1 || r[0] !== '');
}

function parseDate(s) {
  const m = /(\d{1,2}) (\w{3}) (\d{4}),? (\d{1,2}):(\d{2})/.exec(s || '');
  if (m && m[2] in MONTHS) return new Date(+m[3], MONTHS[m[2]], +m[1], +m[4], +m[5]);
  const d = new Date(s);
  return isNaN(d) ? null : d;
}

const HEVY_INDEX = (() => {
  const m = {};
  for (const [id, ex] of Object.entries(EXERCISES)) (ex.hevy || []).forEach((n) => { m[n] = id; });
  return m;
})();
export const mapName = (n) => HEVY_INDEX[n] || null;

export function readHevy(text) {
  const rows = parseCSV(text);
  const head = rows.shift().map((h) => h.trim());
  if (!head.includes('exercise_title') || !head.includes('start_time')) throw new Error('This is not a Hevy workout export.');
  const recs = rows.map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] ?? '').trim()])));
  const names = new Map();
  for (const r of recs) {
    const e = names.get(r.exercise_title) || { name: r.exercise_title, sets: 0, maxW: 0, rows: [] };
    e.sets++; e.maxW = Math.max(e.maxW, num(r.weight_lbs) || 0); e.rows.push(r);
    names.set(r.exercise_title, e);
  }
  const list = [...names.values()].sort((a, b) => b.sets - a.sets).map((e) => ({
    name: e.name, sets: e.sets, maxW: e.maxW, rows: e.rows,
    halve: HEVY_HALVE.includes(e.name), landmine: HEVY_LANDMINE.includes(e.name), mapped: mapName(e.name),
  }));
  const dates = recs.map((r) => parseDate(r.start_time)).filter(Boolean).sort((a, b) => a - b);
  return {
    recs, list,
    workouts: new Set(recs.map((r) => `${r.start_time}|${r.title}`)).size,
    first: dates[0] || null, last: dates[dates.length - 1] || null,
  };
}

function inferKind(e, halve) {
  const n = e.name;
  if (/landmine/i.test(n)) return 'lm';
  if (/farmer/i.test(n)) return 'carry';
  if (/kettlebell/i.test(n)) return 'kb';
  const hasReps = e.rows.some((r) => num(r.reps) > 0);
  const hasDur = e.rows.some((r) => num(r.duration_seconds) > 0);
  const hasW = e.rows.some((r) => num(r.weight_lbs) > 0);
  if (!hasReps && hasDur) return 'time';
  if (halve) return 'db';
  if (/\(barbell\)/i.test(n)) return 'bb';
  if (/dumbbell/i.test(n)) return 'db1';
  if (hasW) return 'db1';
  return 'bw';
}

// halveSet: Set of Hevy names whose weights are two-dumbbell totals.
export function convertHevy(parsed, halveSet) {
  const custom = {};
  const kinds = {};
  for (const e of parsed.list) {
    const id = e.mapped || `h-${slug(e.name)}`;
    const kind = e.mapped ? EXERCISES[e.mapped].kind : inferKind(e, halveSet.has(e.name));
    kinds[e.name] = { id, kind };
    if (!e.mapped) custom[id] = { name: e.name, kind, joints: [], hevy: [e.name], custom: true, how: `${e.name} form` };
  }
  const byW = new Map();
  for (const r of parsed.recs) {
    const n = r.exercise_title;
    const { id: exId, kind } = kinds[n];
    const key = `${r.start_time}|${r.title}`;
    let w = byW.get(key);
    if (!w) {
      const st = parseDate(r.start_time), en = parseDate(r.end_time);
      w = {
        id: `hevy-${st ? st.toISOString() : slug(key)}`, title: r.title, source: 'hevy',
        start: (st || new Date(0)).toISOString(), end: en ? en.toISOString() : null,
        note: r.description || '', phase: null, day: null, exercises: [],
      };
      byW.set(key, w);
    }
    let en = w.exercises[w.exercises.length - 1];
    if (!en || en.hevyName !== n) {
      const ex = EXERCISES[exId] || custom[exId];
      en = {
        exId, name: ex.name, kind, perSide: !!ex.perSide, hevyName: n,
        sets: [], effort: null, pain: null, stopped: null, note: r.exercise_notes || '', superset: r.superset_id || null,
      };
      w.exercises.push(en);
    }
    let weight = num(r.weight_lbs);
    if (weight != null && halveSet.has(n)) weight /= 2;
    if (weight != null && HEVY_LANDMINE.includes(n)) weight = Math.max(0, weight - 45);
    let reps = num(r.reps);
    if (kind === 'time') reps = num(r.duration_seconds) ?? reps;
    if (kind === 'carry') { const mi = num(r.distance_miles); reps = mi != null ? Math.round(mi * 1609.34) : reps; }
    const set = { type: r.set_type === 'warmup' ? 'warmup' : 'normal', weight, reps, done: true };
    if (r.set_type && !['normal', 'warmup'].includes(r.set_type)) set.hevyType = r.set_type;
    const rpe = num(r.rpe);
    if (rpe != null) { set.rpe = rpe; en.effort = Math.max(en.effort || 0, rpe); }
    en.sets.push(set);
  }
  const workouts = [...byW.values()].sort((a, b) => (a.start < b.start ? -1 : 1));
  return { workouts, custom };
}
