import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequest } from '../functions/api/admin/summary.js';
import { issueToken } from '../functions/lib/auth.js';

const env = { GROQ_API_KEY: 'secret-value', AI: {}, ENVIRONMENT: 'production', APP_USERNAME: 'admin', APP_PASSWORD: 'secret' };
const req = (auth, o = 'https://rewrite.trujillomingorance.com') => new Request('https://rewrite.trujillomingorance.com/api/admin/summary', { headers: { ...(auth ? { Authorization: auth } : {}), Origin: o } });

test('403 sin autenticación configurada y con token inválido', async () => {
  assert.equal((await onRequest({ request: req(''), env: {} })).status, 403);
  assert.equal((await onRequest({ request: req(''), env })).status, 403);
  assert.equal((await onRequest({ request: req('Bearer xxx'), env })).status, 403);
});

test('token válido: estado sin valores de secretos y CORS solo para el origen permitido', async () => {
  const token = await issueToken('admin', 'secret');
  const r = await onRequest({ request: req(`Bearer ${token}`), env });
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('Access-Control-Allow-Origin'), 'https://rewrite.trujillomingorance.com');
  const txt = await r.text();
  assert.ok(!txt.includes('secret-value'));
  assert.deepEqual(JSON.parse(txt).facts.find((f) => f[0] === 'groq'), ['groq', 'on']);
  const o = await onRequest({ request: req(`Bearer ${token}`, 'https://evil.example.com'), env });
  assert.equal(o.headers.get('Access-Control-Allow-Origin'), null);
});
