// Beam Lift — export (JSON backup + CSV) and file sharing.
import { APP_VERSION, KIND_LABEL } from './data.js';
import { series, bests, fmt, maxPain, workSets } from './engine.js';

// Full backup. `summary` is a compact per-exercise digest meant for Claude to read.
export function buildBackup(S, getEx) {
  const ids = new Set();
  S.workouts.forEach((w) => w.exercises.forEach((e) => ids.add(e.exId)));
  const summary = [...ids].map((id) => {
    const pts = series(id, S.workouts);
    if (!pts.length) return null;
    const b = bests(pts);
    const ex = getEx(id);
    const recent = pts.slice(-6).map((p) => ({
      date: p.date.slice(0, 10), best: `${fmt(p.best.weight)}x${p.best.reps}`, e1rm: Math.round(p.e1rm),
      effort: p.effort ?? null, pain: p.pain ? maxPain(p.pain) : null, stopped: p.stopped || null,
    }));
    return { exercise: ex.name, id, unit: KIND_LABEL[ex.kind] || '', sessions: pts.length, last: pts[pts.length - 1].date.slice(0, 10), bestE1rm: Math.round(b.e1rm), heaviest: b.maxW, recent };
  }).filter(Boolean).sort((a, b) => (a.last < b.last ? 1 : -1));
  return {
    app: 'beamlift', schema: 1, version: APP_VERSION, exportedAt: new Date().toISOString(),
    notes: 'Weights in lb. db = per hand; bb = total incl. 45 bar; lm = plates added; time "reps" = seconds; carry "reps" = meters. e1RM = Epley.',
    settings: S.settings, program: S.program, state: S.state, coachTargets: S.coach, customExercises: S.custom,
    summary, workouts: S.workouts,
  };
}

const csvCell = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function buildCSV(S) {
  const head = ['date', 'workout', 'phase', 'day', 'exercise', 'kind', 'unit', 'set', 'set_type', 'weight_lb', 'reps', 'seconds', 'meters', 'effort', 'pain_knee', 'pain_shoulder', 'pain_back', 'stopped', 'note'];
  const lines = [head.join(',')];
  for (const w of S.workouts) {
    for (const en of w.exercises) {
      const sets = en.sets.length ? en.sets : [{ type: 'none' }];
      sets.forEach((s, i) => {
        const timed = en.kind === 'time', carry = en.kind === 'carry';
        lines.push([
          w.start, w.title, w.phase || '', w.day || '', en.name, en.kind, KIND_LABEL[en.kind] || '', i + 1, s.type,
          s.weight ?? '', timed || carry ? '' : s.reps ?? '', timed ? s.reps ?? '' : '', carry ? s.reps ?? '' : '',
          en.effort ?? '', en.pain?.knee ?? '', en.pain?.shoulder ?? '', en.pain?.back ?? '', en.stopped || '', en.note || '',
        ].map(csvCell).join(','));
      });
    }
  }
  return lines.join('\n');
}

export async function shareOrDownload(name, text, mime) {
  const blob = new Blob([text], { type: mime });
  try {
    const file = new File([blob], name, { type: 'text/plain' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: name });
      return 'shared';
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return 'cancelled';
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  return 'downloaded';
}

export { workSets };
