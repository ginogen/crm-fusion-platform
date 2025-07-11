import { Navigate } from 'react-router-dom';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { useAuthStatus } from '@/hooks/useAuthStatus';

type JerarquiaPosicion = typeof JERARQUIA_POSICIONES[number];

interface UserData {
  id: string;
  user_position: JerarquiaPosicion;
}

const JERARQUIA_POSICIONES = [
  'CEO',
  'Director Internacional',
  'Director Nacional',
  'Director de Zona',
  'Sales Manager',
  'Gerente Divisional',
  'Gerente',
  'Jefe de Grupo',
  'Full Executive',
  'Asesor Training'
] as const;

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPosition?: string[];
}

export const ProtectedRoute = ({ children, requiredPosition }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading, user, error } = useAuthStatus();

  console.log('🔍 ProtectedRoute: Estado de autenticación:', { isAuthenticated, isLoading, userId: user?.id });

  // Si está cargando, mostrar pantalla de carga
  if (isLoading) {
    console.log('⏳ ProtectedRoute: Cargando...');
    return <LoadingScreen message="Verificando acceso..." />;
  }

  // Si hay error, mostrar pantalla de error
  if (error) {
    console.error('❌ ProtectedRoute: Error:', error);
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4 p-8 bg-white rounded-lg shadow-lg max-w-md">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800">Error de Conexión</h2>
          <p className="text-gray-600">
            {error}
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Recargar Página
          </button>
        </div>
      </div>
    );
  }

  // Si no hay usuario autenticado, redirigir a auth
  if (!isAuthenticated || !user) {
    console.log('🔄 ProtectedRoute: Redirigiendo a auth...');
    return <Navigate to="/auth" replace />;
  }

  // Si no se requiere una posición específica, permitir acceso
  if (!requiredPosition) {
    console.log('✅ ProtectedRoute: Acceso permitido');
    return <>{children}</>;
  }

  // Verificar si el usuario tiene la posición requerida
  const hasRequiredPosition = requiredPosition.includes(user.user_position);

  if (!hasRequiredPosition) {
    console.log('❌ ProtectedRoute: Posición no autorizada:', user.user_position);
    return <Navigate to="/" replace />;
  }

  console.log('✅ ProtectedRoute: Acceso autorizado');
  return <>{children}</>;
}; 