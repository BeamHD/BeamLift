// Beam Lift — coaching engine: suggestions, progression rules, e1RM, PRs, plate math, rotation.
// e1RM uses EPLEY: weight × (1 + reps / 30). Sets above 12 reps are flagged lower-confidence.

export const DAY = 864e5;
export const WEIGHTED = ['db', 'db1', 'bb', 'lm', 'kb', 'carry'];
export const isWeighted = (k) => WEIGHTED.includes(k);
export const fmt = (n) => (n == null || n === '' ? '' : String(Math.round(n * 10) / 10));
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export function e1rm(w, r) {
  if (!w || !r || r < 1) return 0;
  return r === 1 ? w : w * (1 + r / 30);
}

// ---------- equipment ----------
function plateList(plates, perSide) {
  const out = [];
  for (const [p, c] of Object.entries(plates || {})) {
    const n = perSide ? Math.floor(c / 2) : c;
    for (let i = 0; i < n; i++) out.push(+p);
  }
  return out.sort((a, b) => b - a);
}
const comboCache = new Map();
function combos(list) {
  const key = list.join(',');
  if (comboCache.has(key)) return comboCache.get(key);
  let m = new Map([[0, []]]);
  for (const p of list) {
    const next = new Map(m);
    for (const [s, c] of m) {
      const ns = s + p, cand = [...c, p];
      if (!next.has(ns) || next.get(ns).length > cand.length) next.set(ns, cand);
    }
    m = next;
  }
  comboCache.set(key, m);
  return m;
}

export function allowed(kind, st) {
  if (kind === 'db' || kind === 'db1' || kind === 'carry') return [...st.dbWeights].sort((a, b) => a - b);
  if (kind === 'kb') return [...st.kbWeights].sort((a, b) => a - b);
  if (kind === 'bb') return [...combos(plateList(st.plates, true)).keys()].map((s) => st.bar + 2 * s).sort((a, b) => a - b);
  if (kind === 'lm') return [...combos(plateList(st.plates, false)).keys()].sort((a, b) => a - b);
  return null;
}

export function plateMath(kind, w, st) {
  if (w == null) return '';
  if (kind === 'bb') {
    const c = combos(plateList(st.plates, true)).get((w - st.bar) / 2);
    if (!c) return `Can't load ${fmt(w)} with your plates`;
    return c.length ? `${st.bar} bar + ${c.join(' + ')} each side` : `Empty ${st.bar} lb bar`;
  }
  if (kind === 'lm') {
    const c = combos(plateList(st.plates, false)).get(w);
    if (!c) return `Can't make ${fmt(w)} with your plates`;
    return c.length ? `Load ${c.join(' + ')} on the landmine` : 'Bar only';
  }
  return '';
}

export function stepWeight(kind, w, dir, st) {
  const a = allowed(kind, st);
  w = w || 0;
  if (!a) return Math.max(0, w + dir * 5);
  if (dir > 0) return a.find((x) => x > w + 1e-9) ?? a[a.length - 1];
  const lower = a.filter((x) => x < w - 1e-9);
  return lower.length ? lower[lower.length - 1] : a[0];
}

export function roundDown(kind, w, st) {
  const a = allowed(kind, st);
  if (!a || w == null) return w;
  const l = a.filter((x) => x <= w + 1e-9);
  return l.length ? l[l.length - 1] : a[0];
}

// ---------- history ----------
export const workSets = (entry) => (entry.sets || []).filter((s) => s.done && s.type !== 'warmup');

export function lastEntry(exId, workouts) {
  for (let i = workouts.length - 1; i >= 0; i--) {
    const e = workouts[i].exercises.find((x) => x.exId === exId && (workSets(x).length || x.stopped));
    if (e) return { w: workouts[i], e };
  }
  return null;
}

export const maxPain = (p) => (p ? Math.max(p.knee || 0, p.shoulder || 0, p.back || 0) : 0);

