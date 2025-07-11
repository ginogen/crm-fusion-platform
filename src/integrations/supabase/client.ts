import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Configuración del Transaction Pooler
// URL del pooler: postgres://postgres:cmboQQnTsfKQ3PUk@db.pxmkytffrwxydvnhjpzc.supabase.co:6543/postgres
const supabasePoolerUrl = import.meta.env.VITE_SUPABASE_POOLER_URL;

// Determinar la URL final a usar
const finalUrl = supabasePoolerUrl || supabaseUrl;
const isUsingPooler = !!supabasePoolerUrl;

// Log de configuración
console.log('🔗 Configuración de Supabase:', {
  url: finalUrl,
  isUsingPooler,
  mode: isUsingPooler ? 'Transaction Pooler' : 'Direct Connection',
  poolerAvailable: !!supabasePoolerUrl
});

// Configuración optimizada para manejar timeouts, reconexiones y pooling
export const supabase = createClient(finalUrl, supabaseAnonKey, {
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
  // Configuración de realtime optimizada para pooling
  realtime: {
    params: {
      // Reducir eventos por segundo si usamos pooler
      eventsPerSecond: isUsingPooler ? 5 : 10,
    },
    // Aumentar heartbeat si usamos pooler para evitar timeouts
    heartbeatIntervalMs: isUsingPooler ? 45000 : 30000,
    reconnectAfterMs: (tries) => Math.min(tries * (isUsingPooler ? 2000 : 1000), 10000),
  },
  // Configuración global de la base de datos
  db: {
    schema: 'public'
  },
  // Headers adicionales para debugging y pooling
  global: {
    headers: {
      'X-Client-Info': 'crm-fusion@1.0.0',
      'X-Connection-Mode': isUsingPooler ? 'transaction-pooler' : 'direct',
      'X-Pool-Config': isUsingPooler ? 'size-30-timeout-30s' : 'none',
    },
  },
});

// Función para verificar si estamos usando pooler
export const isUsingTransactionPooler = () => isUsingPooler;

// Función para obtener estadísticas de conexión
export const getConnectionStats = () => ({
  url: finalUrl,
  isPooler: isUsingPooler,
  mode: isUsingPooler ? 'Transaction Pooler (6543)' : 'Direct Connection',
  maxConnections: isUsingPooler ? '30 (pooled)' : 'Unlimited (direct)',
  recommendedForUsers: isUsingPooler ? '80+ usuarios' : '< 30 usuarios'
});

// Función específica para operaciones de base de datos con pooling optimizado
export const executePooledQuery = async <T>(
  operation: () => Promise<T>,
  retries: number = 2
): Promise<T> => {
  if (!isUsingPooler) {
    // Si no usamos pooler, ejecutar directamente
    return operation();
  }

  // Con pooler, usar reintentos más agresivos
  return executeWithRetry(operation, retries, 500);
};

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
  
  if (event === 'SIGNED_IN') {
    console.log('✅ Usuario conectado via', isUsingPooler ? 'Transaction Pooler' : 'Direct Connection');
  }
});

// Crear función helper para reintentos con backoff exponencial
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
      
      // Calcular delay con backoff exponencial (más rápido con pooler)
      const delay = baseDelay * Math.pow(2, attempt);
      console.warn(`⚠️ Intento ${attempt + 1} falló, reintentando en ${delay}ms...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
};

// Función para verificar la conexión
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

// Función para monitorear el uso del pooler
export const logPoolerStats = () => {
  if (isUsingPooler) {
    console.log('📊 Transaction Pooler Stats:', {
      mode: 'Transaction Pooling',
      port: '6543',
      maxConnections: 30,
      timeout: '30s',
      optimizedFor: '80+ usuarios simultáneos'
    });
  }
};
