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
//
// Exercise tags (used by the weekly balance card and the workout generator):
//   prim / sec  muscle groups worked (a set counts 1 for each primary, 0.5 for each secondary)
//   pat         movement pattern, eq  equipment needed, rx  default [sets, lo, hi], rest (s)
//   joints      joints the lift loads (pain check-ins on these trigger back-offs)
//   idea        one line used when the exercise is suggested as a new idea
//   rehab       only picked by the generator when a joint feels off

export const APP_VERSION = '0.2.1';

export const DEFAULT_SETTINGS = {
  restDefault: 90,
  dbWeights: [5, 7.5, 10, 12.5, 15, 17.5, 20, 22.5, 25, 30, 35, 40, 45, 50, 52.5],
  kbWeights: [5, 10, 15, 20, 40],
  plates: { 45: 2, 35: 2, 25: 2, 15: 2, 10: 2 },
  bar: 45,
  videoLinks: {},
  bwGoal: null, // [low, high] lb, set in the app
  ssSwitch: 15, // seconds to move between the two exercises of a superset
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

export const MUSCLES = {
  chest: 'Chest', back: 'Back', delts: 'Shoulders', rear: 'Rear delts', biceps: 'Biceps', triceps: 'Triceps',
  quads: 'Quads', hams: 'Hamstrings', glutes: 'Glutes', calves: 'Calves', core: 'Core', lowback: 'Low back',
};

export const PATTERNS = {
  squat: 'Squat', lunge: 'Single-leg', hip: 'Hip extension', hpush: 'Push', apush: 'Angled press',
  hpull: 'Row', vpull: 'Pull-up', iso: 'Isolation', carry: 'Carry', core: 'Core',
};

export const EQUIPMENT = {
  db: 'Dumbbells', kb: 'Kettlebells', bb: 'Barbell', rack: 'Rack', bench: 'Bench', trx: 'TRX',
  lm: 'Landmine', hyper: 'Hyperextension bench', bar: 'Pull-up bar',
};

export const EXERCISES = {
  'goblet-box-squat': {
    name: 'Goblet box squat', kind: 'db1', joints: ['knee', 'back'],
    prim: ['quads', 'glutes'], sec: ['core'], pat: 'squat', eq: ['db', 'bench'], rx: [2, 8, 12], start: 35,
    cue: 'DB at your chest. Sit back to the box, knees track over your 2nd toe, stand tall without rocking.',
    swap: 'a higher box, or straight-leg raises if the knee is irritated', how: 'goblet box squat form',
  },
  'goblet-squat': {
    name: 'Goblet squat', kind: 'db1', joints: ['knee', 'back'], hevy: ['Goblet Squat', 'Kettlebell Goblet Squat'],
    prim: ['quads', 'glutes'], sec: ['core'], pat: 'squat', eq: ['db'], rx: [3, 8, 12], start: 40,
    cue: 'Elbows inside knees, chest tall, sit between your heels. Only as deep as the knee stays quiet.',
    swap: 'goblet box squat', how: 'goblet squat form',
  },
  'low-incline-db-press': {
    name: 'Low-incline DB press', kind: 'db', joints: ['shoulder'], hevy: ['Incline Bench Press (Dumbbell)'],
    prim: ['chest'], sec: ['delts', 'triceps'], pat: 'hpush', eq: ['db', 'bench'], rx: [3, 10, 14], start: 35,
    cue: 'Bench at ~15–30°. Shoulder blades pinned, elbows ~45°, stop just above the chest — no deep stretch.',
    swap: 'DB floor press', how: 'low incline dumbbell press form',
  },
  'cs-db-row': {
    name: 'Chest-supported DB row', kind: 'db', joints: ['back', 'shoulder'], hevy: ['Chest Supported Incline Row (Dumbbell)'],
    prim: ['back'], sec: ['rear', 'biceps'], pat: 'hpull', eq: ['db', 'bench'], rx: [3, 10, 14], start: 35,
    cue: 'Chest on the incline bench. Pull elbows toward your hips, pause, lower slowly.',
    swap: 'TRX row', how: 'chest supported dumbbell row form',
  },
  'dead-bug': {
    name: 'Dead bug', kind: 'bw', perSide: true, joints: ['back'], hevy: ['Dead Bug'],
    prim: ['core'], pat: 'core', eq: [], rx: [2, 8, 12],
    cue: 'Low back pressed into the floor. Reach opposite arm and leg slowly, exhale fully.',
    swap: 'bent-knee dead bug', how: 'dead bug exercise form',
  },
  'hyperextension': {
    name: 'Hyperextension (easy)', kind: 'bw', joints: ['back'],
    hevy: ['Back Extension (Hyperextension)', 'Back Extension (Weighted Hyperextension)'],
    prim: ['lowback', 'glutes'], sec: ['hams'], pat: 'hip', eq: ['hyper'], rx: [2, 10, 14],
    cue: 'Hinge at the hips, rise to a straight line and stop — never arch past neutral. Smooth, no swinging.',
    swap: 'bird dog', how: 'hyperextension bench back extension form',
  },
  'supported-split-squat': {
    name: 'Supported split squat', kind: 'db1', perSide: true, joints: ['knee'],
    prim: ['quads', 'glutes'], pat: 'lunge', eq: ['db', 'rack'], rx: [2, 8, 12], start: 20,
    cue: 'One hand on the rack, weight in the other. Knee tracks over the 2nd toe, lower under control, front heel down.',
    swap: 'goblet box squat (higher box)', how: 'supported split squat form',
  },
  'landmine-press': {
    name: 'Half-kneeling landmine press', kind: 'lm', perSide: true, joints: ['shoulder'],
    hevy: ['Single Arm Landmine Press (Barbell)'],
    prim: ['delts'], sec: ['chest', 'triceps', 'core'], pat: 'apush', eq: ['lm'], rx: [2, 8, 12], start: 15,
    cue: 'Kneel on the pressing-arm side. Ribs down, glute squeezed, press up and forward — not overhead.',
    swap: 'push-up', how: 'half kneeling landmine press form',
  },
  'trx-row': {
    name: 'TRX row', kind: 'bw', joints: ['shoulder', 'back'], hevy: ['Low Row (Suspension)'],
    prim: ['back'], sec: ['rear', 'biceps', 'core'], pat: 'hpull', eq: ['trx'], rx: [2, 10, 14],
    cue: 'Body in a straight plank. Walk feet forward to make it harder. Squeeze shoulder blades at the top.',
    swap: 'chest-supported DB row', how: 'TRX row form',
  },
  'side-plank': {
    name: 'Side plank', kind: 'time', perSide: true, joints: ['shoulder', 'back'], hevy: ['Side Plank'],
    prim: ['core'], pat: 'core', eq: [], rx: [2, 20, 30],
    cue: 'Elbow under shoulder, hips high, body in one line. Knees-down version is fine.',
    swap: 'knee side plank', how: 'side plank form',
  },
  'bench-press': {
    name: 'Bench press', kind: 'bb', joints: ['shoulder'], hevy: ['Bench Press (Barbell)'],
    prim: ['chest'], sec: ['triceps', 'delts'], pat: 'hpush', eq: ['bb', 'rack', 'bench'], rx: [3, 8, 10], rest: 120, start: 95,
    cue: 'Safeties set! Shoulder blades back & down, elbows ~45°, touch low chest under control. Stop if a shoulder shifts.',
    swap: 'DB floor press', how: 'bench press form shoulder safe',
  },
  'close-grip-bench': {
    name: 'Close-grip bench', kind: 'bb', joints: ['shoulder'], hevy: ['Bench Press - Close Grip (Barbell)'],
    prim: ['triceps'], sec: ['chest', 'delts'], pat: 'hpush', eq: ['bb', 'rack', 'bench'], rx: [2, 10, 12], start: 75,
    cue: 'Hands just inside shoulder width, elbows tucked, safeties set.',
    swap: 'neutral-grip DB floor press', how: 'close grip bench press form',
  },
  'lateral-raise': {
    name: 'DB lateral raise', kind: 'db', joints: ['shoulder'], hevy: ['Lateral Raise (Dumbbell)'],
    prim: ['delts'], pat: 'iso', eq: ['db'], rx: [2, 12, 16], start: 10,
    cue: 'Raise to shoulder height ONLY — never overhead. Slight lean, lead with elbows.',
    swap: 'partial-range raise (to 45°)', how: 'dumbbell lateral raise form',
  },
  'calf-raise': {
    name: 'Calf raise', kind: 'db', joints: [], hevy: ['Standing Calf Raise (Dumbbell)'],
    prim: ['calves'], pat: 'iso', eq: ['db'], rx: [3, 12, 16], start: 30,
    cue: 'Full stretch at the bottom, pause at the top. Hold the rack for balance if needed.',
    swap: 'single-leg calf raise', how: 'dumbbell standing calf raise form',
  },
  'straight-leg-raise': {
    name: 'Straight-leg raise', kind: 'bw', perSide: true, joints: ['knee'], rehab: true,
    prim: [], sec: ['quads', 'core'], pat: 'iso', eq: [], rx: [2, 10, 14],
    cue: 'Other knee bent. Tighten the quad first, lift to the height of the bent knee, lower slowly.',
    swap: 'short-arc quad extension', how: 'straight leg raise physical therapy',
  },
  'pull-up': {
    name: 'Pull-up (assisted)', kind: 'bw', joints: ['shoulder'], hevy: ['Pull Up'],
    prim: ['back'], sec: ['biceps', 'core'], pat: 'vpull', eq: ['bar'], rx: [3, 5, 10], rest: 120,
    cue: 'Start feet- or TRX-assisted. No dead hang: keep a slight bend and shoulders engaged at the bottom. Stop 2 reps short.',
    swap: 'TRX row', how: 'feet assisted pull up',
  },
  'reverse-fly': {
    name: 'Reverse fly (chest-supported)', kind: 'db', joints: ['shoulder'], hevy: ['Chest Supported Reverse Fly (Dumbbell)'],
    prim: ['rear'], sec: ['back'], pat: 'iso', eq: ['db', 'bench'], rx: [2, 12, 16], start: 10,
    cue: 'Chest on the incline bench, soft elbows, sweep out to shoulder height, pause.',
    swap: 'TRX reverse fly', how: 'chest supported reverse fly form',
  },
  'hammer-curl': {
    name: 'Hammer curl', kind: 'db', joints: [], hevy: ['Hammer Curl (Dumbbell)'],
    prim: ['biceps'], pat: 'iso', eq: ['db'], rx: [2, 10, 14], start: 20,
    cue: 'Elbows pinned at your sides, neutral grip, no swinging.',
    swap: 'cross-body hammer curl', how: 'hammer curl form',
  },
  'farmer-carry': {
    name: 'Farmer carry', kind: 'carry', joints: ['back'], hevy: ['Farmers Walk'],
    prim: ['core'], sec: ['back', 'glutes'], pat: 'carry', eq: ['db'], rx: [2, 30, 30], start: 40,
    cue: 'Tall posture, shoulders packed, short quick steps.',
    swap: 'suitcase carry (lighter)', how: 'farmer carry form',
  },
  'db-floor-press': {
    name: 'DB floor press', kind: 'db', joints: ['shoulder'], hevy: ['Floor Press (Dumbbell)'],
    prim: ['chest'], sec: ['triceps', 'delts'], pat: 'hpush', eq: ['db'], rx: [3, 10, 14], start: 30,
    cue: 'Lie on the floor, elbows ~45°, pause when the triceps touch the floor.',
    swap: 'push-up', how: 'dumbbell floor press form',
  },
  'push-up': {
    name: 'Push-up', kind: 'bw', joints: ['shoulder'], hevy: ['Push Up'],
    prim: ['chest'], sec: ['triceps', 'delts', 'core'], pat: 'hpush', eq: [], rx: [2, 8, 15],
    cue: 'Body straight, hands under shoulders, elbows ~45°. Elevate hands to make it easier.',
    swap: 'incline push-up', how: 'push up form',
  },
  'glute-bridge': {
    name: 'Glute bridge', kind: 'bw', joints: ['back'], hevy: ['Glute Bridge'],
    prim: ['glutes'], sec: ['hams'], pat: 'hip', eq: [], rx: [2, 12, 16],
    cue: 'Ribs down, drive through heels, squeeze glutes — no low-back arch.',
    swap: 'dead bug', how: 'glute bridge form',
  },

  // ---------- added in 0.2: TRX ----------
  'trx-ham-curl': {
    name: 'TRX hamstring curl', kind: 'bw', joints: ['knee', 'back'], hevy: ['TRX Hamstring Curl'],
    prim: ['hams'], sec: ['glutes', 'core'], pat: 'hip', eq: ['trx'], rx: [2, 8, 12],
    cue: 'On your back, heels in the foot cradles ~1 ft off the floor. Bridge your hips up, curl heels toward your glutes, keep hips high, extend slowly. Harder: one leg. Easier: hips down between reps.',
    swap: 'glute bridge', how: 'TRX hamstring curl form',
    idea: 'Hamstrings without any deadlift — a bridge and a leg curl in one.',
  },
  'trx-chest-press': {
    name: 'TRX chest press', kind: 'bw', joints: ['shoulder'],
    prim: ['chest'], sec: ['triceps', 'delts', 'core'], pat: 'hpush', eq: ['trx'], rx: [2, 10, 15],
    cue: 'Facing away from the anchor in a plank. Lower until your hands are beside your chest — stop there, no deep stretch. Step feet back to make it easier.',
    swap: 'push-up', how: 'TRX chest press form',
    idea: 'Pressing where you choose the depth — easy on the shoulders.',
  },
  'trx-face-pull': {
    name: 'TRX face pull', kind: 'bw', joints: ['shoulder'], hevy: ['TRX Face Pull'],
    prim: ['rear'], sec: ['back'], pat: 'hpull', eq: ['trx'], rx: [2, 12, 16],
    cue: 'Palms down, pull your hands toward your forehead with elbows at shoulder height (not above). Squeeze shoulder blades, lower slowly.',
    swap: 'reverse fly', how: 'TRX face pull form',
    idea: 'Rear delts and upper back — cheap insurance for shoulder health.',
  },
  'trx-tw': {
    name: 'TRX T & W raise', kind: 'bw', joints: ['shoulder'], hevy: ['TRX Y-T-W'],
    prim: ['rear'], sec: ['back'], pat: 'iso', eq: ['trx'], rx: [2, 8, 12],
    cue: 'Lean back, arms straight. T: open your arms to shoulder height. W: elbows bent, squeeze shoulder blades down and back. Skip the Y — it goes overhead.',
    swap: 'reverse fly', how: 'TRX T W raise',
    idea: 'Shoulder-blade control without going overhead.',
  },
  'trx-reverse-fly': {
    name: 'TRX reverse fly', kind: 'bw', joints: ['shoulder'], hevy: ['TRX Reverse fly'],
    prim: ['rear'], sec: ['back'], pat: 'iso', eq: ['trx'], rx: [2, 10, 15],
    cue: 'Soft elbows, open your arms wide to shoulder height, pause, return slowly. Walk your feet back to make it easier.',
    swap: 'reverse fly (chest-supported)', how: 'TRX reverse fly form',
  },
  'trx-curl': {
    name: 'TRX biceps curl', kind: 'bw', joints: [], hevy: ['Bicep Curl (Suspension)'],
    prim: ['biceps'], pat: 'iso', eq: ['trx'], rx: [2, 10, 15],
    cue: 'Palms up, elbows at shoulder height and fixed. Curl your hands toward your forehead; walk your feet forward to make it harder.',
    swap: 'hammer curl', how: 'TRX bicep curl form',
  },
  'trx-triceps': {
    name: 'TRX triceps extension', kind: 'bw', joints: ['shoulder'], hevy: ['Triceps Extension (Suspension)'],
    prim: ['triceps'], pat: 'iso', eq: ['trx'], rx: [2, 10, 15],
    cue: 'Facing away, arms straight forward at shoulder height. Bend only the elbows to bring your hands toward your forehead, then press back. Elbows stay at shoulder height — not overhead.',
    swap: 'triceps kickback', how: 'TRX triceps extension form',
  },
  'trx-squat': {
    name: 'TRX-assisted squat', kind: 'bw', joints: ['knee'],
    prim: ['quads', 'glutes'], pat: 'squat', eq: ['trx'], rx: [2, 10, 15],
    cue: 'Hold the handles, sit back between your heels only as deep as the knee stays quiet. Use the straps as much as you need.',
    swap: 'goblet box squat', how: 'TRX assisted squat',
    idea: 'Knee-friendly squat practice — the straps take as much load as you need.',
  },
  'trx-lunge': {
    name: 'TRX-assisted reverse lunge', kind: 'bw', perSide: true, joints: ['knee'],
    prim: ['quads', 'glutes'], pat: 'lunge', eq: ['trx'], rx: [2, 8, 12],
    cue: 'Hold the handles, step back and lower until the back knee nearly touches. Front knee tracks over the 2nd toe; push through the front heel.',
    swap: 'supported split squat', how: 'TRX reverse lunge',
  },
  'trx-pallof': {
    name: 'TRX Pallof press', kind: 'bw', perSide: true, joints: [],
    prim: ['core'], pat: 'core', eq: ['trx'], rx: [2, 8, 12],
    cue: 'Stand side-on to the anchor, both hands on the handles at your chest, lean slightly away. Press straight out, hold 2 s, don\'t let your torso turn.',
    swap: 'side plank', how: 'TRX pallof press',
    idea: 'Anti-rotation core work — bracing the back-friendly way.',
  },
  'trx-body-saw': {
    name: 'TRX body saw', kind: 'bw', joints: ['shoulder', 'back'],
    prim: ['core'], pat: 'core', eq: ['trx'], rx: [2, 6, 10],
    cue: 'Forearm plank with feet in the cradles. Rock a few inches forward and back from the shoulders — stop if your low back sags.',
    swap: 'plank', how: 'TRX body saw',
    idea: 'A plank that fights back — big core work, no crunching.',
  },

  // ---------- added in 0.2: rack, landmine, DB, KB, floor ----------
  'inverted-row': {
    name: 'Inverted row (rack)', kind: 'bw', joints: ['shoulder'], hevy: ['Inverted Row'],
    prim: ['back'], sec: ['rear', 'biceps', 'core'], pat: 'hpull', eq: ['rack', 'bb'], rx: [2, 8, 12],
    cue: 'Bar in the rack at hip height. Body straight heels-to-head, pull your chest to the bar, squeeze, lower slowly. Raise the bar to make it easier.',
    swap: 'TRX row', how: 'inverted row form',
    idea: 'A row you scale by moving the bar — no back strain.',
  },
  'pin-press': {
    name: 'Pin press (rack)', kind: 'bb', joints: ['shoulder'],
    prim: ['chest'], sec: ['triceps', 'delts'], pat: 'hpush', eq: ['bb', 'rack', 'bench'], rx: [3, 6, 10], rest: 120, start: 95,
    cue: 'Bench in the rack, safeties set so the bar rests 2–3 in above your chest. Press from a dead stop, lower back to the pins softly. The pins cap the depth for your shoulders.',
    swap: 'DB floor press', how: 'bench pin press',
    idea: 'Bench pressing with the risky bottom range taken out.',
  },
  'incline-push-up': {
    name: 'Incline push-up (rack bar)', kind: 'bw', joints: ['shoulder'], hevy: ['Incline Push Ups'],
    prim: ['chest'], sec: ['triceps', 'delts', 'core'], pat: 'hpush', eq: ['rack', 'bb'], rx: [2, 10, 15],
    cue: 'Hands on the bar in the rack. Lower the bar a notch to make it harder. Elbows ~45°, chest to the bar.',
    swap: 'push-up', how: 'incline push up on barbell',
  },
  'landmine-squat': {
    name: 'Landmine squat', kind: 'lm', joints: ['knee', 'back'],
    prim: ['quads', 'glutes'], sec: ['core'], pat: 'squat', eq: ['lm'], rx: [2, 8, 12], start: 10,
    cue: 'Hold the sleeve at your chest with both hands, lean into it slightly, sit between your heels and drive up. The angle keeps your torso upright.',
    swap: 'goblet squat', how: 'landmine squat form',
    idea: 'Squats with the bar guiding you — upright torso, kind to the back.',
  },
  'landmine-lunge': {
    name: 'Landmine reverse lunge', kind: 'lm', perSide: true, joints: ['knee'],
    prim: ['quads', 'glutes'], pat: 'lunge', eq: ['lm'], rx: [2, 8, 12], start: 0,
    cue: 'Sleeve at your chest (or in the hand on the stepping side). Step back, lower under control, front knee over the 2nd toe.',
    swap: 'supported split squat', how: 'landmine reverse lunge',
  },
  'db-row': {
    name: 'One-arm DB row (bench)', kind: 'db1', perSide: true, joints: ['back', 'shoulder'], hevy: ['Dumbbell Row'],
    prim: ['back'], sec: ['rear', 'biceps'], pat: 'hpull', eq: ['db', 'bench'], rx: [2, 10, 14], start: 35,
    cue: 'Hand and knee on the bench, back flat. Pull the DB toward your hip, pause, lower slowly. If the low back complains, use the chest-supported row.',
    swap: 'chest-supported DB row', how: 'one arm dumbbell row form',
  },
  'db-curl': {
    name: 'DB biceps curl', kind: 'db', joints: [], hevy: ['Bicep Curl (Dumbbell)'],
    prim: ['biceps'], pat: 'iso', eq: ['db'], rx: [2, 10, 14], start: 20,
    cue: 'Elbows at your sides, palms up, no swinging. Lower slowly.',
    swap: 'hammer curl', how: 'dumbbell bicep curl form',
  },
  'spider-curl': {
    name: 'Spider curl', kind: 'db', joints: [], hevy: ['Spider Curl (Dumbbell)'],
    prim: ['biceps'], pat: 'iso', eq: ['db', 'bench'], rx: [2, 10, 14], start: 15,
    cue: 'Chest on the incline bench, arms hanging straight down. Curl without moving the elbows, squeeze at the top.',
    swap: 'DB biceps curl', how: 'spider curl form',
  },
  'db-kickback': {
    name: 'Triceps kickback (supported)', kind: 'db', joints: [], hevy: ['Triceps Kickback (Dumbbell)'],
    prim: ['triceps'], pat: 'iso', eq: ['db', 'bench'], rx: [2, 12, 16], start: 10,
    cue: 'Chest on the incline bench. Upper arms parallel to the floor; straighten the elbows fully and squeeze.',
    swap: 'TRX triceps extension', how: 'chest supported triceps kickback',
  },
  'db-skullcrusher': {
    name: 'DB lying triceps extension', kind: 'db', joints: ['shoulder'], hevy: ['Skullcrusher (Dumbbell)'],
    prim: ['triceps'], pat: 'iso', eq: ['db', 'bench'], rx: [2, 10, 14], start: 15,
    cue: 'Lie on the bench, arms pointing at the ceiling, neutral grip. Bend only the elbows to lower the DBs beside your head. Upper arms stay vertical — don\'t let them drift overhead.',
    swap: 'triceps kickback', how: 'dumbbell lying triceps extension neutral grip',
  },
  'step-up': {
    name: 'DB step-up (low box)', kind: 'db', perSide: true, joints: ['knee'], hevy: ['Dumbbell Step Up'],
    prim: ['quads', 'glutes'], pat: 'lunge', eq: ['db', 'bench'], rx: [2, 8, 12], start: 15,
    cue: 'Knee-height or lower. Whole foot on the box, drive through the heel, knee over the 2nd toe; lower slowly. Don\'t push off the back foot.',
    swap: 'supported split squat', how: 'dumbbell step up form',
  },
  'db-shrug': {
    name: 'DB shrug', kind: 'db', joints: [], hevy: ['Shrug (Dumbbell)'],
    prim: ['back'], pat: 'iso', eq: ['db'], rx: [2, 12, 16], start: 40,
    cue: 'Straight up toward your ears, pause 1 s, lower fully. No rolling.',
    swap: 'farmer carry', how: 'dumbbell shrug form',
  },
  'seated-calf-raise': {
    name: 'Seated calf raise', kind: 'db1', joints: [],
    prim: ['calves'], pat: 'iso', eq: ['db', 'bench'], rx: [2, 15, 20], start: 35,
    cue: 'Sit on the bench, balls of your feet on a plate, DB across your knees. Full stretch, pause at the top.',
    swap: 'calf raise', how: 'seated dumbbell calf raise',
  },
  'single-leg-calf': {
    name: 'Single-leg calf raise', kind: 'bw', perSide: true, joints: [],
    prim: ['calves'], pat: 'iso', eq: [], rx: [2, 10, 15],
    cue: 'One foot on a plate edge, hold the rack. Full stretch, pause at the top. Hold a DB to add load.',
    swap: 'calf raise', how: 'single leg calf raise form',
  },
  'tib-raise': {
    name: 'Tibialis raise', kind: 'bw', joints: [],
    prim: ['calves'], pat: 'iso', eq: [], rx: [2, 15, 25],
    cue: 'Back against a wall, heels ~1 ft out. Lift your toes as high as you can, lower slowly. Burning shins = working.',
    swap: 'calf raise', how: 'tibialis raise against wall',
    idea: 'Front-of-shin strength — a classic knee-friendly add-on.',
  },
  'wall-sit': {
    name: 'Wall sit', kind: 'time', joints: ['knee'],
    prim: ['quads'], pat: 'squat', eq: [], rx: [2, 30, 45],
    cue: 'Back flat on the wall, slide down only as far as the knee stays quiet — it doesn\'t need to be 90°. Breathe.',
    swap: 'straight-leg raise', how: 'wall sit form',
    idea: 'Quads without moving the knee — isometrics are knee-friendly.',
  },
  'side-lying-abduction': {
    name: 'Side-lying leg raise', kind: 'bw', perSide: true, joints: [],
    prim: ['glutes'], pat: 'iso', eq: [], rx: [2, 12, 20],
    cue: 'Lie on your side, bottom knee bent. Lift the top leg slightly behind you, toes forward, to ~30°. Slow, no rolling back.',
    swap: 'glute bridge', how: 'side lying hip abduction',
    idea: 'Trains the glute muscle that stops a knee drifting inward.',
  },
  'single-leg-bridge': {
    name: 'Single-leg glute bridge', kind: 'bw', perSide: true, joints: ['back'],
    prim: ['glutes'], sec: ['hams'], pat: 'hip', eq: [], rx: [2, 8, 12],
    cue: 'One foot planted, the other leg straight. Drive through the heel, hips level, no low-back arch.',
    swap: 'glute bridge', how: 'single leg glute bridge',
  },
  'reverse-hyper': {
    name: 'Bench reverse hyper', kind: 'bw', joints: ['back'],
    prim: ['glutes'], sec: ['hams', 'lowback'], pat: 'hip', eq: ['bench'], rx: [2, 10, 15],
    cue: 'Face down on the bench, hips at the edge, hold on. Lift straight legs to body level — not higher — squeeze glutes, lower slowly.',
    swap: 'glute bridge', how: 'reverse hyper on bench',
    idea: 'Glutes and hamstrings with your spine unloaded.',
  },
  'bird-dog': {
    name: 'Bird dog', kind: 'bw', perSide: true, joints: ['back'],
    prim: ['core'], sec: ['lowback', 'glutes'], pat: 'core', eq: [], rx: [2, 6, 10],
    cue: 'On hands and knees, reach the opposite arm and leg long, pause 2 s, hips level. Don\'t arch.',
    swap: 'dead bug', how: 'bird dog exercise form',
  },
  'plank': {
    name: 'Plank', kind: 'time', joints: ['shoulder', 'back'], hevy: ['Plank'],
    prim: ['core'], pat: 'core', eq: [], rx: [2, 30, 45],
    cue: 'Elbows under shoulders, squeeze glutes, ribs down. Stop when your hips sag.',
    swap: 'dead bug', how: 'plank form',
  },
  'suitcase-carry': {
    name: 'Suitcase carry', kind: 'carry', perSide: true, joints: ['back'],
    prim: ['core'], sec: ['back'], pat: 'carry', eq: ['kb', 'db'], rx: [2, 30, 30], start: 20,
    cue: 'One weight at your side. Walk tall without leaning toward it; switch hands each length.',
    swap: 'farmer carry', how: 'suitcase carry form',
    idea: 'One-sided carry — your obliques stop you tipping over.',
  },
  'bottoms-up-carry': {
    name: 'Bottoms-up KB carry', kind: 'carry', perSide: true, joints: ['shoulder'],
    prim: ['delts'], sec: ['core'], pat: 'carry', eq: ['kb'], rx: [2, 20, 20], start: 5,
    cue: 'Light kettlebell held upside down by the handle, elbow at 90° in front of you, wrist straight. Walk slowly — the wobble trains the shoulder stabilizers.',
    swap: 'suitcase carry', how: 'bottoms up kettlebell carry',
    idea: 'Shoulder-stability work at low load — the wobble does the training.',
  },
};

// Training methods the generator can attach to an accessory (0.2.1). `ramp: false` = not during ramp-up.
export const METHODS = {
  tempo: { name: '3-1-1 tempo', text: '3 s down, 1 s pause, 1 s up. Use ~10–15% less weight.', kinds: ['db', 'db1', 'bb', 'lm', 'kb', 'bw'], ramp: true },
  pause: { name: 'Paused reps', text: 'Pause 2 s at the hardest point of every rep.', kinds: ['db', 'db1', 'bb', 'lm', 'kb', 'bw'], ramp: true },
  quarter: { name: '1¼ reps', text: 'Lower, come up a quarter, lower again, then all the way up = 1 rep.', kinds: ['db', 'db1', 'bw'], pats: ['hpush', 'hpull', 'hip'], ramp: true },
  iso: { name: 'Isometric finisher', text: 'After the last set, hold the hardest position for 15–20 s.', kinds: ['db', 'db1', 'bw', 'lm'], ramp: true },
  dropTrx: { name: 'TRX angle drop', text: 'Last set: at 2 reps from failure, step to an easier angle and do 5 more.', eq: 'trx', ramp: false },
  restPause: { name: 'Rest-pause', text: 'Last set: rest 15 s, then 3–5 more reps.', kinds: ['db', 'db1', 'bw', 'lm'], ramp: false },
};

// The program. Edit freely (Settings → Program JSON).
// item: ex, sets, reps [lo, hi] (seconds for time, meters for carry), start (lb, used when there is no
// recent history), rest (s, default 90), main (kept in the 30-min version), warmups [[fraction, reps]].
// phase.ramp: { sessions, sets } caps sets per exercise for the first N sessions of that phase.
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
            { ex: 'trx-ham-curl', sets: 2, reps: [8, 12] },
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
      ramp: { sessions: 6, sets: 2 },
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
            { ex: 'trx-ham-curl', sets: 3, reps: [8, 12], main: true },
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