// ---------- progression rules ----------
// Progress: every set hit the top of the range at effort ≤7 and pain ≤2 → next increment.
// Hold: effort 8–9 or pain 3–4. Back off: pain ≥5, pain worse since last time, or a Stop → −15–20% / swap.
export function suggest(item, ex, ctx) {
  const [lo, hi] = item.reps;
  const kind = ex.kind;
  const wt = isWeighted(kind);
  const out = (weight, reps, decision, note) => ({ weight: weight ?? null, reps, decision, note });
  const ct = ctx.coach && ctx.coach[item.ex];
  if (ct) return out(ct.weight, ct.reps ?? lo, 'coach', ct.note || 'Coach target');

  const last = lastPlain(item.ex, ctx.workouts);
  if (!last) {
    if (!wt) return out(item.start, lo, 'start', `Bodyweight — aim for ${lo}${kind === 'time' ? ' s' : ' reps'} at an easy-moderate effort`);
    return out(item.start, lo, 'start', item.start != null ? 'Starting weight — adjust after set 1 if it feels off' : 'First time — pick a comfortable start');
  }
  const ws = workSets(last.e);
  const lw = ws.length ? Math.max(...ws.map((s) => s.weight || 0)) || null : null;
  const top = ws.filter((s) => (s.weight || 0) === (lw || 0));
  const rmin = top.length ? Math.min(...top.map((s) => s.reps || 0)) : lo;
  const effort = last.e.effort;
  const pain = maxPain(last.e.pain);
  const gap = (ctx.now - new Date(last.w.start)) / DAY;
  const worse = (ex.joints || []).filter((j) => ctx.worse && ctx.worse[j]);
  const less = (f) => (wt && lw ? roundDown(kind, lw * f, ctx.st) : lw);
  const swap = ex.swap ? ` Or swap to ${ex.swap}.` : '';

  if (gap > 28) {
    const w = item.start ?? less(0.8);
    return out(w, lo, 'return', `Last done ${Math.round(gap)} days ago — easing back in`);
  }
  if (last.e.stopped) return out(less(0.8), lo, 'backoff', `Stopped last time (${last.e.stopped}) → back off ~20%.${swap}`);
  if (pain >= 5 || worse.length) {
    const why = worse.length ? `${cap(worse.join(' & '))} worse since last time` : `Pain ${pain}/10 last time`;
    return out(less(0.85), lo, 'backoff', `${why} → back off ~15%.${swap}`);
  }
  if ((effort ?? 0) >= 8 || pain >= 3) {
    const why = [(effort ?? 0) >= 8 ? `effort ${effort}` : '', pain >= 3 ? `pain ${pain}` : ''].filter(Boolean).join(', ');
    return out(lw, Math.min(rmin, hi), 'hold', `Hold (${why}) — repeat last time`);
  }
  if (item.fixed) return out(lw, lo, 'hold', item.note || 'Keep it easy');

  const e = effort ?? 7;
  const allTop = ws.length > 0 && ws.every((s) => (s.reps || 0) >= hi);
  if (allTop) {
    if (!wt) {
      if (kind === 'time') return out(lw, rmin + 5, 'progress', `Held ${rmin}s every set → +5 s`);
      return out(lw, rmin + 1, 'progress', `Top of range at effort ${e} → +1 rep, or slow the tempo`);
    }
    const nw = stepWeight(kind, lw, +1, ctx.st);
    if (nw <= lw) return out(lw, rmin + 1, 'progress', 'Heaviest setting reached → add reps or slow the tempo');
    if ((kind === 'bb' || kind === 'lm') && nw - lw > 10 && rmin < hi + 3) {
      return out(lw, rmin + 1, 'progress', `Next loadable jump is +${fmt(nw - lw)} lb — earn it with +1 rep first (2.5/5 lb plates would help)`);
    }
    return out(nw, lo, 'progress', `All sets hit ${hi} at effort ${e} → +${fmt(nw - lw)} lb`);
  }
  const target = Math.min(rmin + (kind === 'time' || kind === 'carry' ? 5 : 1), hi);
  const what = wt ? 'Same weight' : 'Bodyweight';
  return out(lw, target, 'build', `${what} — aim for ${target}${kind === 'time' ? ' s' : kind === 'carry' ? ' m' : ' reps'}`);
}

// ---------- program rotation ----------
export function currentPhase(program, state) {
  return program.phases.find((p) => p.id === state.phase) || program.phases[0];
}
export function nextDay(program, state, workouts) {
  const phase = currentPhase(program, state);
  const inPhase = workouts.filter((w) => w.phase === phase.id && w.day);
  const last = inPhase[inPhase.length - 1];
  const idx = last ? (phase.rotation.indexOf(last.day) + 1) % phase.rotation.length : 0;
  return { phase, day: phase.rotation[idx], done: inPhase.length };
}

