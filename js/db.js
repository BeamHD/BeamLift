// Beam Lift — tiny IndexedDB wrapper. Stores: kv (settings, program, state, coach, custom, active), workouts.
const NAME = 'beamlift';
let dbp;

function open() {
  if (!dbp) {
    dbp = new Promise((res, rej) => {
      const r = indexedDB.open(NAME, 1);
      r.onupgradeneeded = () => {
        const d = r.result;
        if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv');
        if (!d.objectStoreNames.contains('workouts')) d.createObjectStore('workouts', { keyPath: 'id' });
      };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  }
  return dbp;
}

function run(store, mode, fn) {
  return open().then((d) => new Promise((res, rej) => {
    const t = d.transaction(store, mode);
    const req = fn(t.objectStore(store));
    t.oncomplete = () => res(req && 'result' in req ? req.result : undefined);
    t.onerror = () => rej(t.error);
    t.onabort = () => rej(t.error);
  }));
}

export const get = (k) => run('kv', 'readonly', (s) => s.get(k));
export const set = (k, v) => run('kv', 'readwrite', (s) => s.put(v, k));
export const del = (k) => run('kv', 'readwrite', (s) => s.delete(k));
export const allWorkouts = () => run('workouts', 'readonly', (s) => s.getAll());
export const putWorkout = (w) => run('workouts', 'readwrite', (s) => s.put(w));
export const putWorkouts = (ws) => run('workouts', 'readwrite', (s) => { ws.forEach((w) => s.put(w)); return null; });
export const delWorkout = (id) => run('workouts', 'readwrite', (s) => s.delete(id));
export const clearAll = () => Promise.all([
  run('kv', 'readwrite', (s) => s.clear()),
  run('workouts', 'readwrite', (s) => s.clear()),
]);

export async function persist() {
  try { return navigator.storage && navigator.storage.persist ? await navigator.storage.persist() : false; } catch { return false; }
}
