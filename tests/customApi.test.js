import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeBaseUrl, chatEndpoint, isPrivateHost, chatCompletion } from '../functions/lib/customApi.js';

test('normalizeBaseUrl acepta HTTPS público y quita query/hash', () => {
  assert.equal(normalizeBaseUrl('https://api.openai.com/v1?x=1#y'), 'https://api.openai.com/v1');
});

test('normalizeBaseUrl rechaza HTTP, credenciales y hosts privados', () => {
  assert.throws(() => normalizeBaseUrl('http://api.example.com/v1'), /HTTPS/);
  assert.throws(() => normalizeBaseUrl('https://user:pass@api.example.com/v1'), /credenciales/);
  assert.throws(() => normalizeBaseUrl('https://localhost:8788/v1'), /público/);
  assert.throws(() => normalizeBaseUrl('https://192.168.1.10/v1'), /público/);
  assert.throws(() => normalizeBaseUrl('https://127.0.0.1/v1'), /público/);
  assert.ok(isPrivateHost('10.0.0.1'));
});

test('chatEndpoint completa la ruta /chat/completions', () => {
  assert.equal(chatEndpoint('https://api.openai.com/v1'), 'https://api.openai.com/v1/chat/completions');
  assert.equal(chatEndpoint('https://api.deepseek.com'), 'https://api.deepseek.com/v1/chat/completions');
  assert.equal(chatEndpoint('https://openrouter.ai/api/v1'), 'https://openrouter.ai/api/v1/chat/completions');
  assert.equal(chatEndpoint('https://api.example.com/v1/chat/completions'), 'https://api.example.com/v1/chat/completions');
});

test('chatCompletion envía la clave y el modelo al proveedor', async () => {
  let seen = null;
  const res = await chatCompletion({
    baseUrl: 'https://api.example.com/v1',
    apiKey: 'sk-test',
    model: 'demo-model',
    messages: [{ role: 'user', content: 'hola' }],
    fetchImpl: async (url, init) => {
      seen = { url, init };
      return new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }] }), { status: 200 });
    }
  });
  assert.equal(seen.url, 'https://api.example.com/v1/chat/completions');
  assert.equal(seen.init.headers.Authorization, 'Bearer sk-test');
  const body = JSON.parse(seen.init.body);
  assert.equal(body.model, 'demo-model');
  assert.equal(body.stream, false);
  assert.equal((await res.json()).choices[0].message.content, 'ok');
});
