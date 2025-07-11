import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { MainLayout } from "./components/layout/main-layout";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { useAuth } from "@/lib/hooks/useAuth";
import { UserTrackingProvider, useUserTracking } from "@/contexts/UserTrackingContext";
import { useEffect, useState } from "react";
import { logger } from "@/lib/utils";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { supabase, checkConnection, reconnectSupabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Pages
import Dashboard from "./pages/Dashboard";
import Datos from "./pages/Datos";
import Campanas from "./pages/Campanas";
import Reasignar from "./pages/Reasignar";
import Informes from "./pages/Informes";
import Organizacion from "./pages/Organizacion";
import Usuarios from "./pages/Usuarios";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import TimeControl from "./pages/TimeControl";

// Configuración del QueryClient con manejo de errores de conexión
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos
      gcTime: 10 * 60 * 1000, // 10 minutos
      retry: (failureCount, error) => {
        // Reintentar hasta 3 veces para errores de conexión
        if (failureCount < 3) {
          const isConnectionError = error?.message?.includes('fetch') || 
                                  error?.message?.includes('network') ||
                                  error?.message?.includes('timeout');
          return isConnectionError;
        }
        return false;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      networkMode: 'offlineFirst',
    },
  },
});

const RESTRICTED_POSITIONS = {
  ASESOR_TRAINING: 'Asesor Training',
  CEO: 'CEO',
  DIRECTOR_INTERNACIONAL: 'Director Internacional',
  DIRECTOR_NACIONAL: 'Director Nacional'
} as const;

