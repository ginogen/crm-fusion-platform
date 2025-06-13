-- =====================================================
-- MIGRACIÓN: Actualizar jerarquía de estructuras
-- Solo cambio: "Filiales" → "Zonas"
-- =====================================================

-- Verificar datos existentes antes de la migración
SELECT 'ANTES DE LA MIGRACIÓN - Conteo por tipo:' as info;
SELECT estructura_tipo, COUNT(*) as cantidad 
FROM estructuras 
GROUP BY estructura_tipo 
ORDER BY estructura_tipo;

-- Verificar permisos existentes
SELECT 'PERMISOS ANTES - Conteo por tipo:' as info;
SELECT estructura_tipo, COUNT(*) as cantidad 
FROM estructura_permisos 
GROUP BY estructura_tipo 
ORDER BY estructura_tipo;

-- =====================================================
-- PASO 1: Actualizar ENUM estructura_tipo
-- =====================================================

-- Agregar el nuevo valor "Zonas"
ALTER TYPE estructura_tipo ADD VALUE 'Zonas';

-- =====================================================
-- PASO 2: Actualizar datos existentes
-- =====================================================

-- Actualizar tabla estructuras: Filiales → Zonas
UPDATE estructuras 
SET estructura_tipo = 'Zonas' 
WHERE estructura_tipo = 'Filiales';

-- Actualizar tabla estructura_permisos: Filiales → Zonas  
UPDATE estructura_permisos 
SET estructura_tipo = 'Zonas' 
WHERE estructura_tipo = 'Filiales';

-- =====================================================
-- PASO 3: Eliminar valor antiguo del ENUM
-- =====================================================

-- Verificar que no queden registros con "Filiales"
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM estructuras WHERE estructura_tipo = 'Filiales') THEN
        RAISE EXCEPTION 'Aún existen registros con estructura_tipo = Filiales en tabla estructuras';
    END IF;
    
    IF EXISTS (SELECT 1 FROM estructura_permisos WHERE estructura_tipo = 'Filiales') THEN
        RAISE EXCEPTION 'Aún existen registros con estructura_tipo = Filiales en tabla estructura_permisos';
    END IF;
    
    RAISE NOTICE 'Verificación exitosa: No quedan registros con "Filiales"';
END $$;

-- Recrear el ENUM sin "Filiales"
ALTER TYPE estructura_tipo RENAME TO estructura_tipo_old;

CREATE TYPE estructura_tipo AS ENUM (
    'Empresa',
    'Paises', 
    'Zonas',
    'Filial',
    'División',
    'Organizaciones',
    'Jefaturas',
    'Sub Organización'
);

-- Actualizar columnas para usar el nuevo ENUM
ALTER TABLE estructuras 
ALTER COLUMN estructura_tipo TYPE estructura_tipo 
USING estructura_tipo::text::estructura_tipo;

ALTER TABLE estructura_permisos 
ALTER COLUMN estructura_tipo TYPE estructura_tipo 
USING estructura_tipo::text::estructura_tipo;

-- Eliminar el ENUM antiguo
DROP TYPE estructura_tipo_old;

-- =====================================================
-- PASO 4: Verificación final
-- =====================================================

SELECT 'DESPUÉS DE LA MIGRACIÓN - Conteo por tipo:' as info;
SELECT estructura_tipo, COUNT(*) as cantidad 
FROM estructuras 
GROUP BY estructura_tipo 
ORDER BY estructura_tipo;

SELECT 'PERMISOS DESPUÉS - Conteo por tipo:' as info;
SELECT estructura_tipo, COUNT(*) as cantidad 
FROM estructura_permisos 
GROUP BY estructura_tipo 
ORDER BY estructura_tipo;

-- Verificar que el ENUM tiene los valores correctos
SELECT 'VALORES DEL ENUM estructura_tipo:' as info;
SELECT unnest(enum_range(NULL::estructura_tipo)) as valores_enum;

SELECT 'MIGRACIÓN COMPLETADA EXITOSAMENTE ✅' as resultado; 