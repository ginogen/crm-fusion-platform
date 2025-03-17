import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    // Configurar el tiempo de sesión a 30 minutos
    storageKey: 'sb-session',
    storage: {
      getItem: (key) => {
        const item = localStorage.getItem(key);
        if (!item) return null;
        
        const session = JSON.parse(item);
        const lastActive = new Date(session.last_activity || Date.now());
        const now = new Date();
        
        // Si han pasado más de 30 minutos, eliminar la sesión
        if (now.getTime() - lastActive.getTime() > 30 * 60 * 1000) {
          localStorage.removeItem(key);
          return null;
        }
        
        // Actualizar el tiempo de última actividad
        session.last_activity = now.toISOString();
        localStorage.setItem(key, JSON.stringify(session));
        return item;
      },
      setItem: (key, value) => {
        const session = JSON.parse(value);
        session.last_activity = new Date().toISOString();
        localStorage.setItem(key, JSON.stringify(session));
      },
      removeItem: (key) => localStorage.removeItem(key),
    },
  },
});
