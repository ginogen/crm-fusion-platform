import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validar variables de entorno
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variables de entorno de Supabase faltantes');
  throw new Error('Configuración de Supabase incompleta');
}

// Configuración simplificada del cliente Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  realtime: {
    heartbeatIntervalMs: 30000,
    reconnectAfterMs: (tries) => Math.min(tries * 1000, 10000),
  },
  global: {
    headers: {
      'X-Client-Info': 'crm-fusion-frontend@1.0.0',
    },
  },
});

// Log de configuración
console.log('🔧 Supabase configurado con URL:', supabaseUrl);

// Manejar errores de conexión globalmente
supabase.auth.onAuthStateChange((event, session) => {
  console.log('🔄 Auth state changed:', event, session?.user?.id);
  
  if (event === 'SIGNED_OUT') {
    console.log('👋 Usuario desconectado');
  }
  
  if (event === 'TOKEN_REFRESHED') {
    console.log('🔄 Token refreshed successfully');
  }
});

// Función para reintentos con manejo de errores mejorado
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
