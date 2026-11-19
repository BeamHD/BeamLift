# Beam Lift — notes for Claude

Personal Hevy-style workout PWA for Beam (Pixel 10 Pro, home gym). Claude acts as developer AND strength coach.
Workflow rule: batch clarifying questions + short plan + explicit OK before building.

## Stack
Vanilla HTML/CSS/JS ES modules, no build step, no dependencies. Data on-device in IndexedDB.
- `js/data.js` — exercise catalog (kinds, muscle/pattern/equipment tags, `rx` defaults, cues, swaps, Hevy name mapping),
  MUSCLES/PATTERNS/METHODS, DEFAULT_PROGRAM (`phase.ramp` caps sets early in a phase), equipment defaults
- `js/engine.js` — progression rules (`suggest`), Epley e1RM, PRs, plate math, rotation
- `js/app.js` — all UI (hash routes, `data-act` click delegation, bottom sheets, rest timer, wake lock)
- `js/hevy.js` — Hevy CSV import (halves two-dumbbell totals; landmine minus 45 lb bar)
- `js/io.js` — JSON backup (with a per-exercise `summary` for Claude) and CSV export
- `sw.js` — offline cache. **Bump `VERSION` in sw.js and `APP_VERSION` in data.js on every deploy.**
  Pre-release: versions are 0.x (0.1 = first deploy). Don't call anything "v1" until Beam says it's a full release.

## Weight conventions
db = per hand · db1 = single DB/KB · bb = total incl. 45 bar · lm = plates added (bar excluded) · bw = added load ·
time: `reps` holds seconds · carry: `reps` holds meters.

## Test locally
Preview config `beamlift` (.claude/launch.json → tools/serve.ps1, port 8765). Service worker is skipped on localhost unless `?sw`.

## Deploy
GitHub Pages from `main` / root → https://beamhd.github.io/BeamLift/ . Public repo: NEVER commit personal data.
`private/` (Hevy CSV, seed/import files, backups) is gitignored.

## Cloud sync (0.2.2+)
`js/sync.js` syncs to a PRIVATE GitHub repo via the contents API (token stays on the phone; public repos are refused).
- `beamlift.json` — written by the app: full backup (same shape as Export) + `deletedWorkouts`, `appliedInbox`.
- `inbox.json` — written by Claude: an import object with a unique `id` (+ optional `message`); applied once per id.
Clone the data repo into `private/data/` (gitignored) to read it; push a new `inbox.json` to send coach updates.

## Reviewing progress / adjusting the program
Beam exports a JSON backup (Settings → Export) and drops it in `private/`. Read `summary` first, then `workouts`.
To push changes back: write a JSON file with any of `coachTargets` ({exId: {weight, reps, note}} — used once, next time),
`program`, `settings`, `workouts`; Beam imports it via Settings → Import.

## Privacy
This repo is public. Health/injury context and training data live in Claude's local memory and `private/`, never here.
Exercise choices and cues in `data.js` already reflect the joint-safety constraints (see local memory for why).
