import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { MainLayout } from "./components/layout/main-layout";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { useAuth } from "@/lib/hooks/useAuth";
import { UserTrackingProvider, useUserTracking } from "@/contexts/UserTrackingContext";
import { useEffect } from "react";
import { logger } from "@/lib/utils";

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

const queryClient = new QueryClient();

const RESTRICTED_POSITIONS = {
  ASESOR_TRAINING: 'Asesor Training',
  CEO: 'CEO',
  DIRECTOR_INTERNACIONAL: 'Director Internacional',
  DIRECTOR_NACIONAL: 'Director Nacional'
} as const;

// Componente interno que usa el contexto de tracking
function AppContent() {
  const { session } = useAuth();
  const { currentUser, isOnline, isLoading } = useUserTracking();
  
  // Solo logear cuando hay cambios importantes
  useEffect(() => {
    if (currentUser && !isLoading) {
      logger.log('[App] UserTracking Context - Usuario inicializado:', currentUser);
      logger.log('[App] UserTracking Context - Estado:', { isOnline, isLoading });
    }
  }, [currentUser?.id, isOnline, isLoading]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router>
          <Routes>
            <Route path="/auth" element={<Auth />} />
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
    <UserTrackingProvider>
      <AppContent />
    </UserTrackingProvider>
  );
}

export default App;
