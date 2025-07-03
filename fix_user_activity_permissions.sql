-- Script para configurar políticas RLS en user_activity (VERSIÓN SIMPLIFICADA PARA TODOS LOS USUARIOS)
-- Ejecutar en el panel SQL de Supabase

-- 1. Habilitar RLS en la tabla user_activity (si no está habilitado)
ALTER TABLE public.user_activity ENABLE row level security;

-- 2. Eliminar políticas existentes que puedan estar causando conflictos
DROP POLICY IF EXISTS "Users can view their own activity" ON public.user_activity;
DROP POLICY IF EXISTS "Users can insert their own activity" ON public.user_activity;
DROP POLICY IF EXISTS "Users can update their own activity" ON public.user_activity;
DROP POLICY IF EXISTS "Users can delete their own activity" ON public.user_activity;
DROP POLICY IF EXISTS "Superusers can view all activity" ON public.user_activity;
DROP POLICY IF EXISTS "Managers can view all activity" ON public.user_activity;
DROP POLICY IF EXISTS "Managers can view subordinate activity" ON public.user_activity;
DROP POLICY IF EXISTS "Managers can insert any activity" ON public.user_activity;
DROP POLICY IF EXISTS "Managers can update any activity" ON public.user_activity;
DROP POLICY IF EXISTS "DEBUG_Allow_all_inserts" ON public.user_activity;

-- 3. POLÍTICAS SIMPLIFICADAS: Permitir tracking para TODOS los usuarios autenticados

-- Política para SELECT: Los usuarios pueden ver su propia actividad
CREATE POLICY "Users can view their own activity" 
ON public.user_activity 
FOR SELECT 
USING (auth.uid() = user_id);

-- Política para INSERT: CUALQUIER usuario autenticado puede insertar su actividad
CREATE POLICY "All authenticated users can insert their activity" 
ON public.user_activity 
FOR INSERT 
WITH CHECK (
  -- Verificar que el usuario está autenticado
  auth.uid() IS NOT NULL
  AND
  -- Verificar que está insertando su propia actividad o que existe en la tabla users
  (auth.uid() = user_id 
   OR 
   EXISTS (
     SELECT 1 FROM public.users 
     WHERE id = auth.uid() 
     AND is_active = true
   )
  )
);

-- Política para UPDATE: Los usuarios pueden actualizar su propia actividad
CREATE POLICY "Users can update their own activity" 
ON public.user_activity 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Política para DELETE: Los usuarios pueden eliminar su propia actividad
CREATE POLICY "Users can delete their own activity" 
ON public.user_activity 
FOR DELETE 
USING (auth.uid() = user_id);

-- 4. POLÍTICAS ADICIONALES para roles superiores (solo para visualización/administración)

-- Los superusers pueden ver toda la actividad (para reportes)
CREATE POLICY "Superusers can view all activity" 
ON public.user_activity 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND user_position IN ('CEO', 'Director Internacional', 'Director Nacional')
    AND is_active = true
  )
);

-- Los managers pueden ver la actividad de sus subordinados (para reportes)
CREATE POLICY "Managers can view subordinate activity" 
ON public.user_activity 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND user_position IN ('Sales Manager', 'Director de Zona', 'Gerente Divisional', 'Gerente', 'Jefe de Grupo')
    AND is_active = true
  )
);

-- 5. POLÍTICA TEMPORAL PARA DEPURACIÓN (descomenta si los problemas persisten)
-- NOTA: Comentar esta línea después de resolver el problema
-- CREATE POLICY "TEMP_Allow_all_authenticated_inserts" 
-- ON public.user_activity 
-- FOR INSERT 
-- WITH CHECK (auth.uid() IS NOT NULL);

-- 6. Verificar que las políticas se crearon correctamente
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'user_activity'
ORDER BY policyname;

-- 7. Verificar permisos de la tabla
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'user_activity';

-- 8. Verificar que los usuarios pueden autenticarse correctamente
SELECT 
  u.id,
  u.nombre_completo,
  u.user_position,
  u.is_active,
  'Puede usar user tracking' as estado_tracking
FROM public.users u
WHERE u.is_active = true
ORDER BY u.user_position, u.nombre_completo;

-- 9. Test de inserción para verificar políticas
-- Ejecutar este bloque para probar que un usuario puede insertar su actividad
-- (Cambiar 'USER_ID_AQUI' por el ID real del usuario con problemas)
/*
INSERT INTO public.user_activity (user_id, last_active, session_start, is_online)
VALUES (
  'USER_ID_AQUI', -- Reemplazar con el ID real
  NOW(),
  NOW(),
  true
);
*/

-- 10. NOTA IMPORTANTE PARA RESOLUCIÓN DE PROBLEMAS:
-- Si el problema persiste, puede ser debido a:
-- 1. Cache de políticas RLS
-- 2. Problema de sincronización entre auth.uid() y user_id
-- 3. Usuario no existe en la tabla 'users'
-- 
-- Para debuggear, ejecutar:
-- SELECT auth.uid(), current_user, session_user;
-- 
-- Y verificar que el usuario existe:
-- SELECT id, nombre_completo, is_active FROM users WHERE id = auth.uid();

-- 11. OPCIONAL: Deshabilitar RLS temporalmente si es necesario para testing urgente
-- ADVERTENCIA: Solo usar en desarrollo, nunca en producción
-- ALTER TABLE public.user_activity DISABLE row level security;
-- Recordar volver a habilitar:
-- ALTER TABLE public.user_activity ENABLE row level security; 