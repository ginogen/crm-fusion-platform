import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TrackingUser {
  id: string;
  email: string;
  nombre_completo: string;
}

interface UserTrackingContextType {
  currentUser: TrackingUser | null;
  isOnline: boolean;
  isLoading: boolean;
  lastActivity: Date | null;
}

const UserTrackingContext = createContext<UserTrackingContextType | null>(null);

export const useUserTracking = () => {
  const context = useContext(UserTrackingContext);
  if (!context) {
    throw new Error('useUserTracking must be used within a UserTrackingProvider');
  }
  return context;
};

interface UserTrackingProviderProps {
  children: React.ReactNode;
}

const STORAGE_KEY = 'current_user_tracking';
const HEARTBEAT_INTERVAL = 120000; // 2 minutos (reducido la frecuencia)
const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutos
const SUPABASE_RETRY_LIMIT = 3; // Máximo de intentos fallidos antes de desactivar Supabase

export const UserTrackingProvider: React.FC<UserTrackingProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<TrackingUser | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastActivity, setLastActivity] = useState<Date | null>(null);
  const [supabaseErrors, setSupabaseErrors] = useState(0);

  const getUserFromStorage = (): TrackingUser | null => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;
      
      const userData = JSON.parse(stored);
      const lastActivity = new Date(userData.lastActivity);
      const now = new Date();
      
      // Si han pasado más de 15 minutos desde la última actividad, considerar desconectado
      if (now.getTime() - lastActivity.getTime() > INACTIVITY_TIMEOUT) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      
      return {
        id: userData.id,
        email: userData.email,
        nombre_completo: userData.nombre_completo
      };
    } catch (error) {
      // Error silencioso para no llenar la consola
      return null;
    }
  };

  const saveUserToStorage = (user: TrackingUser) => {
    const userData = {
      ...user,
      lastActivity: new Date().toISOString(),
      sessionStart: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
    setLastActivity(new Date());
  };

  const updateActivity = async (userId: string) => {
    try {
      console.log('[UserTrackingContext] updateActivity iniciado para userId:', userId);
      
      // Verificar autenticación actual
      const { data: { session } } = await supabase.auth.getSession();
      console.log('[UserTrackingContext] Sesión actual:', {
        hasSession: !!session,
        userId: session?.user?.id,
        isExpired: session?.expires_at ? new Date(session.expires_at * 1000) < new Date() : 'unknown'
      });
      
      const currentTime = new Date().toISOString();
      
      // PRIORIDAD 1: Actualizar localStorage siempre
      const storedUser = getUserFromStorage();
      if (storedUser) {
        const userData = {
          ...storedUser,
          lastActivity: currentTime,
          sessionStart: JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}').sessionStart || currentTime
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
        setLastActivity(new Date());
      }

      // PRIORIDAD 2: Intentar actualizar en Supabase (políticas RLS corregidas)
      if (supabaseErrors < SUPABASE_RETRY_LIMIT) {
        try {
          console.log('[UserTrackingContext] Intentando SELECT en user_activity para userId:', userId);
          const { data: existingData, error: selectError } = await supabase
            .from('user_activity')
            .select('id, last_active')
            .eq('user_id', userId)
            .order('last_active', { ascending: false })
            .limit(1);

          if (selectError) {
            console.error('[UserTrackingContext] Error en SELECT:', {
              code: selectError.code,
              message: selectError.message,
              details: selectError.details,
              hint: selectError.hint,
              userId: userId
            });
            
            if (selectError.code !== 'PGRST116') {
              setSupabaseErrors(prev => prev + 1);
              return;
            }
          }

                      if (existingData && existingData.length > 0) {
              console.log('[UserTrackingContext] ✅ ACTUALIZANDO registro existente - Registros encontrados:', existingData.length, 'para userId:', userId);
            const { error: updateError } = await supabase
              .from('user_activity')
              .update({
                last_active: currentTime,
                is_online: true
              })
              .eq('user_id', userId);
            
            if (updateError) {
              console.error('[UserTrackingContext] Error en UPDATE:', {
                code: updateError.code,
                message: updateError.message,
                details: updateError.details,
                hint: updateError.hint,
                userId: userId
              });
              setSupabaseErrors(prev => prev + 1);
                          } else {
                console.log('[UserTrackingContext] ✅ UPDATE exitoso para userId:', userId);
              }
                      } else {
              console.log('[UserTrackingContext] 🆕 CREANDO nuevo registro - Registros encontrados:', existingData?.length || 0, 'para userId:', userId);
            const { error: insertError } = await supabase
              .from('user_activity')
              .insert({
                user_id: userId,
                last_active: currentTime,
                session_start: currentTime,
                is_online: true
              });
            
            if (insertError) {
              console.error('[UserTrackingContext] Error en INSERT:', {
                code: insertError.code,
                message: insertError.message,
                details: insertError.details,
                hint: insertError.hint,
                userId: userId
              });
              setSupabaseErrors(prev => prev + 1);
                          } else {
                console.log('[UserTrackingContext] 🆕 INSERT exitoso para userId:', userId);
              }
          }
        } catch (supabaseError) {
          setSupabaseErrors(prev => prev + 1);
        }
      }
    } catch (error) {
      console.error('[UserTrackingContext] Error crítico en updateActivity:', error);
    }
  };

  const initializeTracking = async () => {
    // Evitar inicialización múltiple si ya hay un usuario
    if (currentUser && !isLoading) {
      return;
    }

    try {
      setIsLoading(true);
      
      // Método 1: Intentar obtener desde Supabase
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // Obtener datos completos del usuario
        const { data: userData } = await supabase
          .from('users')
          .select('id, email, nombre_completo')
          .eq('id', session.user.id)
          .single();
        
        if (userData) {
          setCurrentUser(userData);
          setIsOnline(true);
          saveUserToStorage(userData);
          await updateActivity(userData.id);
          setIsLoading(false);
          return;
        }
      }

      // Método 2: Fallback a localStorage
      const storedUser = getUserFromStorage();
      if (storedUser) {
        setCurrentUser(storedUser);
        setIsOnline(true);
        setIsLoading(false);
        return;
      }

      setCurrentUser(null);
      setIsOnline(false);
      setIsLoading(false);
    } catch (error) {
      console.error('[UserTrackingContext] Error inicializando tracking:', error);
      
      // Fallback final a localStorage
      const storedUser = getUserFromStorage();
      if (storedUser) {
        setCurrentUser(storedUser);
        setIsOnline(true);
      } else {
        setCurrentUser(null);
        setIsOnline(false);
      }
      setIsLoading(false);
    }
  };

  // useEffect principal para inicialización (solo se ejecuta una vez)
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      if (mounted) {
        await initializeTracking();
      }
    };

    initialize();

    return () => {
      mounted = false;
    };
  }, []); // Sin dependencias - solo se ejecuta una vez

  // useEffect separado para tracking y eventos (depende de currentUser)
  useEffect(() => {
    if (!currentUser) return;

    let heartbeatInterval: NodeJS.Timeout;
    let activityTimeout: NodeJS.Timeout;

    const handleActivity = () => {
      updateActivity(currentUser.id);
      
      // Reiniciar el timeout de inactividad
      clearTimeout(activityTimeout);
      activityTimeout = setTimeout(() => {
        setIsOnline(false);
        // Marcar como offline en Supabase cuando se vuelve inactivo
        supabase
          .from('user_activity')
          .update({ is_online: false })
          .eq('user_id', currentUser.id)
          .then(({ error }) => {
            if (error) console.error('Error setting offline status:', error);
          });
      }, INACTIVITY_TIMEOUT);
    };

    // Configurar eventos de actividad
    const events = ['mousedown', 'keydown', 'mousemove', 'wheel', 'click', 'scroll'];
    events.forEach(event => document.addEventListener(event, handleActivity));

    // Configurar heartbeat
    heartbeatInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        updateActivity(currentUser.id);
      }
    }, HEARTBEAT_INTERVAL);

    // Cleanup
    return () => {
      events.forEach(event => document.removeEventListener(event, handleActivity));
      clearInterval(heartbeatInterval);
      clearTimeout(activityTimeout);
    };
  }, [currentUser?.id]); // Solo depende del ID del usuario

  // useEffect separado para listener de autenticación
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || !session?.user) {
          setCurrentUser(null);
          setIsOnline(false);
          setLastActivity(null);
          localStorage.removeItem(STORAGE_KEY);
          setSupabaseErrors(0); // Reset error count
          return;
        }

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setSupabaseErrors(0); // Reset error count on new session
          await initializeTracking();
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []); // Sin dependencias - el listener se configura una vez

  // useEffect para cleanup al desmontar
  useEffect(() => {
    return () => {
      // Marcar como offline al salir
      if (currentUser) {
        supabase
          .from('user_activity')
          .update({ is_online: false })
          .eq('user_id', currentUser.id);
      }
    };
  }, [currentUser?.id]);

  const value: UserTrackingContextType = {
    currentUser,
    isOnline,
    isLoading,
    lastActivity,
  };

  return (
    <UserTrackingContext.Provider value={value}>
      {children}
    </UserTrackingContext.Provider>
  );
}; 