import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../js/cloud.js', import.meta.url), 'utf8');
const AUTH_KEY = 'zhiwu_auth_v1';

function storageWith(auth) {
  const map = new Map();
  if (auth) map.set(AUTH_KEY, JSON.stringify(auth));
  return {
    raw: map,
    getItem(k) { return map.has(k) ? map.get(k) : null; },
    setItem(k, v) { map.set(k, String(v)); },
    removeItem(k) { map.delete(k); }
  };
}
function response(status, data) {
  return { ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(data) };
}
function loadCloud(fetchImpl, auth) {
  const localStorage = storageWith(auth);
  const window = { APP_CONFIG: { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_ANON_KEY: 'anon' } };
  const context = vm.createContext({ window, localStorage, fetch: fetchImpl, AbortController, setTimeout, clearTimeout, Promise, Date, console });
  vm.runInContext(source, context);
  return { cloud: window.Cloud, localStorage };
}

const expiredAuth = { access_token: 'old-token', refresh_token: 'r1', email: 'a@example.com', uid: 'u1', expires_at: 1 };
const refreshed = loadCloud(async (url, opts) => {
  if (url.includes('grant_type=refresh_token')) return response(200, { access_token: 'new-token', refresh_token: 'r2', expires_in: 3600, user: { id: 'u1', email: 'a@example.com' } });
  if (url.endsWith('/auth/v1/user')) return response(200, { id: 'u1', email: 'a@example.com' });
  throw new Error('unexpected request ' + url);
}, expiredAuth);
const session = await refreshed.cloud.ensureSession();
assert.equal(session.token, 'new-token');
const saved = JSON.parse(refreshed.localStorage.getItem(AUTH_KEY));
assert.equal(saved.access_token, 'new-token');
assert.equal(saved.refresh_token, 'r2');
assert.equal(saved.uid, 'u1');

const offline = loadCloud(async () => { throw new TypeError('fetch failed'); }, { ...expiredAuth, expires_at: Math.floor(Date.now() / 1000) + 3600 });
const offlineSession = await offline.cloud.ensureSession();
assert.equal(offlineSession.offline, true);
assert.ok(offline.localStorage.getItem(AUTH_KEY), 'network failures must not erase the saved session');

const invalid = loadCloud(async (url) => {
  if (url.includes('grant_type=refresh_token')) return response(400, { error_description: 'Invalid Refresh Token' });
  return response(401, { message: 'JWT expired' });
}, expiredAuth);
const invalidSession = await invalid.cloud.ensureSession();
assert.equal(invalidSession, null);
assert.equal(invalid.localStorage.getItem(AUTH_KEY), null);

console.log('cloud session tests: ok');