// Beam Lift — exercise catalog, default program, default settings.
// Weight conventions (kind):
//   db    two dumbbells, weight = lb PER HAND (volume counts both hands)
//   db1   one dumbbell / kettlebell held, weight = that implement
//   bb    barbell, weight = TOTAL incl. the 45 lb bar
//   lm    landmine, weight = PLATES ADDED to the sleeve (bar not counted)
//   kb    kettlebell
//   bw    bodyweight reps (weight = optional added load)
//   time  timed hold, "reps" field holds SECONDS
//   carry loaded carry, weight per hand, "reps" field holds METERS

export const APP_VERSION = '1.0.0';

export const DEFAULT_SETTINGS = {
  restDefault: 90,
  dbWeights: [5, 7.5, 10, 12.5, 15, 17.5, 20, 22.5, 25, 30, 35, 40, 45, 50, 52.5],
  kbWeights: [5, 10, 15, 20, 40],
  plates: { 45: 2, 35: 2, 25: 2, 15: 2, 10: 2 },
  bar: 45,
  videoLinks: {},
};

export const KIND_LABEL = {
  db: 'lb per hand',
  db1: 'lb (one DB/KB)',
  bb: 'lb total incl. 45 bar',
  lm: 'lb of plates added',
  kb: 'lb kettlebell',
  bw: 'bodyweight',
  time: 'seconds',
  carry: 'lb per hand · meters',
};

