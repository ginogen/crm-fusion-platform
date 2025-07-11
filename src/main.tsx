import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { cleanLogs } from '@/lib/utils'
import { setupErrorHandlers, cleanConsoleErrors } from '@/utils/error-handler'

// Configurar manejadores de errores
setupErrorHandlers();
cleanConsoleErrors();

// Limpiar logs automáticamente en producción
cleanLogs();

createRoot(document.getElementById("root")!).render(
  <App />
);
