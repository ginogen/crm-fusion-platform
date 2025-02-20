import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { MainLayout } from "./components/layout/main-layout";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";

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

const queryClient = new QueryClient();

const RESTRICTED_POSITIONS = {
  ASESOR_TRAINING: 'Asesor Training'
} as const;

function App() {
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
                  <ProtectedRoute requiredPosition={[RESTRICTED_POSITIONS.ASESOR_TRAINING]}>
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
                <ProtectedRoute>
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

export default App;
