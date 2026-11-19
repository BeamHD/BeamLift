// Beam Lift — cloud sync to a PRIVATE GitHub repo via the contents API.
// The token lives only in this device's IndexedDB (never in exports). Two files in the repo:
//   beamlift.json  full backup written by the app (same shape as Settings → Export, plus sync bookkeeping)
//   inbox.json     written by Claude: an import object with a unique "id"; the app applies each id once
export const FILE = 'beamlift.json';
export const INBOX = 'inbox.json';
const API = 'https://api.github.com';

function b64encode(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
function b64decode(b64) {
  const bin = atob(b64.replace(/\s/g, ''));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

const headers = (cfg, extra = {}) => ({
  Authorization: `Bearer ${cfg.token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...extra,
});

async function fail(r, what) {
  let msg = '';
  try { msg = (await r.json()).message || ''; } catch { /* no body */ }
  const hint = {
    401: 'GitHub rejected the token — it may have expired. Make a new one.',
    403: 'The token can\'t write to that repo — give it Contents: Read and write.',
    404: 'Repo not found — check owner/name, and that the token includes that repo.',
  }[r.status];
  const e = new Error(hint || `${what} failed (${r.status}${msg ? `: ${msg}` : ''})`);
  e.status = r.status;
  throw e;
}

export async function repoInfo(cfg) {
  const r = await fetch(`${API}/repos/${cfg.repo}`, { headers: headers(cfg), cache: 'no-store' });
  if (!r.ok) await fail(r, 'Repo check');
  const j = await r.json();
  return { private: !!j.private, name: j.full_name };
}

export async function readFile(cfg, path) {
  const url = `${API}/repos/${cfg.repo}/contents/${path}`;
  const r = await fetch(url, { headers: headers(cfg), cache: 'no-store' });
  if (r.status === 404) return null;
  if (!r.ok) await fail(r, `Reading ${path}`);
  const j = await r.json();
  if (j.content && j.encoding === 'base64') return { sha: j.sha, text: b64decode(j.content) };
  // Files over 1 MB come back without content — fetch the raw bytes instead.
  const raw = await fetch(url, { headers: headers(cfg, { Accept: 'application/vnd.github.raw+json' }), cache: 'no-store' });
  if (!raw.ok) await fail(raw, `Reading ${path}`);
  return { sha: j.sha, text: await raw.text() };
}

export async function writeFile(cfg, path, text, sha, message) {
  const r = await fetch(`${API}/repos/${cfg.repo}/contents/${path}`, {
    method: 'PUT', headers: headers(cfg, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ message, content: b64encode(text), ...(sha ? { sha } : {}) }),
  });
  if (!r.ok) await fail(r, `Saving ${path}`);
  return (await r.json()).content.sha;
}
