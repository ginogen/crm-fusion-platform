import { supabase } from "@/integrations/supabase/client";
import { USER_ROLES, ROLE_HIERARCHY } from "@/lib/constants";

/**
 * Obtiene todos los subordinados recursivamente según la jerarquía de roles
 * @param userId - ID del usuario actual
 * @param userPosition - Posición/cargo del usuario actual
 * @returns Array de IDs de usuarios subordinados
 */
export const getAllSubordinatesRecursively = async (userId: string, userPosition: string): Promise<string[]> => {
  // Si es CEO, Director Nacional o Internacional, no necesitamos subordinados específicos
  if (
    userPosition === USER_ROLES.CEO ||
    userPosition === USER_ROLES.DIRECTOR_NACIONAL ||
    userPosition === USER_ROLES.DIRECTOR_INTERNACIONAL
  ) {
    return [];
  }

  // Si es Asesor Training, no tiene subordinados
  if (userPosition === USER_ROLES.ASESOR_TRAINING) {
    return [];
  }

  const allSubordinates: string[] = [];
  const processedUsers = new Set<string>();

  const processSubordinates = async (currentUserId: string, currentUserPosition: string) => {
    if (processedUsers.has(currentUserId)) return;
    processedUsers.add(currentUserId);

    // Obtener roles subordinados según la jerarquía
    const hierarchyValue = ROLE_HIERARCHY[currentUserPosition as keyof typeof ROLE_HIERARCHY];
    const subordinateRoles = hierarchyValue === 'ALL' ? [] : (Array.isArray(hierarchyValue) ? [...hierarchyValue] : []);
    
    if (subordinateRoles.length === 0) return;

    // Obtener usuarios subordinados directos
    const { data: directSubordinates } = await supabase
      .from("users")
      .select("id, user_position, estructuras!inner(id)")
      .in("user_position", subordinateRoles)
      .eq("is_active", true);

    if (!directSubordinates) return;

    // Filtrar por estructura si el usuario actual tiene estructura
    const { data: currentUserData } = await supabase
      .from("users")
      .select("estructuras(id)")
      .eq("id", currentUserId)
      .single();

    let filteredSubordinates = directSubordinates;
    
    // Si el usuario actual tiene estructura, filtrar subordinados por la misma estructura
    if (currentUserData?.estructuras?.[0]?.id) {
      filteredSubordinates = directSubordinates.filter(sub => 
        sub.estructuras?.some(est => est.id === currentUserData.estructuras[0].id)
      );
    }

    // Agregar subordinados directos a la lista
    for (const subordinate of filteredSubordinates) {
      if (!allSubordinates.includes(subordinate.id)) {
        allSubordinates.push(subordinate.id);
      }
      
      // Procesar recursivamente los subordinados de este subordinado
      await processSubordinates(subordinate.id, subordinate.user_position);
    }
  };

  await processSubordinates(userId, userPosition);
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
  const allSubordinateIds = await getAllSubordinatesRecursively(currentUser.id, currentUser.user_position);
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