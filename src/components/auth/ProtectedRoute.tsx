import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../lib/hooks/useAuth'; // Asumiendo que tienes un hook de autenticación

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}; 