import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CurrentUser {
  id: string;
  email: string;
  nombre_completo: string;
  user_position: string;
}

export const useCurrentUser = () => {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const getCurrentUser = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Primero intentar obtener la sesión actual
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          throw sessionError;
        }

        if (!session?.user) {
          if (mounted) {
            setCurrentUser(null);
            setIsLoading(false);
          }
          return;
        }

        // Obtener datos del usuario desde la tabla users
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, email, nombre_completo, user_position')
          .eq('id', session.user.id)
          .single();

        if (userError) {
          throw userError;
        }

        if (mounted) {
          setCurrentUser(userData);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error al obtener usuario actual:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Error desconocido');
          setCurrentUser(null);
          setIsLoading(false);
        }
      }
    };

    getCurrentUser();

    // Listener para cambios en la autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[useCurrentUser] Auth state changed:', { event, userId: session?.user?.id });
        
        if (event === 'SIGNED_OUT' || !session?.user) {
          if (mounted) {
            setCurrentUser(null);
            setIsLoading(false);
          }
          return;
        }

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          // Recargar datos del usuario
          try {
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('id, email, nombre_completo, user_position')
              .eq('id', session.user.id)
              .single();

            if (userError) {
              throw userError;
            }

            if (mounted) {
              setCurrentUser(userData);
              setIsLoading(false);
            }
          } catch (err) {
            console.error('Error al recargar usuario:', err);
            if (mounted) {
              setError(err instanceof Error ? err.message : 'Error desconocido');
              setCurrentUser(null);
              setIsLoading(false);
            }
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { currentUser, isLoading, error };
}; 