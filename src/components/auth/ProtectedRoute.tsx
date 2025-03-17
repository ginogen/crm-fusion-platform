import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type JerarquiaPosicion = typeof JERARQUIA_POSICIONES[number];

interface UserData {
  id: string;
  user_position: JerarquiaPosicion;
  // ... otros campos necesarios
}

const JERARQUIA_POSICIONES = [
  'CEO',
  'Director Internacional',
  'Director Nacional',
  'Director de Zona',
  'Sales Manager',
  'Gerente Divisional',
  'Gerente',
  'Team Manager',
  'Full Executive',
  'Asesor Training'
] as const;

const RESTRICTED_POSITIONS = {
  ASESOR_TRAINING: 'Asesor Training'
} as const;

const getNivelJerarquico = (position: JerarquiaPosicion) => {
  return JERARQUIA_POSICIONES.indexOf(position);
};

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPosition?: JerarquiaPosicion[];
}

export const ProtectedRoute = ({ children, requiredPosition }: ProtectedRouteProps) => {
  const { data: currentUser, isLoading } = useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { data } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      return data as UserData;
    },
  });

  // Si está cargando, mostramos null o un componente de carga
  if (isLoading) {
    return null; // o return <LoadingSpinner />
  }

  // Si no hay usuario, redirigir a auth
  if (!currentUser) {
    return <Navigate to="/auth" replace />;
  }

  const hasRequiredPosition = !requiredPosition || 
    (currentUser?.user_position && (
      requiredPosition.includes(currentUser.user_position) ||
      getNivelJerarquico(currentUser.user_position) < getNivelJerarquico(RESTRICTED_POSITIONS.ASESOR_TRAINING)
    ));

  if (!hasRequiredPosition) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}; 