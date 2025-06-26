import { supabase } from "@/integrations/supabase/client";
import { USER_ROLES } from "@/lib/constants";

/**
 * Obtiene todos los subordinados recursivamente según el campo supervisor_id
 * @param userId - ID del usuario actual
 * @returns Array de IDs de usuarios subordinados
 */
export const getAllSubordinatesRecursively = async (userId: string): Promise<string[]> => {
  const allSubordinates: string[] = [];
  const processedSupervisors = new Set<string>();

  const processSubordinates = async (currentSupervisorId: string) => {
    if (processedSupervisors.has(currentSupervisorId)) return;
    processedSupervisors.add(currentSupervisorId);

    // Obtener subordinados directos de este supervisor
    const { data: directSubordinates, error } = await supabase
      .from("users")
      .select("id, supervisor_id")
      .eq("supervisor_id", currentSupervisorId)
      .eq("is_active", true);

    if (error) {
      console.error('Error obteniendo subordinados:', error);
      return;
    }

    if (directSubordinates && directSubordinates.length > 0) {
      for (const subordinate of directSubordinates) {
        if (!allSubordinates.includes(subordinate.id)) {
          allSubordinates.push(subordinate.id);
        }
        // Procesar recursivamente los subordinados de este subordinado
        await processSubordinates(subordinate.id);
      }
    }
  };

  await processSubordinates(userId);
  return allSubordinates;
};

/**
 * Obtiene los IDs de usuarios que un usuario puede ver según su jerarquía
 * @param currentUser - Usuario actual
 * @returns Array de IDs de usuarios que puede ver, o null si puede ver todos
 */
export const getUserIdsForHierarchicalAccess = async (currentUser: any): Promise<string[] | null> => {
  if (!currentUser) return [];

  // Si el usuario es CEO, Director Nacional o Internacional, puede ver todos los usuarios
  if (
    currentUser.user_position === USER_ROLES.CEO ||
    currentUser.user_position === USER_ROLES.DIRECTOR_NACIONAL ||
    currentUser.user_position === USER_ROLES.DIRECTOR_INTERNACIONAL
  ) {
    return null; // null significa "todos los usuarios"
  }

  // Para Asesor Training, solo sus propios leads
  if (currentUser.user_position === USER_ROLES.ASESOR_TRAINING) {
    return [currentUser.id];
  }

  // Para otros roles, obtener subordinados recursivamente
  const allSubordinateIds = await getAllSubordinatesRecursively(currentUser.id);
  return [currentUser.id, ...allSubordinateIds];
};

/**
 * Verifica si un usuario puede ver a otro usuario según la jerarquía
 * @param currentUser - Usuario actual
 * @param targetUserId - ID del usuario objetivo
 * @returns true si puede ver al usuario objetivo
 */
export const canViewUser = async (currentUser: any, targetUserId: string): Promise<boolean> => {
  if (!currentUser) return false;

  // Si es el mismo usuario, siempre puede verse
  if (currentUser.id === targetUserId) return true;

  // Si el usuario es CEO, Director Nacional o Internacional, puede ver a todos
  if (
    currentUser.user_position === USER_ROLES.CEO ||
    currentUser.user_position === USER_ROLES.DIRECTOR_NACIONAL ||
    currentUser.user_position === USER_ROLES.DIRECTOR_INTERNACIONAL
  ) {
    return true;
  }

  // Para Asesor Training, solo puede verse a sí mismo
  if (currentUser.user_position === USER_ROLES.ASESOR_TRAINING) {
    return false;
  }

  // Para otros roles, verificar si el usuario objetivo está en su jerarquía
  const accessibleUserIds = await getUserIdsForHierarchicalAccess(currentUser);
  return accessibleUserIds?.includes(targetUserId) || false;
}; 