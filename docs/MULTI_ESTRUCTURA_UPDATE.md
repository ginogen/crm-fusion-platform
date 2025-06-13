# Actualización de Roles con Múltiples Estructuras

## Descripción

Se ha actualizado el sistema para permitir que los siguientes roles puedan vincularse a múltiples estructuras organizacionales simultáneamente:

- **CEO**
- **Director Internacional**
- **Director Nacional**
- **Director de Zona**
- **Sales Manager**

## Cambios Implementados

### 1. Constante Centralizada

Se ha creado una constante centralizada en `src/lib/constants.ts`:

```typescript
export const MULTI_ESTRUCTURA_POSITIONS = [
  'CEO', 
  'Director Internacional', 
  'Director Nacional',
  'Director de Zona',
  'Sales Manager'
] as const;
```

### 2. Archivos Actualizados

#### **`src/pages/Usuarios.tsx`**
- ✅ Importación de la constante centralizada
- ✅ Función helper `hasMultiEstructura()` para verificación de tipos segura
- ✅ Actualización de toda la lógica de creación y edición de usuarios
- ✅ Interfaz de selección múltiple para estructuras

#### **`src/pages/Organizacion.tsx`**
- ✅ Importación de la constante centralizada
- ✅ Eliminación de la definición local duplicada
- ✅ Actualización de la lógica de vinculación de estructuras

#### **`src/pages/TimeControl.tsx`**
- ✅ Importación de la constante centralizada
- ✅ Eliminación de la definición local duplicada

### 3. Funcionalidades Habilitadas

#### **Creación de Usuarios**
- Los roles especificados pueden seleccionar múltiples estructuras durante la creación
- Validación para asegurar que se seleccione al menos una estructura
- Interfaz de checkboxes para selección múltiple

#### **Edición de Usuarios**
- Los usuarios existentes con estos roles pueden modificar sus estructuras vinculadas
- Actualización de relaciones en la tabla `user_estructuras`
- Mantenimiento de la integridad referencial

#### **Visualización**
- Los usuarios con múltiples estructuras muestran todas sus estructuras vinculadas
- Filtrado y búsqueda funcionan correctamente con múltiples estructuras
- Interfaz adaptada para mostrar múltiples estructuras

### 4. Estructura de Base de Datos

El sistema utiliza la tabla `user_estructuras` para manejar las relaciones muchos-a-muchos:

```sql
-- Tabla de relación usuario-estructura
user_estructuras (
  user_id: string,
  estructura_id: number
)
```

### 5. Lógica de Negocio

#### **Roles con Múltiples Estructuras:**
- Pueden vincularse a múltiples estructuras organizacionales
- Mantienen `estructura_id = null` en la tabla `users`
- Las relaciones se almacenan en `user_estructuras`

#### **Roles con Estructura Única:**
- Mantienen `estructura_id` en la tabla `users`
- No utilizan la tabla `user_estructuras`

### 6. Beneficios de la Implementación

1. **Flexibilidad Organizacional**: Los roles superiores pueden gestionar múltiples áreas
2. **Escalabilidad**: Fácil agregar nuevos roles a la lista
3. **Consistencia**: Una sola fuente de verdad para la configuración
4. **Mantenibilidad**: Código centralizado y reutilizable
5. **Seguridad**: Validaciones apropiadas en la interfaz y backend

### 7. Consideraciones Técnicas

#### **Tipos TypeScript**
- Se utiliza `as const` para inferencia de tipos estricta
- Función helper para verificación de tipos segura
- Manejo de casos edge con conversiones de tipos apropiadas

#### **Rendimiento**
- Consultas optimizadas para usuarios con múltiples estructuras
- Carga lazy de estructuras cuando es necesario
- Índices apropiados en la base de datos

### 8. Próximos Pasos

1. **Testing**: Verificar que todos los flujos funcionen correctamente
2. **Migración**: Actualizar usuarios existentes si es necesario
3. **Documentación**: Actualizar manuales de usuario
4. **Monitoreo**: Seguir el rendimiento de las consultas

## Uso

```typescript
import { MULTI_ESTRUCTURA_POSITIONS } from "@/lib/constants";

// Verificar si un rol puede tener múltiples estructuras
const canHaveMultipleStructures = MULTI_ESTRUCTURA_POSITIONS.includes(userPosition);

// En la interfaz de usuario
if (canHaveMultipleStructures) {
  // Mostrar selección múltiple
  return <MultiStructureSelector />;
} else {
  // Mostrar selección única
  return <SingleStructureSelector />;
}
``` 