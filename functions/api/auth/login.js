import { corsFor } from '../../lib/guard.js';
import { issueToken, requireAuth } from '../../lib/auth.js';

export async function onRequest(context) {
  const { request, env } = context;
  const corsHeaders = corsFor(request, {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  }, env);

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { ...corsHeaders, 'Access-Control-Max-Age': '86400' } });
  }

  if (request.method === 'GET') {
    // Información pública: solo si la autenticación está habilitada y el nombre de usuario (no la contraseña).
    const required = requireAuth(env);
    const body = { required };
    if (env && env.APP_USERNAME) body.username = env.APP_USERNAME;
    return new Response(JSON.stringify(body), { status: 200, headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método no permitido.' }), { status: 405, headers: corsHeaders });
  }

  if (!requireAuth(env)) {
    return new Response(JSON.stringify({ error: 'La autenticación no está configurada.' }), { status: 404, headers: corsHeaders });
  }

  const body = await request.json().catch(() => null);
  if (!body || !body.username || !body.password) {
    return new Response(JSON.stringify({ error: 'Usuario y contraseña requeridos.' }), { status: 400, headers: corsHeaders });
  }

  // Comparación simple de credenciales. Usa APP_SECRET (preferido) o APP_PASSWORD como secreto de firma.
  const secret = env.APP_SECRET || env.APP_PASSWORD;
  const valid = body.username === env.APP_USERNAME && body.password === env.APP_PASSWORD;
  if (!valid) {
    return new Response(JSON.stringify({ error: 'Credenciales no válidas.' }), { status: 401, headers: corsHeaders });
  }

  try {
    const token = await issueToken(env.APP_USERNAME, secret);
    return new Response(JSON.stringify({ token, expiresIn: 24 * 60 * 60 }), { status: 200, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'No se pudo generar la sesión.' }), { status: 500, headers: corsHeaders });
  }
}
