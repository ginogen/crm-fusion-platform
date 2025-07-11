import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { cleanLogs } from '@/lib/utils'

// Limpiar logs automáticamente en producción
cleanLogs();

createRoot(document.getElementById("root")!).render(
  <App />
);
