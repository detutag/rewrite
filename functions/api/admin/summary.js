// GET /api/admin/summary — estado de Rewrite para el panel interno.
// Requiere la sesión local (usuario y contraseña configurados con APP_USERNAME/APP_PASSWORD).
import { corsFor } from '../../lib/guard.js';
import { verifyToken, requireAuth } from '../../lib/auth.js';

export async function onRequest({ request, env }) {
  const headers = corsFor(request, {
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'private, no-store',
    'X-Robots-Tag': 'noindex',
  }, env);

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method !== 'GET') return new Response(JSON.stringify({ error: 'method_not_allowed' }), { status: 405, headers });
  if (!requireAuth(env)) return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers });

  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';
  const secret = env.APP_SECRET || env.APP_PASSWORD;
  if (!(await verifyToken(token, env.APP_USERNAME, secret))) {
    return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers });
  }

  // Solo si existe cada secreto (nunca su valor)
  return new Response(JSON.stringify({
    ok: true,
    facts: [
      ['model', env.GROQ_API_KEY ? 'openai/gpt-oss-120b (Groq)' : (env.DEFAULT_MODEL || '@cf/meta/llama-3.1-8b-instruct-fp8')],
      ['fallback', env.DEFAULT_MODEL || '@cf/meta/llama-3.1-8b-instruct-fp8'],
      ['workers-ai', env.AI ? 'on' : 'off'],
      ['groq', env.GROQ_API_KEY ? 'on' : 'off'],
      ['env', env.ENVIRONMENT || ''],
    ],
  }), { status: 200, headers });
}
