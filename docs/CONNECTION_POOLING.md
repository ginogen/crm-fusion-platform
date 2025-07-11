# Configuración del Transaction Pooler de Supabase

## Visión General

El **Transaction Pooler** de Supabase permite optimizar las conexiones a la base de datos, especialmente útil para aplicaciones serverless y con muchas conexiones concurrentes.

## Configuración Actual

### Variables de Entorno

```env
VITE_SUPABASE_URL=https://[project-ref].supabase.co
VITE_SUPABASE_ANON_KEY=[anon-key]
VITE_SUPABASE_SERVICE_ROLE_KEY=[service-role-key]
VITE_SUPABASE_POOLER_URL=postgres://postgres:[password]@db.[project-ref].supabase.co:6543/postgres
```

### Configuración por Componente

#### Frontend (React)
- **Usa**: Transaction Pooler (puerto 6543)
- **Ubicación**: `src/integrations/supabase/client.ts`
- **Optimizado para**: Conexiones transitorias, múltiples usuarios

#### Backend API (Vercel Functions)
- **Usa**: Conexión directa para admin + Pooler para auth
- **Ubicación**: `api/admin/users.js`
- **Optimizado para**: Operaciones administrativas y verificaciones de auth

#### Cliente Administrativo
- **Usa**: Conexión directa
- **Ubicación**: `src/integrations/supabase/admin-client.ts`
- **Optimizado para**: Operaciones privilegiadas del frontend

## Beneficios del Transaction Pooler

### 1. **Mejor Rendimiento**
- Reduce la latencia de conexión
- Reutiliza conexiones existentes
- Maneja picos de tráfico eficientemente

### 2. **Escalabilidad**
- Permite más conexiones concurrentes
- Optimiza el uso de recursos de la base de datos
- Ideal para aplicaciones serverless

### 3. **Gestión Automática**
- Balanceo automático de carga
- Gestión de conexiones inactivas
- Recuperación automática de errores

## Configuraciones Específicas

### Transaction Mode (Puerto 6543)
```javascript
// Ideal para: Frontend, conexiones cortas
const supabase = createClient(poolerUrl, anonKey, {
  global: {
    headers: {
      'X-Connection-Type': 'pooler',
    },
  },
});
```

### Direct Connection (Puerto 5432)
```javascript
// Ideal para: Operaciones administrativas, conexiones largas
const supabase = createClient(directUrl, serviceRoleKey, {
  global: {
    headers: {
      'X-Connection-Type': 'direct',
    },
  },
});
```

## Mejores Prácticas

### ✅ Usar Transaction Pooler Para:
- Aplicaciones frontend (React, Vue, etc.)
- Funciones serverless
- Aplicaciones con muchos usuarios concurrentes
- Consultas cortas y rápidas

### ✅ Usar Conexión Directa Para:
- Operaciones administrativas
- Migraciones de base de datos
- Conexiones de larga duración
- Operaciones que requieren privilegios especiales

### ⚠️ Consideraciones

#### Transaction Pooler NO soporta:
- Prepared statements (se desactivan automáticamente)
- Transacciones largas
- Conexiones con estado persistente

#### Configuración Recomendada:
```javascript
// Optimizado para pooler
const config = {
  realtime: {
    heartbeatIntervalMs: 30000,
    reconnectAfterMs: (tries) => Math.min(tries * 1000, 10000),
  },
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
};
```

## Monitoreo y Debugging

### Headers de Identificación
Cada cliente incluye headers para identificar el tipo de conexión:

```javascript
'X-Client-Info': 'crm-fusion-frontend@1.0.0',
'X-Connection-Type': 'pooler' | 'direct'
```

### Logs de Configuración
Los clientes logean su configuración al inicializar:

```
🔧 Supabase configurado: { url: 'Transaction Pooler', pooler: true }
🔧 Supabase Admin configurado con conexión directa
🔧 API Server configurado: { admin: 'Direct Connection', auth: 'Transaction Pooler' }
```

## Configuración en Vercel

### Variables de Entorno
Asegúrate de configurar todas las variables en Vercel:

```bash
# Vercel CLI
vercel env add VITE_SUPABASE_POOLER_URL

# Dashboard de Vercel
# Project Settings > Environment Variables
```

### Configuración de Funciones
```json
{
  "functions": {
    "api/admin/users.js": {
      "maxDuration": 30
    }
  }
}
```

## Troubleshooting

### Error: "Max client connections reached"
- El pooler tiene límites de conexiones concurrentes
- Solución: Optimizar consultas, usar connection pooling en el cliente

### Error: "Connection timeout"
- Puede ser debido a latencia de red
- Solución: Aumentar timeouts, usar retry logic

### Error: "Prepared statement not supported"
- Transaction pooler no soporta prepared statements
- Solución: Desactivar prepared statements en el ORM

## Monitoreo

### Métricas Importantes
- Número de conexiones activas
- Tiempo de respuesta de consultas
- Errores de conexión
- Uso de CPU/memoria del pooler

### Logs de Supabase
- Dashboard > Pooler Logs
- Monitoreo de errores de conexión
- Análisis de rendimiento

## Próximos Pasos

1. **Monitorear el rendimiento** después de implementar
2. **Ajustar configuraciones** según el uso real
3. **Considerar dedicated pooler** para mayor rendimiento
4. **Implementar métricas** de monitoreo personalizadas 