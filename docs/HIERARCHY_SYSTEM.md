# Sistema de Jerarquía Recursiva para Leads

## Descripción General

El sistema implementa una lógica de cascada recursiva completa para la visualización de leads según la jerarquía organizacional de usuarios. Esto permite que cada usuario pueda ver no solo sus propios leads, sino también los leads de todos sus subordinados en la cadena jerárquica.

## Jerarquía de Roles

La jerarquía está definida en `src/lib/constants.ts`:

```typescript
export const ROLE_HIERARCHY = {
  [USER_ROLES.ASESOR_TRAINING]: [], // No tiene subordinados
  [USER_ROLES.FULL_EXECUTIVE]: [USER_ROLES.ASESOR_TRAINING],
  [USER_ROLES.TEAM_MANAGER]: [USER_ROLES.FULL_EXECUTIVE, USER_ROLES.ASESOR_TRAINING],
  [USER_ROLES.GERENTE]: [USER_ROLES.TEAM_MANAGER, USER_ROLES.FULL_EXECUTIVE, USER_ROLES.ASESOR_TRAINING],
  [USER_ROLES.GERENTE_DIVISIONAL]: [USER_ROLES.GERENTE, USER_ROLES.TEAM_MANAGER, USER_ROLES.FULL_EXECUTIVE, USER_ROLES.ASESOR_TRAINING],
  [USER_ROLES.SALES_MANAGER]: [USER_ROLES.GERENTE_DIVISIONAL, USER_ROLES.GERENTE, USER_ROLES.TEAM_MANAGER, USER_ROLES.FULL_EXECUTIVE, USER_ROLES.ASESOR_TRAINING],
  [USER_ROLES.DIRECTOR_ZONA]: [USER_ROLES.SALES_MANAGER, USER_ROLES.GERENTE_DIVISIONAL, USER_ROLES.GERENTE, USER_ROLES.TEAM_MANAGER, USER_ROLES.FULL_EXECUTIVE, USER_ROLES.ASESOR_TRAINING],
  [USER_ROLES.DIRECTOR_NACIONAL]: 'ALL', // Ve todos
  [USER_ROLES.DIRECTOR_INTERNACIONAL]: 'ALL', // Ve todos
  [USER_ROLES.CEO]: 'ALL' // Ve todos
}
```

## Funcionalidad Implementada

### 1. Visualización por Defecto ("Mis Leads")
- **Todos los usuarios** ven solo sus propios leads asignados
- Comportamiento más restrictivo y seguro

### 2. Visualización Jerárquica ("Todos los usuarios")

#### Roles con Acceso Total:
- **CEO, Director Nacional, Director Internacional**: Pueden ver TODOS los leads del sistema sin restricciones

#### Roles con Acceso Jerárquico:
- **Asesor Training**: Solo ve sus propios leads (no puede acceder a "Todos los usuarios")
- **Otros roles**: Ven sus propios leads + leads de toda su cadena jerárquica recursiva

### 3. Cascada Recursiva Completa

La nueva implementación permite una cascada completa:

**Ejemplo de cascada para un Gerente:**
```
Gerente
├── Jefe de Grupo
│   ├── Full Executive
│   │   └── Asesor Training
│   └── Asesor Training
├── Full Executive
│   └── Asesor Training
└── Asesor Training
```

**Antes (lógica anterior):** El Gerente solo veía leads de Jefe de Grupo, Full Executive y Asesor Training (nivel directo)

**Ahora (lógica recursiva):** El Gerente ve leads de toda la cadena completa, incluyendo los Asesores Training que están bajo Full Executives y Jefes de Grupo

## Archivos Modificados

### 1. `src/lib/hierarchy-utils.ts` (NUEVO)
Contiene las utilidades centralizadas para manejo de jerarquía:

- `getAllSubordinatesRecursively()`: Obtiene todos los subordinados recursivamente
- `getUserIdsForHierarchicalAccess()`: Obtiene IDs de usuarios accesibles
- `canViewUser()`: Verifica si un usuario puede ver a otro

### 2. `src/components/leads/LeadsTable.tsx`
- Actualizada la lógica de filtrado para usar la función recursiva
- Aplicada la misma lógica en `leadsSummary` y `selectAllFilteredLeads`

### 3. `src/pages/Usuarios.tsx`
- Actualizada para usar las utilidades centralizadas
- Eliminada la función duplicada `getSubordinados`

## Filtros por Estructura

El sistema mantiene la restricción por estructura organizacional:
- Los usuarios solo ven subordinados que pertenecen a la misma estructura
- Esto asegura que la jerarquía funcione dentro de los límites organizacionales

## Beneficios de la Implementación

1. **Cascada Completa**: Los usuarios pueden ver leads de toda su cadena jerárquica
2. **Centralización**: Las utilidades están centralizadas y reutilizables
3. **Consistencia**: Misma lógica aplicada en todos los componentes
4. **Escalabilidad**: Fácil de mantener y extender
5. **Seguridad**: Mantiene las restricciones por estructura y roles

## Uso

```typescript
import { getAllSubordinatesRecursively } from "@/lib/hierarchy-utils";

// Obtener todos los subordinados de un usuario
const subordinateIds = await getAllSubordinatesRecursively(userId, userPosition);

// Aplicar filtro en consulta de leads
const baseQuery = supabase
  .from("leads")
  .in('asignado_a', [currentUser.id, ...subordinateIds]);
```

## Consideraciones de Rendimiento

- La función recursiva se ejecuta solo cuando es necesario
- Se implementa un Set para evitar procesamiento duplicado
- Las consultas están optimizadas para minimizar llamadas a la base de datos 