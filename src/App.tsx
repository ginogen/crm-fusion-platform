
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MainLayout } from "./components/layout/main-layout";

// Pages
import Dashboard from "./pages/Dashboard";
import Datos from "./pages/Datos";
import Campanas from "./pages/Campanas";
import Reasignar from "./pages/Reasignar";
import Informes from "./pages/Informes";
import Organizacion from "./pages/Organizacion";
import Usuarios from "./pages/Usuarios";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <MainLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/datos" element={<Datos />} />
            <Route path="/campanas" element={<Campanas />} />
            <Route path="/reasignar" element={<Reasignar />} />
            <Route path="/informes" element={<Informes />} />
            <Route path="/organizacion" element={<Organizacion />} />
            <Route path="/usuarios" element={<Usuarios />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </MainLayout>
      </BrowserRouter>
      <Toaster />
      <Sonner />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
