// Re-exportar desde la instancia principal para evitar múltiples GoTrueClient
// Esta solución unifica todas las importaciones a una sola instancia con configuración optimizada
export { supabase } from '@/integrations/supabase/client' 