export function findItem(program, exId, phaseId) {
  const order = [...program.phases].sort((a, b) => (a.id === phaseId ? -1 : b.id === phaseId ? 1 : 0));
  for (const p of order) for (const d of Object.values(p.days)) {
    const it = d.items.find((i) => i.ex === exId);
    if (it) return it;
  }
  return null;
}

// ---------- stats / PRs ----------
export function setVolume(s, kind, perSide) {
  if (!isWeighted(kind) || kind === 'carry') return 0;
  return (s.weight || 0) * (s.reps || 0) * (kind === 'db' ? 2 : 1) * (perSide ? 2 : 1);
}
export function workoutVolume(w) {
  let v = 0;
  for (const en of w.exercises) for (const s of workSets(en)) v += setVolume(s, en.kind, en.perSide);
  return Math.round(v);
}

// One point per session for an exercise.
export function series(exId, workouts) {
  const pts = [];
  for (const w of workouts) {
    for (const en of w.exercises) {
      if (en.exId !== exId) continue;
      const ws = workSets(en);
      if (!ws.length) continue;
      let best = null;
      for (const s of ws) {
        const e = e1rm(s.weight, s.reps);
        if (!best || e > best.e || (e === best.e && (s.reps || 0) > (best.s.reps || 0))) best = { e, s };
      }
      pts.push({
        t: new Date(w.start).getTime(), date: w.start, wid: w.id,
        e1rm: best.e, best: best.s, low: (best.s.reps || 0) > 12,
        maxW: Math.max(...ws.map((s) => s.weight || 0)),
        maxReps: Math.max(...ws.map((s) => s.reps || 0)),
        volume: ws.reduce((a, s) => a + setVolume(s, en.kind, en.perSide), 0),
        kind: en.kind, sets: ws, effort: en.effort, pain: en.pain, stopped: en.stopped,
      });
    }
  }
  return pts;
}

export function bests(pts) {
  const b = { e1rm: 0, maxW: 0, maxReps: 0, volume: 0 };
  for (const p of pts) {
    b.e1rm = Math.max(b.e1rm, p.e1rm); b.maxW = Math.max(b.maxW, p.maxW);
    b.maxReps = Math.max(b.maxReps, p.maxReps); b.volume = Math.max(b.volume, p.volume);
  }
  return b;
}

// PRs set by workout `w` compared with everything before it.
export function prsFor(w, workouts) {
  const before = workouts.filter((x) => x.start < w.start && x.id !== w.id);
  const out = [];
  for (const en of w.exercises) {
    const prev = series(en.exId, before);
    if (!prev.length) continue;
    const pb = bests(prev);
    const cur = series(en.exId, [w])[0];
    if (!cur) continue;
    if (isWeighted(en.kind)) {
      if (cur.e1rm > pb.e1rm + 0.01) out.push({ ex: en.name, what: 'Est. 1RM', val: `${fmt(cur.e1rm)} lb` });
      if (cur.maxW > pb.maxW) out.push({ ex: en.name, what: 'Heaviest', val: `${fmt(cur.maxW)} lb` });
      if (cur.volume > pb.volume) out.push({ ex: en.name, what: 'Volume', val: `${Math.round(cur.volume)} lb` });
    } else if (cur.maxReps > pb.maxReps) {
      out.push({ ex: en.name, what: en.kind === 'time' ? 'Longest hold' : 'Most reps', val: `${cur.maxReps}${en.kind === 'time' ? ' s' : ''}` });
    }
  }
  return out;
}

export function weekCount(workouts, now = new Date()) {
  const from = mondayOf(now), to = from + 7 * DAY;
  return workouts.filter((w) => { const t = new Date(w.start).getTime(); return t >= from && t < to; }).length;
}

// Consecutive Mon–Sun weeks (ending this week or last) with ≥3 workouts.
export function streak(workouts, now = new Date()) {
  const monday = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime(); };
  const counts = new Map();
  for (const w of workouts) { const k = monday(w.start); counts.set(k, (counts.get(k) || 0) + 1); }
  let k = monday(now), n = 0;
  if ((counts.get(k) || 0) < 3) k -= 7 * DAY; // current week may still be in progress
  while ((counts.get(k) || 0) >= 3) { n++; k -= 7 * DAY; }
  return n;
}

