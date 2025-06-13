import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
  const { data: currentUser, isLoading } = useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { data } = await supabase
        .from("users")
        .select("id, user_position")
        .eq("id", user.id)
        .single();

      return data as UserData;
    },
  });

  // Si está cargando, mostramos null o un componente de carga
  if (isLoading) {
    return null;
  }

  // Si no hay usuario, redirigir a auth
  if (!currentUser) {
    return <Navigate to="/auth" replace />;
  }

  // Si no se requiere una posición específica, permitir acceso
  if (!requiredPosition) {
    return <>{children}</>;
  }

  // Verificar si el usuario tiene la posición requerida
  const hasRequiredPosition = requiredPosition.includes(currentUser.user_position);

  if (!hasRequiredPosition) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}; 