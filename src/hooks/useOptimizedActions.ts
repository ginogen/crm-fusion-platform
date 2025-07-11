import { useCallback, useRef, useMemo } from 'react';

/**
 * Hook para throttling - limita la frecuencia de ejecución de una función
 * Útil para acciones como tracking de actividad, actualización de estado, etc.
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastRun = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now();
      const shouldExecute = now - lastRun.current >= delay;

      if (shouldExecute) {
        lastRun.current = now;
        callback(...args);
      } else {
        // Programar ejecución para el final del período de throttle
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        
        timeoutRef.current = setTimeout(() => {
          lastRun.current = Date.now();
          callback(...args);
        }, delay - (now - lastRun.current));
      }
    }) as T,
    [callback, delay]
  );
}

/**
 * Hook para debouncing - retrasa la ejecución hasta que no haya actividad
 * Útil para búsquedas, validaciones, etc.
 */
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    }) as T,
    [callback, delay]
  );
}

/**
 * Hook para throttling específico de actividad de usuario
 * Optimizado para tracking de múltiples usuarios
 */
export function useUserActivityThrottle(
  callback: (activity: string, data?: any) => void,
  delay: number = 60000 // 1 minuto por defecto
) {
  const lastActivity = useRef<string>('');
  const lastData = useRef<any>(null);

  return useThrottle(
    useCallback((activity: string, data?: any) => {
      // Solo ejecutar si la actividad cambió o si es una actividad importante
      const isImportantActivity = ['login', 'logout', 'session_start', 'session_end'].includes(activity);
      const activityChanged = lastActivity.current !== activity || 
                             JSON.stringify(lastData.current) !== JSON.stringify(data);

      if (isImportantActivity || activityChanged) {
        lastActivity.current = activity;
        lastData.current = data;
        callback(activity, data);
      }
    }, [callback]),
    delay
  );
}

/**
 * Hook para debouncing específico de búsquedas
 * Optimizado para búsquedas frecuentes con múltiples usuarios
 */
export function useSearchDebounce(
  callback: (searchTerm: string) => void,
  delay: number = 300
) {
  const lastSearchTerm = useRef<string>('');

  return useDebounce(
    useCallback((searchTerm: string) => {
      // Solo ejecutar si el término de búsqueda cambió
      if (lastSearchTerm.current !== searchTerm) {
        lastSearchTerm.current = searchTerm;
        callback(searchTerm);
      }
    }, [callback]),
    delay
  );
}

/**
 * Hook para throttling de mutaciones de base de datos
 * Evita mutaciones excesivas que puedan saturar la conexión
 */
export function useDatabaseMutationThrottle<T extends (...args: any[]) => Promise<any>>(
  mutationFn: T,
  delay: number = 2000 // 2 segundos por defecto
) {
  const pendingMutations = useRef<Map<string, { args: Parameters<T>; resolve: Function; reject: Function }>>(new Map());
  const isExecuting = useRef<boolean>(false);

  return useCallback(
    async (...args: Parameters<T>): Promise<ReturnType<T>> => {
      const mutationKey = JSON.stringify(args);
      
      return new Promise((resolve, reject) => {
        // Si ya hay una mutación pendiente con los mismos argumentos, reemplazarla
        pendingMutations.current.set(mutationKey, { args, resolve, reject });

        if (!isExecuting.current) {
          isExecuting.current = true;
          
          setTimeout(async () => {
            const mutations = Array.from(pendingMutations.current.entries());
            pendingMutations.current.clear();
            isExecuting.current = false;

            // Ejecutar todas las mutaciones pendientes
            for (const [key, { args, resolve, reject }] of mutations) {
              try {
                const result = await mutationFn(...args);
                resolve(result);
              } catch (error) {
                reject(error);
              }
            }
          }, delay);
        }
      });
    },
    [mutationFn, delay]
  );
}

/**
 * Hook para memoización inteligente basada en dependencias
 * Útil para optimizar componentes con múltiples usuarios
 */
export function useIntelligentMemo<T>(
  factory: () => T,
  deps: React.DependencyList,
  equalityFn?: (a: T, b: T) => boolean
): T {
  const memoizedValue = useRef<T>();
  const previousDeps = useRef<React.DependencyList>();

  return useMemo(() => {
    const depsChanged = !previousDeps.current || 
                       deps.some((dep, index) => dep !== previousDeps.current![index]);

    if (depsChanged) {
      const newValue = factory();
      
      if (equalityFn && memoizedValue.current && !equalityFn(memoizedValue.current, newValue)) {
        memoizedValue.current = newValue;
      } else if (!equalityFn) {
        memoizedValue.current = newValue;
      }
      
      previousDeps.current = deps;
    }

    return memoizedValue.current!;
  }, deps);
}

/**
 * Hook para optimización de eventos de ventana
 * Útil para manejar eventos como scroll, resize, etc. con múltiples usuarios
 */
export function useOptimizedWindowEvent(
  eventName: string,
  handler: (event: Event) => void,
  options: {
    throttle?: number;
    debounce?: number;
    passive?: boolean;
  } = {}
) {
  const { throttle, debounce, passive = true } = options;
  
  const optimizedHandler = useMemo(() => {
    if (throttle) {
      return useThrottle(handler, throttle);
    }
    if (debounce) {
      return useDebounce(handler, debounce);
    }
    return handler;
  }, [handler, throttle, debounce]);

  const handleWindowEvent = useCallback((event: Event) => {
    optimizedHandler(event);
  }, [optimizedHandler]);

  // Configurar el listener de eventos
  useMemo(() => {
    window.addEventListener(eventName, handleWindowEvent, { passive });
    return () => window.removeEventListener(eventName, handleWindowEvent);
  }, [eventName, handleWindowEvent, passive]);
}

/**
 * Hook para limitar el número de operaciones concurrentes
 * Útil para evitar sobrecarga en operaciones costosas
 */
export function useConcurrencyLimit<T extends (...args: any[]) => Promise<any>>(
  operation: T,
  maxConcurrent: number = 3
) {
  const runningOperations = useRef<number>(0);
  const pendingQueue = useRef<Array<{ args: Parameters<T>; resolve: Function; reject: Function }>>([]);

  return useCallback(
    async (...args: Parameters<T>): Promise<ReturnType<T>> => {
      return new Promise((resolve, reject) => {
        const executeOperation = async () => {
          runningOperations.current++;
          
          try {
            const result = await operation(...args);
            resolve(result);
          } catch (error) {
            reject(error);
          } finally {
            runningOperations.current--;
            
            // Ejecutar próxima operación en cola
            if (pendingQueue.current.length > 0) {
              const next = pendingQueue.current.shift()!;
              executeOperation.call(null, ...next.args);
            }
          }
        };

        if (runningOperations.current < maxConcurrent) {
          executeOperation();
        } else {
          pendingQueue.current.push({ args, resolve, reject });
        }
      });
    },
    [operation, maxConcurrent]
  );
} 