export const EXERCISES = {
  'goblet-box-squat': {
    name: 'Goblet box squat', kind: 'db1', joints: ['knee', 'back'],
    cue: 'DB at your chest. Sit back to the box, knees track over your 2nd toe, stand tall without rocking.',
    swap: 'a higher box, or straight-leg raises if the knee is irritated', how: 'goblet box squat form',
  },
  'goblet-squat': {
    name: 'Goblet squat', kind: 'db1', joints: ['knee', 'back'], hevy: ['Goblet Squat', 'Kettlebell Goblet Squat'],
    cue: 'Elbows inside knees, chest tall, sit between your heels. Only as deep as the knee stays quiet.',
    swap: 'goblet box squat', how: 'goblet squat form',
  },
  'low-incline-db-press': {
    name: 'Low-incline DB press', kind: 'db', joints: ['shoulder'], hevy: ['Incline Bench Press (Dumbbell)'],
    cue: 'Bench at ~15–30°. Shoulder blades pinned, elbows ~45°, stop just above the chest — no deep stretch.',
    swap: 'DB floor press', how: 'low incline dumbbell press form',
  },
  'cs-db-row': {
    name: 'Chest-supported DB row', kind: 'db', joints: ['back', 'shoulder'], hevy: ['Chest Supported Incline Row (Dumbbell)'],
    cue: 'Chest on the incline bench. Pull elbows toward your hips, pause, lower slowly.',
    swap: 'TRX row', how: 'chest supported dumbbell row form',
  },
  'dead-bug': {
    name: 'Dead bug', kind: 'bw', perSide: true, joints: ['back'], hevy: ['Dead Bug'],
    cue: 'Low back pressed into the floor. Reach opposite arm and leg slowly, exhale fully.',
    swap: 'bent-knee dead bug', how: 'dead bug exercise form',
  },
  'hyperextension': {
    name: 'Hyperextension (easy)', kind: 'bw', joints: ['back'],
    hevy: ['Back Extension (Hyperextension)', 'Back Extension (Weighted Hyperextension)'],
    cue: 'Hinge at the hips, rise to a straight line and stop — never arch past neutral. Smooth, no swinging.',
    swap: 'bird dog', how: 'hyperextension bench back extension form',
  },
  'supported-split-squat': {
    name: 'Supported split squat', kind: 'db1', perSide: true, joints: ['knee'],
    cue: 'One hand on the rack, weight in the other. Knee tracks over the 2nd toe, lower under control, front heel down.',
    swap: 'goblet box squat (higher box)', how: 'supported split squat form',
  },
  'landmine-press': {
    name: 'Half-kneeling landmine press', kind: 'lm', perSide: true, joints: ['shoulder'],
    hevy: ['Single Arm Landmine Press (Barbell)'],
    cue: 'Kneel on the pressing-arm side. Ribs down, glute squeezed, press up and forward — not overhead.',
    swap: 'push-up', how: 'half kneeling landmine press form',
  },
  'trx-row': {
    name: 'TRX row', kind: 'bw', joints: ['shoulder', 'back'], hevy: ['Low Row (Suspension)'],
    cue: 'Body in a straight plank. Walk feet forward to make it harder. Squeeze shoulder blades at the top.',
    swap: 'chest-supported DB row', how: 'TRX row form',
  },
  'side-plank': {
    name: 'Side plank', kind: 'time', perSide: true, joints: ['shoulder', 'back'], hevy: ['Side Plank'],
    cue: 'Elbow under shoulder, hips high, body in one line. Knees-down version is fine.',
    swap: 'knee side plank', how: 'side plank form',
  },
  'bench-press': {
    name: 'Bench press', kind: 'bb', joints: ['shoulder'], hevy: ['Bench Press (Barbell)'],
    cue: 'Safeties set! Shoulder blades back & down, elbows ~45°, touch low chest under control. Stop if a shoulder shifts.',
    swap: 'DB floor press', how: 'bench press form shoulder safe',
  },
  'close-grip-bench': {
    name: 'Close-grip bench', kind: 'bb', joints: ['shoulder'], hevy: ['Bench Press - Close Grip (Barbell)'],
    cue: 'Hands just inside shoulder width, elbows tucked, safeties set.',
    swap: 'neutral-grip DB floor press', how: 'close grip bench press form',
  },
  'lateral-raise': {
    name: 'DB lateral raise', kind: 'db', joints: ['shoulder'], hevy: ['Lateral Raise (Dumbbell)'],
    cue: 'Raise to shoulder height ONLY — never overhead. Slight lean, lead with elbows.',
    swap: 'partial-range raise (to 45°)', how: 'dumbbell lateral raise form',
  },
  'calf-raise': {
    name: 'Calf raise', kind: 'db', joints: [], hevy: ['Standing Calf Raise (Dumbbell)'],
    cue: 'Full stretch at the bottom, pause at the top. Hold the rack for balance if needed.',
    swap: 'single-leg calf raise', how: 'dumbbell standing calf raise form',
  },
  'straight-leg-raise': {
    name: 'Straight-leg raise', kind: 'bw', perSide: true, joints: ['knee'],
    cue: 'Other knee bent. Tighten the quad first, lift to the height of the bent knee, lower slowly.',
    swap: 'short-arc quad extension', how: 'straight leg raise physical therapy',
  },
  'pull-up': {
    name: 'Pull-up (assisted)', kind: 'bw', joints: ['shoulder'], hevy: ['Pull Up'],
    cue: 'Start feet- or TRX-assisted. No dead hang: keep a slight bend and shoulders engaged at the bottom. Stop 2 reps short.',
    swap: 'TRX row', how: 'feet assisted pull up',
  },
  'reverse-fly': {
    name: 'Reverse fly (chest-supported)', kind: 'db', joints: ['shoulder'], hevy: ['Chest Supported Reverse Fly (Dumbbell)'],
    cue: 'Chest on the incline bench, soft elbows, sweep out to shoulder height, pause.',
    swap: 'TRX Y-T-W', how: 'chest supported reverse fly form',
  },
  'hammer-curl': {
    name: 'Hammer curl', kind: 'db', joints: [], hevy: ['Hammer Curl (Dumbbell)'],
    cue: 'Elbows pinned at your sides, neutral grip, no swinging.',
    swap: 'cross-body hammer curl', how: 'hammer curl form',
  },
  'farmer-carry': {
    name: 'Farmer carry', kind: 'carry', joints: ['back'], hevy: ['Farmers Walk'],
    cue: 'Tall posture, shoulders packed, short quick steps.',
    swap: 'suitcase hold (lighter)', how: 'farmer carry form',
  },
  'db-floor-press': {
    name: 'DB floor press', kind: 'db', joints: ['shoulder'], hevy: ['Floor Press (Dumbbell)'],
    cue: 'Lie on the floor, elbows ~45°, pause when the triceps touch the floor.',
    swap: 'push-up', how: 'dumbbell floor press form',
  },
  'push-up': {
    name: 'Push-up', kind: 'bw', joints: ['shoulder'], hevy: ['Push Up'],
    cue: 'Body straight, hands under shoulders, elbows ~45°. Elevate hands to make it easier.',
    swap: 'incline push-up', how: 'push up form',
  },
  'glute-bridge': {
    name: 'Glute bridge', kind: 'bw', joints: ['back'], hevy: ['Glute Bridge'],
    cue: 'Ribs down, drive through heels, squeeze glutes — no low-back arch.',
    swap: 'dead bug', how: 'glute bridge form',
  },
};

