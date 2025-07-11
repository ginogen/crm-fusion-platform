import { logger } from '@/lib/utils';

// Lista de errores conocidos que no son críticos
const NON_CRITICAL_ERRORS = [
  'Auth session missing',
  'Failed to load resource',
  'net::ERR_CONNECTION_REFUSED',
  'net::ERR_NETWORK',
  'net::ERR_TIMED_OUT',
];

// Función para verificar si un error es crítico
export const isCriticalError = (error: Error | string): boolean => {
  const errorMessage = typeof error === 'string' ? error : error.message;
  return !NON_CRITICAL_ERRORS.some(nonCritical => 
    errorMessage.includes(nonCritical)
  );
};

// Función para manejar errores de recursos
export const handleResourceError = (event: ErrorEvent) => {
  const { filename, message, error } = event;
  
  // Filtrar errores de recursos que no son críticos
  if (filename && (filename.includes('.css') || filename.includes('.js'))) {
    console.warn('⚠️ Error cargando recurso:', { filename, message });
    
    // No bloquear la aplicación por errores de CSS
    if (filename.includes('.css')) {
      logger.warn('CSS resource error:', { filename, message });
      return false; // No propagar el error
    }
  }
  
  // Para otros errores, permitir el comportamiento normal
  return true;
};

// Función para configurar el manejador global de errores
export const setupErrorHandlers = () => {
  // Manejador para errores de recursos
  window.addEventListener('error', (event) => {
    if (!handleResourceError(event)) {
      event.preventDefault();
    }
  });

  // Manejador para promesas rechazadas
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason;
    
    if (error && typeof error === 'object' && 'message' in error) {
      const errorMessage = error.message as string;
      
      // No bloquear por errores de autenticación
      if (errorMessage.includes('Auth session missing')) {
        console.warn('⚠️ Auth session error (non-critical):', errorMessage);
        event.preventDefault();
        return;
      }
      
      // No bloquear por errores de red temporales
      if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
        console.warn('⚠️ Network error (non-critical):', errorMessage);
        event.preventDefault();
        return;
      }
    }
    
    // Para errores críticos, permitir el comportamiento normal
    logger.error('Unhandled promise rejection:', event.reason);
  });

  console.log('✅ Error handlers configured');
};

// Función para limpiar errores de la consola
export const cleanConsoleErrors = () => {
  // Interceptar console.error para filtrar errores no críticos
  const originalError = console.error;
  console.error = (...args) => {
    const message = args.join(' ');
    
    // No mostrar errores de sesión faltante en consola
    if (message.includes('Auth session missing')) {
      console.warn('⚠️ Auth session missing (expected during initialization)');
      return;
    }
    
    // No mostrar errores de CSS en consola
    if (message.includes('Failed to load resource') && message.includes('.css')) {
      console.warn('⚠️ CSS resource loading issue (non-critical)');
      return;
    }
    
    // Mostrar otros errores normalmente
    originalError.apply(console, args);
  };
}; 