// ---------- ramp-up ----------
// phase.ramp = { sessions, sets }: for the first `sessions` workouts of the phase, cap sets per exercise.
export function rampInfo(phase, done) {
  const r = phase && phase.ramp;
  if (!r || done >= r.sessions) return null;
  return { sets: r.sets, left: r.sessions - done, of: r.sessions };
}
export function applyRamp(items, ramp) {
  if (!ramp) return items;
  return items.map((it) => ({ ...it, sets: Math.min(it.sets, ramp.sets) }));
}

// ---------- muscle balance ----------
// Each completed work set counts 1 toward every primary muscle and 0.5 toward every secondary.
const GUESS = [
  [/hamstring|leg curl|romanian|rdl|deadlift|good morning/i, ['hams'], ['glutes']],
  [/calf|tibialis/i, ['calves'], []],
  [/squat|lunge|step up|split/i, ['quads', 'glutes'], []],
  [/glute|bridge|thrust|abduct/i, ['glutes'], ['hams']],
  [/back extension|hyperextension|superman/i, ['lowback'], ['glutes']],
  [/face pull|reverse fly|rear delt|y-t-w/i, ['rear'], ['back']],
  [/overhead press|shoulder press|military|arnold/i, ['delts'], ['triceps']],
  [/lateral raise|front raise|upright/i, ['delts'], []],
  [/tricep|skull|kickback|pushdown|dip/i, ['triceps'], []],
  [/curl/i, ['biceps'], []],
  [/row|pull ?up|chin|pulldown|pull-up/i, ['back'], ['biceps']],
  [/shrug/i, ['back'], []],
  [/bench|press|push ?up|fly/i, ['chest'], ['triceps', 'delts']],
  [/plank|crunch|leg raise|dead bug|twist|elbow to knee|shoulder tap|slam|ab |core/i, ['core'], []],
  [/farmer|carry|walk/i, ['core'], ['back']],
];
export function musclesOf(ex) {
  if (ex && (ex.prim || ex.sec)) return { prim: ex.prim || [], sec: ex.sec || [] };
  const n = (ex && ex.name) || '';
  for (const [re, prim, sec] of GUESS) if (re.test(n)) return { prim, sec };
  return { prim: [], sec: [] };
}

export function mondayOf(t) {
  const d = new Date(t); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}

export function muscleSets(workouts, getEx, from, to = Infinity) {
  const out = {};
  for (const w of workouts) {
    const t = new Date(w.start).getTime();
    if (t < from || t >= to) continue;
    for (const en of w.exercises) {
      const n = workSets(en).length;
      if (!n) continue;
      const m = musclesOf(getEx(en.exId));
      for (const k of m.prim) out[k] = (out[k] || 0) + n;
      for (const k of m.sec) out[k] = (out[k] || 0) + n * 0.5;
    }
  }
  return out;
}

// No hard targets: a muscle group is flagged only when it's far behind the rest over the last 3 weeks.
// Low back is never flagged (it's injury-prone and gets indirect work already).
export function balance(workouts, getEx, groups, now = Date.now()) {
  const mon = mondayOf(now);
  const weeks = [3, 2, 1, 0].map((k) => {
    const from = mon - k * 7 * DAY;
    return { from, sets: muscleSets(workouts, getEx, from, from + 7 * DAY), n: workouts.filter((w) => { const t = new Date(w.start).getTime(); return t >= from && t < from + 7 * DAY; }).length };
  });
  const since = now - 21 * DAY;
  const recent = muscleSets(workouts, getEx, since);
  const nRecent = workouts.filter((w) => new Date(w.start).getTime() >= since).length;
  const vals = groups.map((g) => recent[g] || 0).sort((a, b) => a - b);
  const med = vals.length ? (vals[Math.floor((vals.length - 1) / 2)] + vals[Math.ceil((vals.length - 1) / 2)]) / 2 : 0;
  const flagged = [];
  if (nRecent >= 3) {
    for (const g of groups) {
      if (g === 'lowback') continue;
      const v = recent[g] || 0;
      if (v === 0) flagged.push({ g, v, why: 'nothing in 3 weeks' });
      else if (v < 0.35 * med) flagged.push({ g, v, why: `only ${fmt(v)} sets in 3 weeks` });
    }
  }
  return { week: weeks[3].sets, weeks, recent, nRecent, flagged, med };
}

