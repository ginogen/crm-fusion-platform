import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY

// Para operaciones administrativas, usar conexión directa (no pooler)
// Las operaciones admin necesitan conexiones persistentes y privilegiadas
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false, // Service role no necesita refresh
    persistSession: false,   // No persistir sesiones admin
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'X-Client-Info': 'crm-fusion-admin@1.0.0',
      'X-Connection-Type': 'direct-admin',
    },
  },
})

// Log de configuración
console.log('🔧 Supabase Admin configurado con conexión directa'); 