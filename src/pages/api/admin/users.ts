import { supabaseAdmin } from '@/integrations/supabase/admin-client';
import { supabase } from '@/integrations/supabase/client';

export default async function handler(req: any, res: any) {
  if (req.method === 'POST') {
    const { action, userId, password, userData } = req.body;

    try {
      // Verificar autenticación del usuario que hace la petición
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: 'No authorization header' });
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      // Verificar que el usuario tenga permisos administrativos
      const { data: userProfile } = await supabase
        .from('users')
        .select('user_position')
        .eq('id', user.id)
        .single();

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
          const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: userData.email,
            password: userData.password,
            email_confirm: true
          });

          if (createError) {
            return res.status(400).json({ error: createError.message });
          }

          return res.status(200).json({ user: newUser });

        case 'updatePassword':
          const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
            userId,
            { password: password }
          );

          if (passwordError) {
            return res.status(400).json({ error: passwordError.message });
          }

          return res.status(200).json({ success: true });

        case 'getUserById':
          const { data: authData, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId);

          if (getUserError) {
            return res.status(400).json({ error: getUserError.message });
          }

          return res.status(200).json({ user: authData });

        case 'deleteUser':
          const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

          if (deleteError) {
            return res.status(400).json({ error: deleteError.message });
          }

          return res.status(200).json({ success: true });

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