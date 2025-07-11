import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Para el frontend, siempre usar la URL HTTP normal de Supabase
// El Transaction Pooler se configura automáticamente en el servidor
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storageKey: 'sb-session',
    storage: {
      getItem: (key) => {
        const item = localStorage.getItem(key);
        if (!item) return null;
        
        try {
          const session = JSON.parse(item);
          const lastActive = new Date(session.last_activity || Date.now());
          const now = new Date();
          
          // Si han pasado más de 15 minutos, eliminar la sesión
          if (now.getTime() - lastActive.getTime() > 15 * 60 * 1000) {
            localStorage.removeItem(key);
            return null;
          }
          
          // Actualizar el tiempo de última actividad
          session.last_activity = now.toISOString();
          localStorage.setItem(key, JSON.stringify(session));
          return item;
        } catch (error) {
          console.error('❌ Error parsing session:', error);
          localStorage.removeItem(key);
          return null;
        }
      },
      setItem: (key, value) => {
        try {
          const session = JSON.parse(value);
          session.last_activity = new Date().toISOString();
          localStorage.setItem(key, JSON.stringify(session));
        } catch (error) {
          console.error('❌ Error storing session:', error);
        }
      },
      removeItem: (key) => localStorage.removeItem(key),
    },
  },
  // Configuración optimizada para el cliente
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
    heartbeatIntervalMs: 30000, // 30 segundos
    reconnectAfterMs: (tries) => Math.min(tries * 1000, 10000), // Backoff exponencial
  },
  // Configuración global de la base de datos
  db: {
    schema: 'public'
  },
  // Headers adicionales para identificar conexiones desde frontend
  global: {
    headers: {
      'X-Client-Info': 'crm-fusion-frontend@1.0.0',
    },
  },
});

// Log de configuración
console.log('🔧 Supabase configurado:', {
  url: 'HTTP API (pooler automático)',
  frontend: true
});

// Manejar errores de conexión globalmente
supabase.auth.onAuthStateChange((event, session) => {
  console.log('🔄 Auth state changed:', event, session?.user?.id);
  
  if (event === 'SIGNED_OUT') {
    console.log('👋 Usuario desconectado');
    // Limpiar cualquier estado local
    localStorage.removeItem('sb-session');
  }
  
  if (event === 'TOKEN_REFRESHED') {
    console.log('🔄 Token refreshed successfully');
  }
});

// Función optimizada para reintentos
export const executeWithRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Si es el último intento, lanzar el error
      if (attempt === maxRetries) {
        console.error(`❌ Operación falló después de ${maxRetries + 1} intentos:`, error);
        throw error;
      }
      
      // Calcular delay con backoff exponencial
      const delay = Math.min(baseDelay * Math.pow(1.5, attempt), 5000);
      console.warn(`⚠️ Intento ${attempt + 1} falló, reintentando en ${delay}ms...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
};

// Función para verificar conexión
export const checkConnection = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.from('users').select('count').limit(1);
    return !error;
  } catch (error) {
    console.error('❌ Error de conexión:', error);
    return false;
  }
};

// Función para reconectar automáticamente
export const reconnectSupabase = async (): Promise<void> => {
  console.log('🔄 Intentando reconectar con Supabase...');
  
  try {
    // Refrescar la sesión
    const { data: { session }, error } = await supabase.auth.refreshSession();
    
    if (error) {
      console.error('❌ Error al refrescar sesión:', error);
      throw error;
    }
    
    console.log('✅ Reconexión exitosa');
  } catch (error) {
    console.error('❌ Error en reconexión:', error);
    throw error;
  }
};
