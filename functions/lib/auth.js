/**
 * Auth simple con JWT minimal (HMAC-SHA256) firmado con APP_SECRET o APP_PASSWORD.
 * Solo se usa cuando el despliegue define APP_USERNAME y APP_PASSWORD.
 */

const TOKEN_TTL = 24 * 60 * 60;

function b64uEncode(buf) {
  return base64From(new Uint8Array(buf)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function b64uDecode(s) {
  const pad = (4 - (s.length % 4)) % 4;
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(pad);
  return base64ToArray(b64);
}

function base64From(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function base64ToArray(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function enc(s) {
  return new TextEncoder().encode(s);
}

export async function issueToken(username, secret) {
  const header = b64uEncode(enc(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const payload = { u: username, exp: Math.floor(Date.now() / 1000) + TOKEN_TTL };
  const body = b64uEncode(enc(JSON.stringify(payload)));
  const signingInput = `${header}.${body}`;
  const key = await importKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, enc(signingInput));
  return `${signingInput}.${b64uEncode(sig)}`;
}

async function importKey(secret) {
  return crypto.subtle.importKey('raw', enc(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function verifyToken(token, username, secret) {
  if (!token || token.split('.').length !== 3) return false;
  const [header, body, sig] = token.split('.');
  try {
    const key = await importKey(secret);
    const valid = await crypto.subtle.verify('HMAC', key, b64uDecode(sig), enc(`${header}.${body}`));
    if (!valid) return false;
    const decoded = JSON.parse(new TextDecoder().decode(b64uDecode(body)));
    if (decoded.u !== username) return false;
    if (decoded.exp < Math.floor(Date.now() / 1000)) return false;
    return true;
  } catch (_) {
    return false;
  }
}

export function requireAuth(env) {
  return !!(env && env.APP_USERNAME && env.APP_PASSWORD);
}
