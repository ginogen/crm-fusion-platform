import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutos en milisegundos

export function useActivityTracking(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;

    let activityTimeout: NodeJS.Timeout;
    
    const updateActivity = async () => {
      try {
        // Primero verificamos si existe un registro
        const { data: existingData } = await supabase
          .from('user_activity')
          .select('id, last_active')
          .eq('user_id', userId)
          .single();

        const currentTime = new Date().toISOString();

        if (existingData) {
          // Verificar si la última actividad fue hace más de 30 minutos
          const lastActive = new Date(existingData.last_active);
          const timeSinceLastActive = Date.now() - lastActive.getTime();

          if (timeSinceLastActive > INACTIVITY_TIMEOUT) {
            // Si pasaron más de 30 minutos, crear una nueva sesión
            const { data, error } = await supabase
              .from('user_activity')
              .insert({
                user_id: userId,
                last_active: currentTime,
                session_start: currentTime,
                is_online: true
              })
              .select();

            console.log('New session created:', { data, error });
          } else {
            // Si no, actualizar la sesión existente
            const { data, error } = await supabase
              .from('user_activity')
              .update({
                last_active: currentTime,
                is_online: true
              })
              .eq('user_id', userId);

            console.log('Session updated:', { data, error });
          }
        } else {
          // Si no existe, insertamos una nueva sesión
          const { data, error } = await supabase
            .from('user_activity')
            .insert({
              user_id: userId,
              last_active: currentTime,
              session_start: currentTime,
              is_online: true
            })
            .select();

          console.log('First session created:', { data, error });
        }
      } catch (error) {
        console.error('Error tracking activity:', error);
      }
    };

    const handleActivity = () => {
      clearTimeout(activityTimeout);
      updateActivity();
      
      // Configurar el timeout para marcar como inactivo después de 30 minutos
      activityTimeout = setTimeout(async () => {
        const { error } = await supabase
          .from('user_activity')
          .update({ is_online: false })
          .eq('user_id', userId);

        if (error) {
          console.error('Error setting offline status:', error);
        }

        // Forzar el cierre de sesión después de 30 minutos de inactividad
        supabase.auth.signOut();
      }, INACTIVITY_TIMEOUT);
    };

    // Eventos a monitorear
    const events = ['mousedown', 'keydown', 'mousemove', 'wheel'];
    events.forEach(event => document.addEventListener(event, handleActivity));

    // Iniciar tracking
    updateActivity();

    // Cleanup
    return () => {
      events.forEach(event => document.removeEventListener(event, handleActivity));
      clearTimeout(activityTimeout);
      
      // Marcar como offline al desmontar
      supabase
        .from('user_activity')
        .update({ is_online: false })
        .eq('user_id', userId)
        .then(({ error }) => {
          if (error) console.error('Error setting offline status on cleanup:', error);
        });
    };
  }, [userId]);
} 