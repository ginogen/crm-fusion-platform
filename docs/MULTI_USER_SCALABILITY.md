# Configuraciones para Múltiples Usuarios Simultáneos (80+)

## 🎯 Objetivo
Optimizar la aplicación para soportar más de 80 usuarios simultáneos sin degradación de rendimiento.

## 🔧 Configuraciones Actuales (Ya Implementadas)

### 1. **Cliente Supabase Optimizado**
- ✅ Connection pooling configurado en `src/integrations/supabase/client.ts`
- ✅ Reconexión automática con backoff exponencial
- ✅ Heartbeat cada 30 segundos para realtime
- ✅ Timeout de sesión de 15 minutos
- ✅ Manejo de errores de conexión

### 2. **QueryClient Optimizado**
- ✅ Cache de 5 minutos (staleTime)
- ✅ Garbage collection de 10 minutos
- ✅ Reintentos inteligentes con backoff exponencial
- ✅ Modo offline-first

### 3. **Contexto de Usuario Optimizado**
- ✅ Heartbeat cada 5 minutos (reducido de 2 minutos)
- ✅ Throttling de actividad cada 30 segundos
- ✅ Timeouts de 30 segundos en producción
- ✅ Solo 1 reintento en lugar de 3

## 🚀 Configuraciones Adicionales Necesarias

### 1. **Supabase Database**

#### Connection Pooling
```sql
-- Configurar en el dashboard de Supabase > Settings > Database
-- Pool Size: 25-30 conexiones (por defecto es 15)
-- Pool Mode: Transaction (recomendado para alta concurrencia)
-- Pool Timeout: 30 segundos
```

#### Configuración de Variables
```env
# En Supabase Dashboard > Settings > API
SUPABASE_DB_POOL_SIZE=30
SUPABASE_DB_POOL_TIMEOUT=30000
SUPABASE_DB_POOL_MODE=transaction
```

### 2. **Vercel Functions**

#### Configuración de Timeouts
```json
{
  "functions": {
    "api/admin/users.js": {
      "maxDuration": 60
    },
    "api/webhook/[token].js": {
      "maxDuration": 30
    }
  }
}
```

#### Variables de Entorno Adicionales
```env
# Timeouts para funciones serverless
VERCEL_TIMEOUT=60000
VERCEL_MAX_REQUEST_SIZE=5mb
```

### 3. **Optimizaciones de Base de Datos**

#### Índices Recomendados
```sql
-- Índices para mejorar rendimiento con muchos usuarios
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_online ON user_activity(is_online, last_activity);
CREATE INDEX IF NOT EXISTS idx_user_time_records_user_id ON user_time_records(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
```

#### Configuración de RLS Optimizada
```sql
-- Política optimizada para user_activity
DROP POLICY IF EXISTS "All authenticated users can insert their activity" ON user_activity;
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
```

### 4. **Optimizaciones de Frontend**

#### QueryClient Mejorado
```typescript
// Configuración más agresiva para múltiples usuarios
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000, // 10 minutos
      gcTime: 30 * 60 * 1000, // 30 minutos
      retry: 2, // Máximo 2 reintentos
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
      networkMode: 'offlineFirst',
      refetchOnWindowFocus: false, // Evitar refetch innecesario
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
      retryDelay: 2000,
    },
  },
});
```

#### Debouncing y Throttling
```typescript
// Para acciones frecuentes como búsquedas
const debouncedSearch = useMemo(
  () => debounce((searchTerm: string) => {
    // Lógica de búsqueda
  }, 300),
  []
);

// Para tracking de actividad
const throttledActivity = useMemo(
  () => throttle((activity: string) => {
    // Actualizar actividad
  }, 60000), // 1 minuto
  []
);
```

### 5. **Monitoreo y Observabilidad**

#### Configuración de Logging
```typescript
// Configuración de logs para producción
const logger = {
  error: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'production') {
      // Enviar a servicio de logging (Sentry, LogRocket, etc.)
      console.error(message, data);
    }
  },
  warn: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'production') {
      console.warn(message, data);
    }
  },
  info: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(message, data);
    }
  }
};
```

#### Métricas de Rendimiento
```typescript
// Tracking de rendimiento
const performanceMonitor = {
  trackUserAction: (action: string, duration: number) => {
    if (duration > 1000) {
      logger.warn(`Acción lenta detectada: ${action} - ${duration}ms`);
    }
  },
  trackDatabaseQuery: (query: string, duration: number) => {
    if (duration > 2000) {
      logger.warn(`Query lenta detectada: ${query} - ${duration}ms`);
    }
  }
};
```

### 6. **Configuración de CDN y Caching**

#### Headers de Cache
```javascript
// En vercel.json
{
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=0, must-revalidate"
        }
      ]
    }
  ]
}
```

## 🎯 Límites y Consideraciones

### Plan Pro de Supabase
- **Conexiones simultáneas**: 200 (suficiente para 80+ usuarios)
- **Realtime connections**: 500 (suficiente)
- **Database size**: 8GB (monitorearleto)
- **Bandwidth**: 250GB/mes (monitorear)

### Plan Pro de Vercel
- **Function executions**: 1M/mes (suficiente)
- **Function duration**: 60 segundos (configurado)
- **Bandwidth**: 1TB/mes (suficiente)
- **Edge requests**: 10M/mes (suficiente)

## 📊 Métricas a Monitorear

### Supabase
- Connection pool usage
- Query performance
- Database size
- Realtime connections

### Vercel
- Function execution time
- Function memory usage
- Error rates
- Response times

### Frontend
- Bundle size
- Core Web Vitals
- User session duration
- API response times

## 🔄 Proceso de Implementación

### Fase 1: Configuración de Base de Datos
1. Configurar connection pooling en Supabase
2. Crear índices optimizados
3. Actualizar políticas RLS

### Fase 2: Optimización de Frontend
1. Actualizar QueryClient con configuración agresiva
2. Implementar debouncing/throttling
3. Optimizar componentes con React.memo

### Fase 3: Configuración de Vercel
1. Configurar timeouts de funciones
2. Implementar headers de cache
3. Configurar variables de entorno

### Fase 4: Monitoreo
1. Implementar logging estructurado
2. Configurar alertas de rendimiento
3. Establecer métricas de baseline

## 🚨 Alertas y Umbrales

### Supabase
- **Pool utilization > 80%**: Investigar consultas lentas
- **Query time > 2 segundos**: Optimizar consultas
- **Error rate > 5%**: Revisar políticas RLS

### Vercel
- **Function duration > 45 segundos**: Optimizar función
- **Memory usage > 90%**: Revisar uso de memoria
- **Error rate > 3%**: Revisar logs de errores

### Frontend
- **Bundle size > 2MB**: Optimizar imports
- **LCP > 2.5 segundos**: Optimizar carga inicial
- **FID > 100ms**: Optimizar interacciones

## 🎉 Beneficios Esperados

- **Soporte para 80+ usuarios simultáneos**
- **Tiempo de respuesta < 2 segundos**
- **Disponibilidad > 99%**
- **Experiencia de usuario consistente**
- **Escalabilidad horizontal** 