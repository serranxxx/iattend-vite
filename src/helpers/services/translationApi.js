import axios from "axios";
import { supabase } from "../../lib/supabase";

const EVENTS_URL = import.meta.env.VITE_IATTEND_EVENTS_URL || "https://www.iattend.events";
// const EVENTS_URL = 'http://localhost:3000'

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("No hay sesión activa para traducir la invitación");
  }
  return { Authorization: `Bearer ${session.access_token}` };
}

export async function fetchDeepLLanguages() {
  const { data } = await axios.get(`${EVENTS_URL}/api/translation/languages`);
  return data.languages ?? [];
}

export async function translateInvitation({ invitationId, lang, sections }) {
  const headers = await authHeaders();
  try {
    const { data } = await axios.post(
      `${EVENTS_URL}/api/translation/invitation`,
      { invitationId, lang, sections },
      { headers }
    );
    return data;
  } catch (error) {
    if (error.response?.status === 402) {
      const creditError = new Error(error.response.data?.message || "No tienes créditos suficientes");
      creditError.code = "NO_CREDITS";
      throw creditError;
    }
    throw error;
  }
}
