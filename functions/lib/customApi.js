/**
 * Compatibilidad con proveedores externos compatibles con OpenAI.
 * Solo se permiten destinos HTTPS públicos: la clave del usuario viaja del
 * navegador a esta Function y de aquí al proveedor elegido, nunca se registra.
 */

const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /\.localhost$/i,
  /\.local$/i,
  /\.internal$/i,
  /^0\.0\.0\.0$/,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[01])\./
];

export function isPrivateHost(hostname) {
  const host = String(hostname || '').toLowerCase().replace(/^\[|\]$/g, '');
  if (!host) return true;
  if (PRIVATE_HOST_PATTERNS.some((re) => re.test(host))) return true;
  if (host === '::1' || host === '::') return true;
  if (/^f[cd][0-9a-f]{2}:/.test(host)) return true;
  if (/^fe[89ab][0-9a-f]:/.test(host)) return true;
  return false;
}

export function normalizeBaseUrl(raw) {
  const value = String(raw || '').trim();
  if (!value) throw new Error('Falta la Base URL del proveedor externo.');
  let url;
  try {
    url = new URL(value);
  } catch (_) {
    throw new Error('La Base URL no es válida. Ejemplo: https://api.openai.com/v1');
  }
  if (url.protocol !== 'https:') {
    throw new Error('La Base URL debe usar HTTPS.');
  }
  if (url.username || url.password) {
    throw new Error('No incluyas credenciales en la Base URL.');
  }
  if (isPrivateHost(url.hostname)) {
    throw new Error('La Base URL debe apuntar a un host público.');
  }
  url.hash = '';
  url.search = '';
  return url.toString();
}

export function chatEndpoint(baseUrl) {
  const url = new URL(normalizeBaseUrl(baseUrl));
  let path = url.pathname.replace(/\/+$/, '');
  if (!path) path = '/v1';
  if (!/\/chat\/completions$/.test(path)) path += '/chat/completions';
  return url.origin + path;
}

export async function chatCompletion({
  baseUrl,
  apiKey,
  model,
  messages,
  temperature = 0.7,
  maxTokens = 3500,
  stream = false,
  responseFormat,
  fetchImpl = fetch,
  extraHeaders = {}
}) {
  if (!apiKey) throw new Error('Falta la API Key del proveedor externo.');
  if (!model) throw new Error('Falta el modelo del proveedor externo.');

  const payload = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
    stream: !!stream
  };
  if (responseFormat) payload.response_format = responseFormat;

  const res = await fetchImpl(chatEndpoint(baseUrl), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...extraHeaders
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    const message = errJson && errJson.error && errJson.error.message
      ? errJson.error.message
      : `Proveedor externo HTTP ${res.status}`;
    throw new Error(message);
  }

  return res;
}
