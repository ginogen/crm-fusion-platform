const { createClient } = require('@supabase/supabase-js');

// Configuración del servidor
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Variables de entorno faltantes en el servidor');
  throw new Error('Configuración de servidor incompleta');
}

// Cliente administrativo con service role
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

// Cliente para verificaciones de autenticación
const supabaseClient = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY);

// Log de configuración
console.log('🔧 API Server configurado correctamente');

// Función para validar UUID (solo para operaciones que lo requieren)
const isValidUUID = (uuid) => {
  if (!uuid || typeof uuid !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

module.exports = async function handler(req, res) {
  // Logs detallados de la petición
  console.log('🔍 === INICIO PETICIÓN API ===');
  console.log('🔍 Método:', req.method);
  console.log('🔍 URL:', req.url);
  console.log('🔍 Headers:', Object.keys(req.headers));
  console.log('🔍 Content-Type:', req.headers['content-type']);
  console.log('🔍 Authorization presente:', !!req.headers.authorization);
  console.log('🔍 Body presente:', !!req.body);
  
  // Solo aceptar método POST
  if (req.method !== 'POST') {
    console.log('❌ Método no permitido:', req.method);
    console.log('❌ Se esperaba POST pero se recibió:', req.method);
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ 
      error: 'Method not allowed',
      received: req.method,
      expected: 'POST'
    });
  }

  console.log('✅ Método POST verificado correctamente');
  
  try {
    const { action, userId, password, userData } = req.body;
    
    console.log('📝 API Request:', { action, userId: userId ? '***' : undefined, hasUserData: !!userData });

    // Verificar autenticación
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No hay header de autorización válido');
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      console.error('❌ Error de autenticación:', authError);
      return res.status(401).json({ error: 'Invalid token' });
    }

    console.log('✅ Usuario autenticado:', user.id);

    // Verificar permisos del usuario
    const { data: userProfile, error: profileError } = await supabaseClient
      .from('users')
      .select('user_position')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('❌ Error obteniendo perfil:', profileError);
      return res.status(403).json({ error: 'Could not verify permissions' });
    }

    const allowedPositions = [
      'CEO',
      'Director Internacional',
      'Director Nacional',
      'Director de Zona',
      'Sales Manager',
      'Gerente Divisional',
      'Gerente',
      'Jefe de Grupo'
    ];

    if (!userProfile || !allowedPositions.includes(userProfile.user_position)) {
      console.log('❌ Permisos insuficientes:', userProfile?.user_position);
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    console.log('✅ Permisos verificados:', userProfile.user_position);

    // Ejecutar acción solicitada
    switch (action) {
      case 'createUser':
        console.log('🚀 Ejecutando createUser');
        
        // Validar datos básicos
        if (!userData) {
          console.error('❌ No se proporcionaron datos de usuario');
          return res.status(400).json({ error: 'User data is required' });
        }

        if (!userData.email || !userData.password) {
          console.error('❌ Email o password faltantes');
          return res.status(400).json({ error: 'Email and password are required' });
        }

        // Validar email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(userData.email)) {
          console.error('❌ Email inválido:', userData.email);
          return res.status(400).json({ error: 'Invalid email format' });
        }

        // Validar contraseña
        if (userData.password.length < 6) {
          console.error('❌ Contraseña muy corta');
          return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Crear usuario
        console.log('📝 Creando usuario en Auth...');
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: userData.email,
          password: userData.password,
          email_confirm: true
        });

        if (createError) {
          console.error('❌ Error creando usuario:', createError);
          return res.status(400).json({ error: createError.message });
        }

        console.log('✅ Usuario creado exitosamente:', newUser.user.id);
        return res.status(200).json({ user: newUser });

      case 'updatePassword':
        console.log('🔒 Ejecutando updatePassword');
        
        // Validar UUID
        if (!isValidUUID(userId)) {
          console.error('❌ UUID inválido:', userId);
          return res.status(400).json({ error: 'Invalid user ID format' });
        }

        // Validar contraseña
        if (!password || password.length < 6) {
          console.error('❌ Contraseña inválida');
          return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        console.log('📝 Actualizando contraseña...');
        const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
          userId,
          { password: password }
        );

        if (passwordError) {
          console.error('❌ Error actualizando contraseña:', passwordError);
          return res.status(400).json({ error: passwordError.message });
        }

        console.log('✅ Contraseña actualizada exitosamente');
        return res.status(200).json({ success: true });

      case 'getUserById':
        console.log('👤 Ejecutando getUserById');
        
        // Validar UUID
        if (!isValidUUID(userId)) {
          console.error('❌ UUID inválido:', userId);
          return res.status(400).json({ error: 'Invalid user ID format' });
        }

        console.log('📝 Obteniendo usuario...');
        const { data: authData, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId);

        if (getUserError) {
          console.error('❌ Error obteniendo usuario:', getUserError);
          return res.status(400).json({ error: getUserError.message });
        }

        console.log('✅ Usuario obtenido exitosamente');
        return res.status(200).json({ user: authData });

      case 'deleteUser':
        console.log('🗑️ Ejecutando deleteUser');
        
        // Validar UUID
        if (!isValidUUID(userId)) {
          console.error('❌ UUID inválido:', userId);
          return res.status(400).json({ error: 'Invalid user ID format' });
        }

        console.log('📝 Eliminando usuario...');
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

        if (deleteError) {
          console.error('❌ Error eliminando usuario:', deleteError);
          return res.status(400).json({ error: deleteError.message });
        }

        console.log('✅ Usuario eliminado exitosamente');
        return res.status(200).json({ success: true });

      default:
        console.error('❌ Acción inválida:', action);
        return res.status(400).json({ error: 'Invalid action' });
    }

  } catch (error) {
    console.error('❌ Error crítico en API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 