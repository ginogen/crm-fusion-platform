-- Optimizaciones de Base de Datos para Múltiples Usuarios (80+)
-- Ejecutar en el panel SQL de Supabase

-- ==============================
-- ÍNDICES PARA RENDIMIENTO
-- ==============================

-- Índice para usuarios activos (usado frecuentemente en queries)
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active) WHERE is_active = true;

-- Índice para búsquedas por posición
CREATE INDEX IF NOT EXISTS idx_users_position ON users(user_position) WHERE is_active = true;

-- Índice para jerarquía de usuarios
CREATE INDEX IF NOT EXISTS idx_users_supervisor ON users(supervisor_id) WHERE is_active = true;

-- Índice para estructura de usuarios
CREATE INDEX IF NOT EXISTS idx_users_estructura ON users(estructura_id) WHERE is_active = true;

-- Índice para actividad de usuario por user_id
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity(user_id);

-- Índice para usuarios online
CREATE INDEX IF NOT EXISTS idx_user_activity_online ON user_activity(is_online, last_activity);

-- Índice compuesto para consultas frecuentes de actividad
CREATE INDEX IF NOT EXISTS idx_user_activity_composite ON user_activity(user_id, is_online, last_activity);

-- Índice para registros de tiempo por usuario
CREATE INDEX IF NOT EXISTS idx_user_time_records_user_id ON user_time_records(user_id);

-- Índice para leads asignados
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);

-- Índice para leads por estado
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);

-- Índice para leads por fecha
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);

-- Índice para campañas
CREATE INDEX IF NOT EXISTS idx_campaign_leads_campaign_id ON campaign_leads(campaign_id);

-- Índice para lotes de leads
CREATE INDEX IF NOT EXISTS idx_leads_batch_id ON leads(batch_id);

-- ==============================
-- POLÍTICAS RLS OPTIMIZADAS
-- ==============================

-- Optimizar política de user_activity
DROP POLICY IF EXISTS "All authenticated users can insert their activity" ON user_activity;
DROP POLICY IF EXISTS "Optimized user activity insert" ON user_activity;

CREATE POLICY "Optimized user activity insert" 
ON user_activity FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND is_active = true
  )
);

-- Política optimizada para SELECT en user_activity
DROP POLICY IF EXISTS "Users can view their own activity" ON user_activity;
CREATE POLICY "Users can view their own activity" 
ON user_activity FOR SELECT 
USING (
  auth.uid() = user_id 
  OR 
  -- Permitir que supervisores vean actividad de sus subordinados
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = user_id 
    AND supervisor_id = auth.uid()
  )
);

-- Política optimizada para UPDATE en user_activity
DROP POLICY IF EXISTS "Users can update their own activity" ON user_activity;
CREATE POLICY "Users can update their own activity" 
ON user_activity FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ==============================
-- CONFIGURACIÓN DE PERFORMANCE
-- ==============================

-- Ajustar configuraciones de PostgreSQL para múltiples usuarios
-- Estas configuraciones se deben aplicar en Supabase Dashboard > Settings > Database

-- Configurar connection pooling
-- En Supabase Dashboard > Settings > Database > Connection Pooling
-- Pool Size: 30
-- Pool Mode: Transaction
-- Pool Timeout: 30s

-- ==============================
-- FUNCIONES OPTIMIZADAS
-- ==============================

-- Función para obtener usuarios activos con estructura
CREATE OR REPLACE FUNCTION get_active_users_with_structure()
RETURNS TABLE (
  id uuid,
  email text,
  nombre_completo text,
  user_position text,
  estructura_id uuid,
  estructura_nombre text,
  is_online boolean,
  last_activity timestamp with time zone
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.nombre_completo,
    u.user_position,
    u.estructura_id,
    e.nombre as estructura_nombre,
    COALESCE(ua.is_online, false) as is_online,
    ua.last_activity
  FROM users u
  LEFT JOIN estructuras e ON u.estructura_id = e.id
  LEFT JOIN user_activity ua ON u.id = ua.user_id
  WHERE u.is_active = true
  ORDER BY u.created_at DESC;
END;
$$;

-- Función para actualizar actividad de usuario (optimizada)
CREATE OR REPLACE FUNCTION update_user_activity(
  p_user_id uuid,
  p_is_online boolean DEFAULT true,
  p_activity_type text DEFAULT 'active'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO user_activity (user_id, is_online, activity_type, last_activity)
  VALUES (p_user_id, p_is_online, p_activity_type, NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    is_online = EXCLUDED.is_online,
    activity_type = EXCLUDED.activity_type,
    last_activity = EXCLUDED.last_activity;
END;
$$;

-- ==============================
-- LIMPIEZA DE DATOS ANTIGUOS
-- ==============================

-- Función para limpiar registros de actividad antiguos (más de 30 días)
CREATE OR REPLACE FUNCTION cleanup_old_activity_records()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM user_activity 
  WHERE last_activity < NOW() - INTERVAL '30 days';
  
  -- Log de limpieza
  INSERT INTO user_activity (user_id, activity_type, last_activity)
  SELECT 
    '00000000-0000-0000-0000-000000000000'::uuid,
    'cleanup_completed',
    NOW()
  WHERE NOT EXISTS (
    SELECT 1 FROM user_activity 
    WHERE user_id = '00000000-0000-0000-0000-000000000000'::uuid 
    AND activity_type = 'cleanup_completed'
    AND last_activity > NOW() - INTERVAL '1 day'
  );
END;
$$;

-- ==============================
-- ANÁLISIS DE RENDIMIENTO
-- ==============================

-- Vista para monitorear rendimiento de queries
CREATE OR REPLACE VIEW query_performance AS
SELECT 
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation
FROM pg_stats 
WHERE schemaname = 'public'
AND tablename IN ('users', 'user_activity', 'leads', 'user_time_records');

-- Vista para monitorear uso de índices
CREATE OR REPLACE VIEW index_usage AS
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- ==============================
-- COMENTARIOS FINALES
-- ==============================

-- Para aplicar estas optimizaciones:
-- 1. Ejecutar este script en Supabase SQL Editor
-- 2. Configurar connection pooling en Dashboard
-- 3. Monitorear rendimiento con las vistas creadas
-- 4. Programar limpieza automática de datos antiguos

-- Monitoreo recomendado:
-- SELECT * FROM query_performance;
-- SELECT * FROM index_usage;
-- SELECT COUNT(*) FROM user_activity WHERE last_activity > NOW() - INTERVAL '1 hour'; 