// ---------- workout generator ----------
// pool: { id: ex } (catalog + tagged custom). ctx: { flagged: [muscle], recent: Set(id), liked: Set, disliked: Set,
// joints: [joint] (avoid loading these), rand: () => number }.
const PULLS = ['hpull', 'vpull'], PUSHES = ['hpush', 'apush'], LEGS = ['squat', 'lunge'];
export const REASONS = {
  bored: { label: 'Bored', title: 'remix', hint: 'New accessories — main lifts stay so they keep progressing' },
  short: { label: 'Short on time', title: 'short', hint: 'Main lifts kept, extras paired into supersets' },
  joint: { label: 'Joint feels off', title: 'joint-friendly', hint: 'Swaps out anything that loads it' },
  low: { label: 'Low energy', title: 'easy day', hint: 'Fewer sets — showing up still counts' },
  surprise: { label: 'Surprise me', title: 'surprise', hint: 'Built around what is behind this week' },
};

function usable(id, ex, c, avoid) {
  if (!ex || !ex.pat || avoid.has(id) || c.disliked.has(id)) return false;
  if (ex.rehab && !(c.joints || []).length) return false;
  if ((c.joints || []).some((j) => (ex.joints || []).includes(j))) return false;
  return true;
}
function score(id, ex, c) {
  const flag = (ex.prim || []).filter((m) => c.flagged.includes(m)).length;
  return flag * 3 + (c.liked.has(id) ? 1.5 : 0) - (c.recent.has(id) ? 2.5 : 0) + c.rand() * 1.5;
}
// Best exercise for a slot. slot: { pats: [], prim: [] }. Falls back to same primary muscle, then any pattern match.
export function pickFor(slot, pool, c, avoid = new Set()) {
  const ok = Object.entries(pool).filter(([id, ex]) => usable(id, ex, c, avoid));
  const tiers = [
    ok.filter(([, ex]) => slot.pats.includes(ex.pat) && (!slot.prim || !slot.prim.length || (ex.prim || []).some((m) => slot.prim.includes(m)))),
    ok.filter(([, ex]) => slot.pats.includes(ex.pat)),
    ok.filter(([, ex]) => slot.prim && (ex.prim || []).some((m) => slot.prim.includes(m))),
  ];
  for (const t of tiers) {
    if (!t.length) continue;
    return t.map(([id, ex]) => ({ id, ex, s: score(id, ex, c) })).sort((a, b) => b.s - a.s)[0].id;
  }
  return null;
}
function itemFor(id, ex, base = {}) {
  const rx = ex.rx || [2, 8, 12];
  return { ex: id, sets: base.sets || rx[0], reps: [rx[1], rx[2]], start: ex.start, rest: ex.rest, main: !!base.main };
}
const slotOf = (it, ex) => ({ pats: [ex.pat], prim: ex.prim || [] });

// Pair exercises that don't compete (push + pull, legs + core/arms) into supersets, keeping pairs adjacent.
export function pairUp(items, pool) {
  const pat = (it) => (pool[it.ex] || {}).pat;
  const left = items.map((it) => ({ ...it, ss: null }));
  const out = [];
  let letter = 0;
  const take = (pred, from) => { const k = left.findIndex((x, j) => j !== from && pred(x)); return k; };
  while (left.length) {
    const a = left.shift();
    let k = -1;
    if (PUSHES.includes(pat(a))) k = take((x) => PULLS.includes(pat(x)), -1);
    else if (PULLS.includes(pat(a))) k = take((x) => PUSHES.includes(pat(x)), -1);
    else if (LEGS.includes(pat(a)) || pat(a) === 'hip') k = take((x) => ['core', 'iso', 'carry'].includes(pat(x)), -1);
    else k = take((x) => !LEGS.includes(pat(x)) && pat(x) !== 'hip', -1);
    if (k < 0 && !a.main) k = take(() => true, -1);
    if (k >= 0) {
      const b = left.splice(k, 1)[0];
      const id = String.fromCharCode(97 + letter++);
      out.push({ ...a, ss: id }, { ...b, ss: id });
    } else out.push(a);
  }
  return out;
}

