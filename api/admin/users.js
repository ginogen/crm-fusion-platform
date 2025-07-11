import { createClient } from '@supabase/supabase-js';

// Configuración correcta para el entorno del servidor
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

// Cliente regular para verificaciones de autenticación
const supabaseClient = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY);

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { action, userId, password, userData } = req.body;

    try {
      // Verificar autenticación del usuario que hace la petición
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: 'No authorization header' });
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
      
      if (authError || !user) {
        console.error('Auth error:', authError);
        return res.status(401).json({ error: 'Invalid token' });
      }

      // Verificar que el usuario tenga permisos administrativos
      const { data: userProfile, error: profileError } = await supabaseClient
        .from('users')
        .select('user_position')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Profile error:', profileError);
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
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      // Ejecutar la acción administrativa solicitada
      switch (action) {
        case 'createUser':
          try {
            const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
              email: userData.email,
              password: userData.password,
              email_confirm: true
            });

            if (createError) {
              console.error('Create user error:', createError);
              return res.status(400).json({ error: createError.message });
            }

            return res.status(200).json({ user: newUser });
          } catch (error) {
            console.error('Create user exception:', error);
            return res.status(500).json({ error: 'Failed to create user' });
          }

        case 'updatePassword':
          try {
            // Validar que el userId sea un UUID válido
            if (!userId || typeof userId !== 'string' || userId.length !== 36) {
              return res.status(400).json({ error: 'Invalid user ID format' });
            }

            const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
              userId,
              { password: password }
            );

            if (passwordError) {
              console.error('Update password error:', passwordError);
              return res.status(400).json({ error: passwordError.message });
            }

            return res.status(200).json({ success: true });
          } catch (error) {
            console.error('Update password exception:', error);
            return res.status(500).json({ error: 'Failed to update password' });
          }

        case 'getUserById':
          try {
            // Validar que el userId sea un UUID válido
            if (!userId || typeof userId !== 'string' || userId.length !== 36) {
              return res.status(400).json({ error: 'Invalid user ID format' });
            }

            const { data: authData, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId);

            if (getUserError) {
              console.error('Get user error:', getUserError);
              return res.status(400).json({ error: getUserError.message });
            }

            return res.status(200).json({ user: authData });
          } catch (error) {
            console.error('Get user exception:', error);
            return res.status(500).json({ error: 'Failed to get user' });
          }

        case 'deleteUser':
          try {
            // Validar que el userId sea un UUID válido
            if (!userId || typeof userId !== 'string' || userId.length !== 36) {
              return res.status(400).json({ error: 'Invalid user ID format' });
            }

            const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

            if (deleteError) {
              console.error('Delete user error:', deleteError);
              return res.status(400).json({ error: deleteError.message });
            }

            return res.status(200).json({ success: true });
          } catch (error) {
            console.error('Delete user exception:', error);
            return res.status(500).json({ error: 'Failed to delete user' });
          }

        default:
          return res.status(400).json({ error: 'Invalid action' });
      }

    } catch (error) {
      console.error('API Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }
} 