import { createClient } from '@supabase/supabase-js';

// Configuración correcta para el entorno del servidor
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// Configuración del Transaction Pooler para APIs
// URL del pooler: postgres://postgres:cmboQQnTsfKQ3PUk@db.pxmkytffrwxydvnhjpzc.supabase.co:6543/postgres
const supabasePoolerUrl = process.env.VITE_SUPABASE_POOLER_URL;

// Determinar la URL final a usar (pooler tiene prioridad para APIs)
const finalUrl = supabasePoolerUrl || supabaseUrl;
const isUsingPooler = !!supabasePoolerUrl;

// Log de configuración para debugging
console.log('🔗 API Admin - Configuración de Supabase:', {
  url: finalUrl,
  isUsingPooler,
  mode: isUsingPooler ? 'Transaction Pooler' : 'Direct Connection',
  apiOptimized: isUsingPooler ? 'Para múltiples usuarios' : 'Configuración básica'
});

// Cliente admin optimizado para pooling
const supabaseAdmin = createClient(finalUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false, // No necesario para service role
    persistSession: false,   // No necesario para APIs
  },
  // Configuración específica para APIs con pooling
  global: {
    headers: {
      'X-Client-Info': 'crm-fusion-api@1.0.0',
      'X-Connection-Mode': isUsingPooler ? 'transaction-pooler' : 'direct',
      'X-API-Type': 'admin-users',
    },
  },
});

// Cliente regular para verificaciones de autenticación
const supabaseClient = createClient(finalUrl, process.env.VITE_SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  global: {
    headers: {
      'X-Client-Info': 'crm-fusion-api-auth@1.0.0',
      'X-Connection-Mode': isUsingPooler ? 'transaction-pooler' : 'direct',
    },
  },
});

// Función para validar UUID
const isValidUUID = (uuid) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return typeof uuid === 'string' && uuidRegex.test(uuid);
};

// Función helper para operaciones con pooling optimizado
const executePooledOperation = async (operation, retries = 2) => {
  if (!isUsingPooler) {
    return operation();
  }

  // Con pooler, usar reintentos más rápidos
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }
      
      // Esperar menos tiempo entre reintentos con pooler
      const delay = 200 * Math.pow(2, attempt);
      console.warn(`⚠️ API Admin - Reintento ${attempt + 1} en ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { action, userId, password, userData } = req.body;

    // Log de inicio de operación
    console.log('🔧 API Admin - Operación:', {
      action,
      userId: userId ? userId.substring(0, 8) + '...' : 'N/A',
      poolerMode: isUsingPooler ? 'Transaction Pooler' : 'Direct',
      timestamp: new Date().toISOString()
    });

    try {
      if (action === 'createUser') {
        // Validar datos requeridos
        if (!userData.email || !password) {
          return res.status(400).json({ 
            error: 'Email y contraseña son requeridos',
            details: 'Datos faltantes para crear usuario' 
          });
        }

        // Crear usuario con pooling optimizado
        const result = await executePooledOperation(async () => {
          const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email: userData.email,
            password: password,
            email_confirm: true,
            user_metadata: {
              nombre_completo: userData.nombre_completo || '',
              user_position: userData.user_position || 'Usuario'
            }
          });
          
          if (error) throw error;
          return data;
        });

        if (result.user) {
          // Actualizar datos del usuario en la tabla users
          await executePooledOperation(async () => {
            const { error: updateError } = await supabaseAdmin
              .from('users')
              .update({
                nombre_completo: userData.nombre_completo,
                user_position: userData.user_position,
                estructura_id: userData.estructura_id || null,
                supervisor_id: userData.supervisor_id || null,
                is_active: true
              })
              .eq('id', result.user.id);

            if (updateError) throw updateError;
          });

          console.log('✅ Usuario creado exitosamente:', {
            id: result.user.id,
            email: result.user.email,
            poolerUsed: isUsingPooler
          });

          return res.status(200).json({ 
            data: result, 
            message: 'Usuario creado exitosamente',
            poolerMode: isUsingPooler ? 'Transaction Pooler' : 'Direct'
          });
        }
      }

      if (action === 'updateUser') {
        // Validar UUID
        if (!isValidUUID(userId)) {
          return res.status(400).json({ 
            error: 'ID de usuario no válido',
            details: 'El formato del ID debe ser UUID válido' 
          });
        }

        // Actualizar usuario con pooling optimizado
        await executePooledOperation(async () => {
          const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            password: password,
            user_metadata: {
              nombre_completo: userData.nombre_completo || '',
              user_position: userData.user_position || ''
            }
          });

          if (error) throw error;
        });

        // Actualizar datos en la tabla users
        await executePooledOperation(async () => {
          const { error: updateError } = await supabaseAdmin
            .from('users')
            .update({
              nombre_completo: userData.nombre_completo,
              user_position: userData.user_position,
              estructura_id: userData.estructura_id || null,
              supervisor_id: userData.supervisor_id || null
            })
            .eq('id', userId);

          if (updateError) throw updateError;
        });

        console.log('✅ Usuario actualizado exitosamente:', {
          id: userId.substring(0, 8) + '...',
          poolerUsed: isUsingPooler
        });

        return res.status(200).json({ 
          message: 'Usuario actualizado exitosamente',
          poolerMode: isUsingPooler ? 'Transaction Pooler' : 'Direct'
        });
      }

      if (action === 'deleteUser') {
        // Validar UUID
        if (!isValidUUID(userId)) {
          return res.status(400).json({ 
            error: 'ID de usuario no válido',
            details: 'El formato del ID debe ser UUID válido' 
          });
        }

        // Eliminar usuario con pooling optimizado
        await executePooledOperation(async () => {
          const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
          if (error) throw error;
        });

        console.log('✅ Usuario eliminado exitosamente:', {
          id: userId.substring(0, 8) + '...',
          poolerUsed: isUsingPooler
        });

        return res.status(200).json({ 
          message: 'Usuario eliminado exitosamente',
          poolerMode: isUsingPooler ? 'Transaction Pooler' : 'Direct'
        });
      }

      return res.status(400).json({ 
        error: 'Acción no válida',
        details: 'Las acciones válidas son: createUser, updateUser, deleteUser' 
      });

    } catch (error) {
      console.error('❌ Error en API Admin:', {
        error: error.message,
        action,
        userId: userId ? userId.substring(0, 8) + '...' : 'N/A',
        poolerMode: isUsingPooler ? 'Transaction Pooler' : 'Direct',
        timestamp: new Date().toISOString()
      });

      // Manejo de errores específicos
      if (error.message?.includes('Invalid email format')) {
        return res.status(400).json({ 
          error: 'El formato del email no es válido',
          details: error.message 
        });
      }

      if (error.message?.includes('Password must be at least')) {
        return res.status(400).json({ 
          error: 'La contraseña debe tener al menos 6 caracteres',
          details: error.message 
        });
      }

      if (error.message?.includes('User already registered')) {
        return res.status(409).json({ 
          error: 'El usuario ya está registrado',
          details: 'Ya existe un usuario con este email' 
        });
      }

      if (error.message?.includes('User not found')) {
        return res.status(404).json({ 
          error: 'Usuario no encontrado',
          details: 'El usuario especificado no existe' 
        });
      }

      return res.status(500).json({ 
        error: 'Error interno del servidor',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Error interno',
        poolerMode: isUsingPooler ? 'Transaction Pooler' : 'Direct'
      });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ 
      error: 'Método no permitido',
      details: 'Solo se permiten peticiones POST' 
    });
  }
} 