import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AuthStatus {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any | null;
  error: string | null;
}

export const useAuthStatus = (): AuthStatus => {
  const [status, setStatus] = useState<AuthStatus>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      try {
        setStatus(prev => ({ ...prev, isLoading: true, error: null }));

        // Intentar obtener la sesión de manera segura
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.warn('⚠️ Error obteniendo sesión:', sessionError);
          // No es un error crítico, continuar
        }

        if (!session?.user) {
          if (mounted) {
            setStatus({
              isAuthenticated: false,
              isLoading: false,
              user: null,
              error: null,
            });
          }
          return;
        }

        // Verificar que el usuario existe en la base de datos
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, email, nombre_completo, user_position')
          .eq('id', session.user.id)
          .single();

        if (userError) {
          console.error('❌ Error obteniendo datos del usuario:', userError);
          if (mounted) {
            setStatus({
              isAuthenticated: false,
              isLoading: false,
              user: null,
              error: 'Usuario no encontrado en la base de datos',
            });
          }
          return;
        }

        if (mounted) {
          setStatus({
            isAuthenticated: true,
            isLoading: false,
            user: userData,
            error: null,
          });
        }

      } catch (error) {
        console.error('❌ Error en checkAuth:', error);
        if (mounted) {
          setStatus({
            isAuthenticated: false,
            isLoading: false,
            user: null,
            error: error instanceof Error ? error.message : 'Error desconocido',
          });
        }
      }
    };

    // Verificación inicial
    checkAuth();

    // Listener para cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state changed:', event, session?.user?.id);
        
        if (event === 'SIGNED_OUT' || !session?.user) {
          if (mounted) {
            setStatus({
              isAuthenticated: false,
              isLoading: false,
              user: null,
              error: null,
            });
          }
          return;
        }

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          // Recargar datos del usuario
          await checkAuth();
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return status;
}; 