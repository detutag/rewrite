import test from 'node:test';
import assert from 'node:assert/strict';
import { allowedOrigin, rateLimited, guard, tooLong, MAX_CHARS, _resetForTests } from '../functions/lib/guard.js';
import { issueToken, verifyToken, requireAuth } from '../functions/lib/auth.js';
import { onRequest as login } from '../functions/api/auth/login.js';

const req = (origin, ip = '1.2.3.4', extra = {}) => new Request('https://rewrite.trujillomingorance.com/api/rewrite', { method: 'POST', headers: { ...(origin ? { Origin: origin } : {}), 'CF-Connecting-IP': ip, ...extra } });

test('origen: solo trujillomingorance.com y vistas previas de Pages', () => {
  assert.equal(allowedOrigin('https://rewrite.trujillomingorance.com'), 'https://rewrite.trujillomingorance.com');
  assert.equal(allowedOrigin('https://abc.rewrite-ai-azu.pages.dev'), 'https://abc.rewrite-ai-azu.pages.dev');
  assert.equal(allowedOrigin('https://evil.example'), '');
  assert.equal(allowedOrigin('http://rewrite.trujillomingorance.com'), '');
  assert.equal(allowedOrigin('https://trujillomingorance.com.evil.example'), '');
  assert.equal(allowedOrigin(null), '');
});

test('origen: desarrollo local y previsualización de la plataforma', () => {
  assert.equal(allowedOrigin('http://localhost:8788'), 'http://localhost:8788');
  assert.equal(allowedOrigin('http://127.0.0.1:3000'), 'http://127.0.0.1:3000');
  assert.equal(allowedOrigin('https://abc.monkeycode-ai.live'), 'https://abc.monkeycode-ai.live');
  assert.equal(allowedOrigin('http://localhost.evil.example'), '');
});

test('guard: 403 sin origen válido, 429 al pasar el tope (público)', async () => {
  _resetForTests();
  assert.equal((await guard(req(null), {}, {})).status, 403);
  assert.equal((await guard(req('https://evil.example'), {}, {})).status, 403);
  for (let i = 0; i < 30; i++) assert.equal(await guard(req('https://rewrite.trujillomingorance.com', '9.9.9.9'), {}, {}), null);
  const r = await guard(req('https://rewrite.trujillomingorance.com', '9.9.9.9'), {}, {});
  assert.equal(r.status, 429);
  assert.ok(Number(r.headers.get('Retry-After')) > 0);
  assert.equal(await guard(req('https://rewrite.trujillomingorance.com', '8.8.8.8'), {}, {}), null);
});

test('ventana deslizante: libera tras 10 minutos', () => {
  _resetForTests();
  const r = req('https://rewrite.trujillomingorance.com', '7.7.7.7');
  for (let i = 0; i < 30; i++) rateLimited(r, 1000);
  assert.ok(rateLimited(r, 2000) > 0);
  assert.equal(rateLimited(r, 1000 + 10 * 60 * 1000 + 1), 0);
});

test('tamaño máximo del texto', () => {
  assert.equal(tooLong('a'.repeat(MAX_CHARS)), false);
  assert.equal(tooLong('a'.repeat(MAX_CHARS + 1)), true);
});

test('guard: público sin credenciales (sin APP_USERNAME) permite', async () => {
  _resetForTests();
  const env = {};
  assert.equal(requireAuth(env), false);
  assert.equal(await guard(req('https://rewrite.trujillomingorance.com'), {}, env), null);
});

test('guard: con credenciales requiere Bearer válido', async () => {
  _resetForTests();
  const env = { APP_USERNAME: 'admin', APP_PASSWORD: 'secret', APP_SECRET: 'supersecret' };
  assert.equal(requireAuth(env), true);
  const noTok = await guard(req('https://rewrite.trujillomingorance.com'), {}, env);
  assert.equal(noTok.status, 401);
  const bad = await guard(req('https://rewrite.trujillomingorance.com', '1.2.3.4', { Authorization: 'Bearer xxx' }), {}, env);
  assert.equal(bad.status, 401);
  const token = await issueToken('admin', 'supersecret');
  const good = await guard(req('https://rewrite.trujillomingorance.com', '1.2.3.5', { Authorization: `Bearer ${token}` }), {}, env);
  assert.equal(good, null);
});

test('login: devuelve el token con credenciales correctas', async () => {
  const env = { APP_USERNAME: 'admin', APP_PASSWORD: 'secret' };
  const request = new Request('https://rewrite.trujillomingorance.com/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:8788' }, body: JSON.stringify({ username: 'admin', password: 'secret' }) });
  const r = await login({ request, env });
  assert.equal(r.status, 200);
  const j = await r.json();
  assert.ok(j.token);
  assert.equal(await verifyToken(j.token, 'admin', 'secret'), true);
});

test('login: rechaza credenciales incorrectas y GET información pública', async () => {
  const env = { APP_USERNAME: 'admin', APP_PASSWORD: 'secret' };
  const request = new Request('https://rewrite.trujillomingorance.com/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:8788' }, body: JSON.stringify({ username: 'admin', password: 'wrong' }) });
  assert.equal((await login({ request, env })).status, 401);
  const getReq = new Request('https://rewrite.trujillomingorance.com/api/auth/login', { headers: { Origin: 'http://localhost:8788' } });
  const gr = await login({ request: getReq, env });
  assert.equal(gr.status, 200);
  const gj = await gr.json();
  assert.equal(gj.required, true);
  assert.equal(gj.username, 'admin');
});