// Build a workout. base = the planned day's items.
export function generate(reason, base, pool, c) {
  const exOf = (it) => pool[it.ex] || {};
  const used = new Set(reason === 'bored' ? base.filter((it) => it.main).map((it) => it.ex) : []);
  const mainSets = Math.max(0, ...base.filter((it) => it.main).map((it) => it.sets)) || 3;
  const accSets = Math.min(2, mainSets);
  let items;
  if (reason === 'surprise') {
    const slots = [
      { pats: LEGS, main: true }, { pats: PUSHES, main: true }, { pats: PULLS, main: true },
      { pats: ['hip'] }, { pats: ['iso', 'carry', 'core', ...LEGS, ...PUSHES, ...PULLS], prim: c.flagged.length ? c.flagged : null, gap: true },
      { pats: ['core'] },
    ];
    items = slots.map((sl) => {
      const id = pickFor(sl, pool, c, used);
      if (!id) return null;
      used.add(id);
      return { ...itemFor(id, pool[id], { main: sl.main, sets: sl.main ? mainSets : accSets }), why: sl.gap && c.flagged.length ? 'for what is behind' : '' };
    }).filter(Boolean);
  } else {
    items = base.map((it) => {
      const ex = exOf(it);
      if (reason === 'low') return { ...it, sets: Math.max(1, it.main ? it.sets - 1 : 1) };
      if (reason === 'short' || (reason === 'bored' && it.main)) return { ...it };
      const loads = (c.joints || []).some((j) => (ex.joints || []).includes(j));
      if (reason === 'joint' && !loads) { used.add(it.ex); return { ...it }; }
      const id = pickFor(slotOf(it, ex), pool, c, new Set([...used, it.ex]));
      if (!id) return reason === 'joint' ? null : { ...it };
      used.add(id);
      return { ...itemFor(id, pool[id], it), why: reason === 'joint' ? `instead of ${ex.name || it.ex}` : '' };
    }).filter(Boolean);
    if (reason === 'low') {
      const acc = items.map((it, k) => (!it.main ? k : -1)).filter((k) => k >= 0);
      if (acc.length > 1) items.splice(acc[acc.length - 1], 1);
    }
    if (reason === 'joint' && c.joints.includes('knee') && !items.some((it) => it.ex === 'straight-leg-raise') && pool['straight-leg-raise']) {
      items.push({ ...itemFor('straight-leg-raise', pool['straight-leg-raise']), why: 'gentle knee work' });
    }
    if (reason === 'short') {
      const extra = items.filter((it) => !it.main);
      const keep = items.filter((it) => it.main).concat(extra.slice(0, 2).map((it) => ({ ...it, sets: Math.min(it.sets, 2) })));
      items = pairUp(keep, pool);
    }
  }
  return items;
}

// Swap one item for something else that trains the same thing (keeps sets, main flag and superset).
export function reroll(item, list, pool, c) {
  const ex = pool[item.ex] || {};
  const avoid = new Set(list.map((x) => x.ex));
  const id = pickFor({ pats: ex.pat ? [ex.pat] : [], prim: ex.prim || [] }, pool, c, avoid);
  if (!id) return null;
  return { ...itemFor(id, pool[id], item), ss: item.ss || null, why: '' };
}

// Most recent entry for an exercise that wasn't done with a special method (tempo, pauses…), for progression.
export function lastPlain(exId, workouts) {
  for (let i = workouts.length - 1; i >= 0; i--) {
    const e = workouts[i].exercises.find((x) => x.exId === exId && !x.method && (workSets(x).length || x.stopped));
    if (e) return { w: workouts[i], e };
  }
  return lastEntry(exId, workouts);
}

// ---------- bodyweight ----------
// entries: [{ date: 'YYYY-MM-DD', lb }]. Trend = trailing 7-day average.
export function bwTrend(entries) {
  const list = [...(entries || [])].sort((a, b) => (a.date < b.date ? -1 : 1));
  return list.map((e, i) => {
    const t = new Date(`${e.date}T12:00:00`).getTime();
    const win = list.slice(0, i + 1).filter((x) => t - new Date(`${x.date}T12:00:00`).getTime() < 7 * DAY);
    return { ...e, t, avg: win.reduce((a, x) => a + x.lb, 0) / win.length };
  });
}

export function formatSet(s, kind, perSide) {
  const ps = perSide ? '/side' : '';
  if (kind === 'time') return `${s.reps ?? '–'} s${ps}`;
  if (kind === 'carry') return `${fmt(s.weight)} × ${s.reps ?? '–'} m`;
  if (kind === 'bw') return s.weight ? `+${fmt(s.weight)} × ${s.reps ?? '–'}${ps}` : `${s.reps ?? '–'} reps${ps}`;
  if (kind === 'lm') return `+${fmt(s.weight)} × ${s.reps ?? '–'}${ps}`;
  return `${fmt(s.weight)} × ${s.reps ?? '–'}${ps}`;
}