// The program. Edit freely (Settings → Program JSON).
// item: ex, sets, reps [lo, hi] (seconds for time, meters for carry), start (lb, used when there is no
// recent history), rest (s, default 90), main (kept in the 30-min version), warmups [[fraction, reps]].
export const DEFAULT_PROGRAM = {
  schema: 1,
  phases: [
    {
      id: 'p1', name: 'Weeks 1–2 · Full body A/B', sessions: 6, rotation: ['A', 'B'],
      days: {
        A: {
          name: 'Session A', items: [
            { ex: 'goblet-box-squat', sets: 2, reps: [8, 12], start: 35, main: true },
            { ex: 'low-incline-db-press', sets: 2, reps: [10, 14], start: 35, main: true },
            { ex: 'cs-db-row', sets: 2, reps: [10, 14], start: 35, main: true },
            { ex: 'dead-bug', sets: 2, reps: [6, 10] },
          ],
        },
        B: {
          name: 'Session B', items: [
            { ex: 'hyperextension', sets: 2, reps: [10, 14] },
            { ex: 'supported-split-squat', sets: 2, reps: [8, 12], start: 20, main: true },
            { ex: 'landmine-press', sets: 2, reps: [8, 12], start: 15, main: true },
            { ex: 'trx-row', sets: 2, reps: [10, 14], main: true },
            { ex: 'side-plank', sets: 2, reps: [20, 30] },
          ],
        },
      },
    },
    {
      id: 'p2', name: 'Weeks 3–6 · Push / Legs / Pull', sessions: 12, rotation: ['Push', 'Legs', 'Pull'],
      days: {
        Push: {
          name: 'Push', items: [
            { ex: 'bench-press', sets: 3, reps: [8, 10], start: 95, rest: 120, main: true, warmups: [[0, 10], [0.6, 5], [0.8, 3]] },
            { ex: 'low-incline-db-press', sets: 3, reps: [10, 14], main: true },
            { ex: 'landmine-press', sets: 2, reps: [8, 12] },
            { ex: 'lateral-raise', sets: 2, reps: [12, 16], start: 10 },
            { ex: 'close-grip-bench', sets: 2, reps: [10, 12], start: 75 },
          ],
        },
        Legs: {
          name: 'Legs', items: [
            { ex: 'hyperextension', sets: 1, reps: [10, 10], fixed: true, note: 'Warm-up — keep it easy' },
            { ex: 'goblet-squat', sets: 3, reps: [8, 12], start: 40, rest: 120, main: true, warmups: [[0.5, 8]] },
            { ex: 'supported-split-squat', sets: 2, reps: [8, 12], main: true },
            { ex: 'calf-raise', sets: 3, reps: [12, 16], start: 30 },
            { ex: 'straight-leg-raise', sets: 2, reps: [10, 14] },
            { ex: 'dead-bug', sets: 2, reps: [8, 12] },
          ],
        },
        Pull: {
          name: 'Pull', items: [
            { ex: 'pull-up', sets: 3, reps: [5, 10], rest: 120, main: true, note: 'Stop 2 reps short of failure' },
            { ex: 'cs-db-row', sets: 3, reps: [10, 14], rest: 120, main: true },
            { ex: 'reverse-fly', sets: 2, reps: [12, 16], start: 10 },
            { ex: 'hammer-curl', sets: 2, reps: [10, 14], start: 20 },
            { ex: 'farmer-carry', sets: 2, reps: [30, 30], start: 40 },
          ],
        },
      },
    },
  ],
};