// Hook para monitorear la conexión
const useConnectionMonitor = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(true);
  const [lastCheck, setLastCheck] = useState(Date.now());

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Solo verificar conexión si han pasado más de 2 minutos desde la última verificación
      if (Date.now() - lastCheck > 120000) {
        checkSupabaseConnection();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsSupabaseConnected(false);
    };

    const checkSupabaseConnection = async () => {
      try {
        const connected = await checkConnection();
        setIsSupabaseConnected(connected);
        setLastCheck(Date.now());
        
        if (!connected) {
          console.log('🔄 Intentando reconectar...');
          await reconnectSupabase();
          setIsSupabaseConnected(true);
        }
      } catch (error) {
        console.error('❌ Error verificando conexión:', error);
        setIsSupabaseConnected(false);
      }
    };

    // Verificar conexión cada 5 minutos en lugar de 30 segundos
    const connectionInterval = setInterval(() => {
      // Solo verificar si la página está visible y han pasado al menos 2 minutos
      if (!document.hidden && Date.now() - lastCheck > 120000) {
        checkSupabaseConnection();
      }
    }, 300000); // 5 minutos

    // Listeners para cambios de conectividad
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Verificación inicial solo si la página está visible
    if (!document.hidden) {
      checkSupabaseConnection();
    }

    return () => {
      clearInterval(connectionInterval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [lastCheck]);

  return { isOnline, isSupabaseConnected };
};

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🔥 Error crítico en la aplicación:', error, errorInfo);
    logger.error('Error crítico capturado:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center space-y-4 p-8 bg-white rounded-lg shadow-lg max-w-md">
            <div className="text-red-500 text-6xl mb-4">💥</div>
            <h2 className="text-xl font-bold text-gray-800">Algo salió mal</h2>
            <p className="text-gray-600">
              La aplicación encontró un error inesperado. Por favor, recarga la página.
            </p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              Recargar Aplicación
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Componente para manejar errores de recursos (CSS, etc.)
const ResourceErrorHandler = ({ children }: { children: React.ReactNode }) => {
  const [hasResourceError, setHasResourceError] = useState(false);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      // Capturar errores de recursos como CSS, JS, etc.
      if (event.filename && (event.filename.includes('.css') || event.filename.includes('.js'))) {
        console.warn('⚠️ Error cargando recurso:', event.filename, event.message);
        setHasResourceError(true);
      }
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasResourceError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4 p-8 bg-white rounded-lg shadow-lg max-w-md">
          <div className="text-yellow-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800">Error de Recursos</h2>
          <p className="text-gray-600">
            Algunos recursos no se cargaron correctamente. Esto puede ser temporal.
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Recargar Página
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

// Componente de estado de conexión
const ConnectionStatus = ({ isOnline, isSupabaseConnected }: { isOnline: boolean; isSupabaseConnected: boolean }) => {
  if (isOnline && isSupabaseConnected) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-white text-center py-2 text-sm">
      {!isOnline ? (
        "⚠️ Sin conexión a internet"
      ) : !isSupabaseConnected ? (
        "⚠️ Problemas de conexión con el servidor - Reintentando..."
      ) : null}
    </div>
  );
};

// Componente interno que usa el contexto de tracking
function AppContent() {
  const { session } = useAuth();
  const { currentUser, isOnline, isLoading } = useUserTracking();
  const { isOnline: networkOnline, isSupabaseConnected } = useConnectionMonitor();
  const [appReady, setAppReady] = useState(false);

  // Verificar que la aplicación esté lista
  useEffect(() => {
    const checkAppReady = async () => {
      console.log('🚀 Inicializando aplicación...');
      
      // Verificar variables de entorno críticas
      const requiredEnvVars = [
        'VITE_SUPABASE_URL',
        'VITE_SUPABASE_ANON_KEY'
      ];
      
      const missingVars = requiredEnvVars.filter(varName => !import.meta.env[varName]);
      
      if (missingVars.length > 0) {
        console.error('❌ Variables de entorno faltantes:', missingVars);
        toast.error('Error de configuración: Variables de entorno faltantes');
        return;
      }

      console.log('✅ Variables de entorno verificadas');
      
      // Verificar conexión con Supabase
      try {
        const connected = await checkConnection();
        if (!connected) {
          console.warn('⚠️ Problemas de conexión inicial con Supabase');
        }
      } catch (error) {
        console.error('❌ Error verificando conexión inicial:', error);
      }
      
      // Dar tiempo para que UserTrackingContext inicialice
      setTimeout(() => {
        setAppReady(true);
        console.log('✅ Aplicación lista');
      }, 1000);
    };

    checkAppReady();
  }, []);

  // Mostrar notificación cuando se pierde la conexión
  useEffect(() => {
    if (!networkOnline) {
      toast.error('Conexión perdida. Verificando...', { duration: 3000 });
    } else if (!isSupabaseConnected) {
      toast.warning('Problemas de conexión con el servidor', { duration: 3000 });
    }
  }, [networkOnline, isSupabaseConnected]);
  
  // Solo logear cuando hay cambios importantes
  useEffect(() => {
    if (currentUser && !isLoading) {
      logger.log('[App] UserTracking Context - Usuario inicializado:', currentUser);
      logger.log('[App] UserTracking Context - Estado:', { isOnline, isLoading });
    }
  }, [currentUser?.id, isOnline, isLoading]);

  // Mostrar pantalla de carga si la app no está lista
  if (!appReady || isLoading) {
    return <LoadingScreen message="Inicializando aplicación..." />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ConnectionStatus isOnline={networkOnline} isSupabaseConnected={isSupabaseConnected} />
        <Router>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/facebook/callback" element={
              <div className="min-h-screen flex items-center justify-center">
                <LoadingScreen message="Conectando con Facebook..." />
              </div>
            } />
            <Route path="/" element={<MainLayout />}>
              <Route index element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route 
                path="organizacion" 
                element={
                  <ProtectedRoute requiredPosition={[
                    RESTRICTED_POSITIONS.CEO,
                    RESTRICTED_POSITIONS.DIRECTOR_INTERNACIONAL,
                    RESTRICTED_POSITIONS.DIRECTOR_NACIONAL
                  ]}>
                    <Organizacion />
                  </ProtectedRoute>
                } 
              />
              <Route path="datos" element={
                <ProtectedRoute>
                  <Datos />
                </ProtectedRoute>
              } />
              <Route path="campanas" element={
                <ProtectedRoute requiredPosition={[
                  RESTRICTED_POSITIONS.CEO,
                  RESTRICTED_POSITIONS.DIRECTOR_INTERNACIONAL,
                  RESTRICTED_POSITIONS.DIRECTOR_NACIONAL
                ]}>
                  <Campanas />
                </ProtectedRoute>
              } />
              <Route path="reasignar" element={
                <ProtectedRoute>
                  <Reasignar />
                </ProtectedRoute>
              } />
              <Route path="informes" element={
                <ProtectedRoute>
                  <Informes />
                </ProtectedRoute>
              } />
              <Route path="usuarios" element={
                <ProtectedRoute>
                  <Usuarios />
                </ProtectedRoute>
              } />
              <Route path="time-control" element={
                <ProtectedRoute requiredPosition={[
                  RESTRICTED_POSITIONS.CEO,
                  RESTRICTED_POSITIONS.DIRECTOR_INTERNACIONAL,
                  RESTRICTED_POSITIONS.DIRECTOR_NACIONAL
                ]}>
                  <TimeControl />
                </ProtectedRoute>
              } />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Router>
        <Toaster />
        <Sonner />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ResourceErrorHandler>
        <UserTrackingProvider>
          <AppContent />
        </UserTrackingProvider>
      </ResourceErrorHandler>
    </ErrorBoundary>
  );
}

export default App;
