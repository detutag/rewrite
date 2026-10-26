/**
 * Las rutas /api/auth/* basadas en cuentas externas (X, Google, Microsoft, logout, me)
 * han sido eliminadas. La autenticación ahora es simple y local mediante credenciales
 * definidas con variables de entorno (ver functions/api/auth/login.js).
 * Este manejador delega a login.js o devuelve 404.
 */
import { onRequest as login } from './login.js';

const handled = { login };

export async function onRequest(context) {
  const { params } = context;
  const action = Array.isArray(params.action) ? params.action[0] : params.action;
  if (action && handled[action]) return handled[action](context);
  const corsHeaders = { 'Content-Type': 'application/json' };
  return new Response(JSON.stringify({ error: 'Ruta no encontrada' }), { status: 404, headers: corsHeaders });
}
