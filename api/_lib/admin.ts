import { createUserScopedSupabaseClient, createWriteSupabaseClient } from './supabase.js';
import { getBearerToken, type ApiRequest } from './http.js';

export async function requireAdmin(request: ApiRequest) {
  const accessToken = getBearerToken(request);

  if (!accessToken) {
    throw new Error('Debes iniciar sesión como admin para usar esta ruta.');
  }

  const userClient = createUserScopedSupabaseClient(accessToken);
  const userResponse = await userClient.auth.getUser(accessToken);

  if (userResponse.error || !userResponse.data.user?.email) {
    throw new Error('No se pudo validar la sesión admin.');
  }

  const adminResponse = await userClient.rpc('is_current_user_admin');

  if (adminResponse.error || !adminResponse.data) {
    throw new Error('Tu sesión no tiene permisos editoriales.');
  }

  return {
    accessToken,
    actorEmail: userResponse.data.user.email,
    userClient,
    writeClient: createWriteSupabaseClient(accessToken),
  };
}
