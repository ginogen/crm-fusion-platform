import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/utils';

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
// OPTIMIZACIÓN: Aumentar intervalo de heartbeat de 2 a 5 minutos
const HEARTBEAT_INTERVAL = 300000; // 5 minutos (era 2 minutos)
const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutos
// OPTIMIZACIÓN: Reducir reintentos para fallar más rápido
const SUPABASE_RETRY_LIMIT = 1; // 1 reintento (era 3)
// OPTIMIZACIÓN: Añadir throttling para updateActivity
const ACTIVITY_THROTTLE_MS = 30000; // Máximo cada 30 segundos

// OPTIMIZACIÓN: Timeouts más largos para producción
const PRODUCTION_TIMEOUT = 30000; // 30 segundos para producción
const DEVELOPMENT_TIMEOUT = 10000; // 10 segundos para desarrollo

// OPTIMIZACIÓN: Determinar si estamos en producción para reducir logs
const isDevelopment = import.meta.env.DEV;
const QUERY_TIMEOUT = isDevelopment ? DEVELOPMENT_TIMEOUT : PRODUCTION_TIMEOUT;

export const UserTrackingProvider: React.FC<UserTrackingProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<TrackingUser | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastActivity, setLastActivity] = useState<Date | null>(null);
  const [supabaseErrors, setSupabaseErrors] = useState(0);
  
  // OPTIMIZACIÓN: Refs para throttling y control de estado
  const lastUpdateRef = useRef<number>(0);
  const isTabActiveRef = useRef<boolean>(true);

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

  const saveUserToStorage = useCallback((user: TrackingUser) => {
    const userData = {
      ...user,
      lastActivity: new Date().toISOString(),
      sessionStart: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
    setLastActivity(new Date());
  }, []);

  // OPTIMIZACIÓN: Función updateActivity optimizada con throttling
  const updateActivity = useCallback(async (userId: string, force: boolean = false) => {
    try {
      const now = Date.now();
      
      // OPTIMIZACIÓN: Throttling - solo actualizar si han pasado 30 segundos o es forzado
      if (!force && (now - lastUpdateRef.current < ACTIVITY_THROTTLE_MS)) {
        return;
      }
      
      // OPTIMIZACIÓN: No actualizar si la pestaña no está activa (excepto si es forzado)
      if (!force && !isTabActiveRef.current) {
        return;
      }

      lastUpdateRef.current = now;
      
      // OPTIMIZACIÓN: Reducir logs en producción
      logger.log('[UserTrackingContext] updateActivity iniciado para userId:', userId);
      
      // Verificar autenticación actual
      const { data: { session } } = await supabase.auth.getSession();
      
      logger.log('[UserTrackingContext] Sesión actual:', {
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
          logger.log('[UserTrackingContext] Intentando SELECT en user_activity para userId:', userId);
          
          const { data: existingData, error: selectError } = await supabase
            .from('user_activity')
            .select('id, last_active')
            .eq('user_id', userId)
            .order('last_active', { ascending: false })
            .limit(1);

          if (selectError) {
            logger.error('[UserTrackingContext] Error en SELECT:', {
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
            logger.log('[UserTrackingContext] ✅ ACTUALIZANDO registro existente - Registros encontrados:', existingData.length, 'para userId:', userId);
            
            const { error: updateError } = await supabase
              .from('user_activity')
              .update({
                last_active: currentTime,
                is_online: true
              })
              .eq('user_id', userId);
            
            if (updateError) {
              logger.error('[UserTrackingContext] Error en UPDATE:', {
                code: updateError.code,
                message: updateError.message,
                details: updateError.details,
                hint: updateError.hint,
                userId: userId
              });
              setSupabaseErrors(prev => prev + 1);
            } else {
              logger.log('[UserTrackingContext] ✅ UPDATE exitoso para userId:', userId);
            }
          } else {
            logger.log('[UserTrackingContext] 🆕 CREANDO nuevo registro - Registros encontrados:', existingData?.length || 0, 'para userId:', userId);
            
            const { error: insertError } = await supabase
              .from('user_activity')
              .insert({
                user_id: userId,
                last_active: currentTime,
                session_start: currentTime,
                is_online: true
              });
            
            if (insertError) {
              logger.error('[UserTrackingContext] Error en INSERT:', {
                code: insertError.code,
                message: insertError.message,
                details: insertError.details,
                hint: insertError.hint,
                userId: userId
              });
              setSupabaseErrors(prev => prev + 1);
            } else {
              logger.log('[UserTrackingContext] 🆕 INSERT exitoso para userId:', userId);
            }
          }
        } catch (supabaseError) {
          setSupabaseErrors(prev => prev + 1);
        }
      }
    } catch (error) {
      logger.error('[UserTrackingContext] Error crítico en updateActivity:', error);
    }
  }, [supabaseErrors]);

  const initializeTracking = useCallback(async () => {
    // Evitar inicialización múltiple si ya hay un usuario
    if (currentUser && !isLoading) {
      return;
    }

    // Configurar timeout para evitar cuelgues
    const timeoutId = setTimeout(() => {
      console.warn('⚠️ UserTrackingContext: Timeout en inicialización');
      setIsLoading(false);
    }, QUERY_TIMEOUT);

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
          await updateActivity(userData.id, true); // Forzar primera actualización
          setIsLoading(false);
          clearTimeout(timeoutId);
          return;
        }
      }

      // Método 2: Fallback a localStorage
      const storedUser = getUserFromStorage();
      if (storedUser) {
        setCurrentUser(storedUser);
        setIsOnline(true);
        setIsLoading(false);
        clearTimeout(timeoutId);
        return;
      }

      setCurrentUser(null);
      setIsOnline(false);
      setIsLoading(false);
      clearTimeout(timeoutId);
    } catch (error) {
      logger.error('[UserTrackingContext] Error inicializando tracking:', error);
      
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
      clearTimeout(timeoutId);
    }
  }, [currentUser, isLoading, saveUserToStorage, updateActivity]);

  // OPTIMIZACIÓN: Memoizar el handler de actividad con throttling integrado
  const handleActivity = useCallback(() => {
    if (!currentUser) return;
    
    // Actualizar último tiempo de actividad local inmediatamente
    setLastActivity(new Date());
    
    // La función updateActivity ya tiene throttling interno
    updateActivity(currentUser.id);
  }, [currentUser, updateActivity]);

  // OPTIMIZACIÓN: Función para manejar cambios de visibilidad de pestaña
  const handleVisibilityChange = useCallback(() => {
    isTabActiveRef.current = !document.hidden;
    
    // Si la pestaña se vuelve activa, forzar una actualización
    if (!document.hidden && currentUser) {
      updateActivity(currentUser.id, true);
    }
  }, [currentUser, updateActivity]);

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

    const handleInactivity = () => {
      setIsOnline(false);
      // Marcar como offline en Supabase cuando se vuelve inactivo
      supabase
        .from('user_activity')
        .update({ is_online: false })
        .eq('user_id', currentUser.id)
        .then(({ error }) => {
          if (error) {
            logger.error('Error setting offline status:', error);
          }
        });
    };

    const wrappedHandleActivity = () => {
      handleActivity();
      
      // Reiniciar el timeout de inactividad
      clearTimeout(activityTimeout);
      activityTimeout = setTimeout(handleInactivity, INACTIVITY_TIMEOUT);
    };

    // OPTIMIZACIÓN: Reducir eventos solo a los más importantes
    const events = ['mousedown', 'keydown', 'click', 'focus']; // Removidos: mousemove, wheel, scroll
    events.forEach(event => document.addEventListener(event, wrappedHandleActivity, { passive: true }));

    // OPTIMIZACIÓN: Añadir listener para cambios de visibilidad de pestaña
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Configurar heartbeat optimizado
    heartbeatInterval = setInterval(() => {
      // OPTIMIZACIÓN: Solo hacer heartbeat si la pestaña está visible y activa
      if (document.visibilityState === 'visible' && isTabActiveRef.current) {
        updateActivity(currentUser.id, true); // Forzar heartbeat
      }
    }, HEARTBEAT_INTERVAL);

    // Inicializar timeout de inactividad
    activityTimeout = setTimeout(handleInactivity, INACTIVITY_TIMEOUT);

    // Cleanup
    return () => {
      events.forEach(event => document.removeEventListener(event, wrappedHandleActivity));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(heartbeatInterval);
      clearTimeout(activityTimeout);
    };
  }, [currentUser?.id, handleActivity, handleVisibilityChange, updateActivity]); // Solo depende del ID del usuario y handlers memoizados

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
  }, [initializeTracking]); // Sin dependencias - el listener se configura una vez

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

  // OPTIMIZACIÓN: Memoizar el value del contexto
  const value = useMemo<UserTrackingContextType>(() => ({
    currentUser,
    isOnline,
    isLoading,
    lastActivity,
  }), [currentUser, isOnline, isLoading, lastActivity]);

  return (
    <UserTrackingContext.Provider value={value}>
      {children}
    </UserTrackingContext.Provider>
  );
}; 