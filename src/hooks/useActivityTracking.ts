import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function useActivityTracking(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;

    let activityTimeout: NodeJS.Timeout;
    
    const updateActivity = async () => {
      try {
        // Primero verificamos si existe un registro
        const { data: existingData } = await supabase
          .from('user_activity')
          .select('id')
          .eq('user_id', userId)
          .single();

        const currentTime = new Date().toISOString();

        if (existingData) {
          // Si existe, actualizamos
          const { data, error } = await supabase
            .from('user_activity')
            .update({
              last_active: currentTime,
              is_online: true
            })
            .eq('user_id', userId);

          console.log('Update result:', { data, error });
        } else {
          // Si no existe, insertamos
          const { data, error } = await supabase
            .from('user_activity')
            .insert({
              user_id: userId,
              last_active: currentTime,
              session_start: currentTime,
              is_online: true
            })
            .select();

          console.log('Insert result:', { data, error });
        }
      } catch (error) {
        console.error('Error tracking activity:', error);
      }
    };

    const handleActivity = () => {
      clearTimeout(activityTimeout);
      updateActivity();
      
      // Marcar como inactivo después de 5 minutos sin actividad
      activityTimeout = setTimeout(async () => {
        const { error } = await supabase
          .from('user_activity')
          .update({ is_online: false })
          .eq('user_id', userId);

        if (error) {
          console.error('Error setting offline status:', error);
        }
      }, 5 * 60 * 1000);
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